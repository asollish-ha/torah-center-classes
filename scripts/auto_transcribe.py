#!/usr/bin/env python3
"""Local, unattended transcription watcher.

Runs on this Mac (not on Render) because it drives the MacWhisper desktop
app's CLI, which only exists here. On each run it:

  1. Fetches the live class list from the deployed API.
  2. Finds audio-having classes with no transcript fixture yet in
     backend/app/data/transcripts/ (that directory is the single source of
     truth for "already done" — both this script and any manual batch work
     check/write the same files, so they never duplicate effort).
  3. Transcribes up to --max-per-run of them (newest published first, so a
     brand-new upload gets picked up promptly instead of waiting behind a
     backlog of older classes), via:
       download audio (backend's /api/stream/soundcloud/{id} redirect)
       -> mw transcribe --persist (MacWhisper CLI)
       -> pull the transcript lines back out of MacWhisper's own SQLite db
       -> convert to this project's {class_id, segments:[...]} JSON fixture
  4. Runs the same hallucination heuristics used for manual batches earlier
     this project (subscribe/spam-keyword scan, runaway-duplicate-line scan)
     and flags (but does not block on) anything suspicious in the log and in
     needs_review.txt, since this runs unattended and nothing should silently
     halt a whole batch over one bad file.
  5. Commits the new fixtures to git. Does NOT push by default — pushing
     redeploys the live site, and every batch so far in this project has had
     a manual spot-check before shipping; add --push once you're comfortable
     skipping that (see README note added alongside this script).

Intended to run on a schedule via a macOS LaunchAgent (see
scripts/com.torahcenter.autotranscribe.plist) while this Mac is on/awake —
MacWhisper and this script simply won't run at all while the Mac is asleep
or off, and will resume on the next scheduled tick after it wakes.
"""
from __future__ import annotations

import argparse
import json
import logging
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TRANSCRIPTS_DIR = REPO_ROOT / "backend" / "app" / "data" / "transcripts"
LOG_DIR = REPO_ROOT / "logs"
LOCK_FILE = REPO_ROOT / "logs" / "auto_transcribe.lock"
NEEDS_REVIEW_FILE = REPO_ROOT / "logs" / "needs_review.txt"

API_BASE_DEFAULT = "https://torah-center-classes-api.onrender.com/api"
MW_BIN_DEFAULT = "/Applications/MacWhisper.app/Contents/MacOS/mw"
MACWHISPER_DB = Path.home() / "Library/Application Support/MacWhisper/Database/main.sqlite"

SUSPECT_KEYWORDS = [
    "subscribe", "thanks for watching", "like and subscribe",
    "[music]", "[applause]", "translated by", "www.", ".com",
]

log = logging.getLogger("auto_transcribe")


def _setup_logging() -> None:
    LOG_DIR.mkdir(exist_ok=True)
    handler = logging.FileHandler(LOG_DIR / "auto_transcribe.log")
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    stream = logging.StreamHandler(sys.stdout)
    stream.setFormatter(logging.Formatter("%(message)s"))
    logging.basicConfig(level=logging.INFO, handlers=[handler, stream])


def fetch_classes(api_base: str) -> list[dict]:
    with urllib.request.urlopen(f"{api_base}/classes", timeout=30) as resp:
        return json.load(resp)["classes"]


def find_candidates(classes: list[dict]) -> list[dict]:
    candidates = []
    for c in classes:
        if "audio" not in c.get("types", []):
            continue
        if (TRANSCRIPTS_DIR / f"{c['id']}.json").exists():
            continue
        audio_source = next((s for s in c["sources"] if s["type"] == "audio"), None)
        if audio_source is None:
            continue
        candidates.append({"class_id": c["id"], "title": c["title"],
                            "published_at": c["published_at"], "track_id": audio_source["id"]})
    candidates.sort(key=lambda c: c["published_at"], reverse=True)
    return candidates


def download_audio(api_base: str, track_id: str, dest: Path) -> None:
    # urlretrieve follows the backend's 302 to the signed SoundCloud CDN URL
    # itself, same as `curl -L` in the manual batches earlier this project.
    urllib.request.urlretrieve(f"{api_base}/stream/soundcloud/{track_id}", dest)


def transcribe(mw_bin: str, audio_path: Path) -> None:
    subprocess.run([mw_bin, "transcribe", str(audio_path), "--persist"], check=True)


def latest_session_id(class_id: str) -> bytes | None:
    conn = sqlite3.connect(MACWHISPER_DB)
    try:
        row = conn.execute(
            "SELECT id FROM session WHERE originalFilename = ? ORDER BY dateCreated DESC LIMIT 1",
            (class_id,),
        ).fetchone()
        return row[0] if row else None
    finally:
        conn.close()


def extract_segments(session_id: bytes) -> list[dict]:
    conn = sqlite3.connect(MACWHISPER_DB)
    try:
        rows = conn.execute(
            "SELECT start, end, text FROM transcriptline WHERE sessionId = ? ORDER BY orderIndex ASC",
            (session_id,),
        ).fetchall()
    finally:
        conn.close()
    return [{"start": round(r[0] / 1000.0, 2), "end": round(r[1] / 1000.0, 2), "text": r[2].strip()} for r in rows]


def quality_flags(segments: list[dict]) -> list[str]:
    flags = []
    text_blob = " ".join(s["text"].lower() for s in segments)
    hits = [kw for kw in SUSPECT_KEYWORDS if kw in text_blob]
    if hits:
        flags.append(f"suspect keywords found: {hits}")
    dup_runs = sum(
        1 for i in range(1, len(segments))
        if segments[i]["text"].strip() and segments[i]["text"].strip() == segments[i - 1]["text"].strip()
    )
    if segments and dup_runs / len(segments) > 0.05:
        flags.append(f"{dup_runs}/{len(segments)} consecutive duplicate lines (>5%) — possible loop artifact")
    if not segments:
        flags.append("zero segments extracted")
    return flags


def process_one(api_base: str, mw_bin: str, candidate: dict) -> bool:
    class_id = candidate["class_id"]
    log.info("Processing %s: %s", class_id, candidate["title"])
    with tempfile.TemporaryDirectory() as tmp:
        audio_path = Path(tmp) / f"{class_id}.mp3"
        try:
            download_audio(api_base, candidate["track_id"], audio_path)
        except Exception:
            log.exception("Download failed for %s", class_id)
            return False
        try:
            transcribe(mw_bin, audio_path)
        except Exception:
            log.exception("MacWhisper transcription failed for %s", class_id)
            return False
    session_id = latest_session_id(class_id)
    if session_id is None:
        log.error("No MacWhisper session found for %s after transcribing", class_id)
        return False
    segments = extract_segments(session_id)
    flags = quality_flags(segments)
    if flags:
        log.warning("Quality flags for %s: %s", class_id, flags)
        NEEDS_REVIEW_FILE.parent.mkdir(exist_ok=True)
        with NEEDS_REVIEW_FILE.open("a") as f:
            f.write(f"{datetime.now(timezone.utc).isoformat()} {class_id}: {flags}\n")
    TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = TRANSCRIPTS_DIR / f"{class_id}.json"
    out_path.write_text(json.dumps({"class_id": class_id, "segments": segments}, ensure_ascii=False, indent=2))
    log.info("Wrote %s (%d segments)", out_path, len(segments))
    return True


def git_commit(class_ids: list[str], push: bool) -> None:
    if not class_ids:
        return
    rel_paths = [str((TRANSCRIPTS_DIR / f"{cid}.json").relative_to(REPO_ROOT)) for cid in class_ids]
    subprocess.run(["git", "add", *rel_paths], cwd=REPO_ROOT, check=True)
    message = (
        f"Auto-transcribe {len(class_ids)} newly uploaded audio class"
        f"{'es' if len(class_ids) != 1 else ''}\n\n"
        + "\n".join(f"- {cid}" for cid in class_ids)
        + "\n\nGenerated unattended by scripts/auto_transcribe.py via MacWhisper.\n"
        "Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
    )
    subprocess.run(["git", "commit", "-m", message], cwd=REPO_ROOT, check=True)
    log.info("Committed %d new transcript(s).", len(class_ids))
    if push:
        subprocess.run(["git", "push", "origin", "main"], cwd=REPO_ROOT, check=True)
        log.info("Pushed to origin/main.")
    else:
        log.info("Not pushing (pass --push to auto-deploy). Review and push manually when ready.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-per-run", type=int, default=5)
    parser.add_argument("--api-base", default=API_BASE_DEFAULT)
    parser.add_argument("--mw-bin", default=MW_BIN_DEFAULT)
    parser.add_argument("--push", action="store_true", help="git push origin main after committing")
    parser.add_argument("--dry-run", action="store_true", help="log what would be transcribed, do nothing else")
    args = parser.parse_args()

    _setup_logging()

    if LOCK_FILE.exists():
        log.warning("Lock file %s exists — a previous run may still be in progress. Exiting.", LOCK_FILE)
        sys.exit(1)
    LOCK_FILE.parent.mkdir(exist_ok=True)
    LOCK_FILE.write_text(str(datetime.now(timezone.utc)))

    try:
        if shutil.which(args.mw_bin) is None and not Path(args.mw_bin).exists():
            log.error("MacWhisper CLI not found at %s", args.mw_bin)
            sys.exit(1)

        log.info("=== auto_transcribe run starting ===")
        classes = fetch_classes(args.api_base)
        candidates = find_candidates(classes)
        log.info("%d audio classes still need transcripts; processing up to %d.", len(candidates), args.max_per_run)

        if args.dry_run:
            for c in candidates[: args.max_per_run]:
                log.info("[dry-run] would transcribe %s: %s (%s)", c["class_id"], c["title"], c["published_at"])
            return

        done: list[str] = []
        for candidate in candidates[: args.max_per_run]:
            if process_one(args.api_base, args.mw_bin, candidate):
                done.append(candidate["class_id"])

        git_commit(done, push=args.push)
        log.info("=== auto_transcribe run finished: %d/%d succeeded ===", len(done), min(len(candidates), args.max_per_run))
    finally:
        LOCK_FILE.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
