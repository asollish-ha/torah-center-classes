import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import MobileHeader from "./components/MobileHeader";
import BottomTabBar from "./components/BottomTabBar";
import SearchBar from "./components/SearchBar";
import PlaylistsRow from "./components/PlaylistsRow";
import TypeToggle from "./components/TypeToggle";
import TopicsDropdown from "./components/TopicsDropdown";
import ClassList from "./components/ClassList";
import ClassDetail from "./components/ClassDetail";
import VideoPlayer from "./components/VideoPlayer";
import MiniPlayer from "./components/MiniPlayer";
import NowPlaying from "./components/NowPlaying";
import ShareSheet from "./components/ShareSheet";
import Toast from "./components/Toast";
import MoodPicker from "./components/MoodPicker";
import { SparkleIcon, CloseIcon } from "./components/icons";
import { fetchClasses, soundcloudStreamUrl } from "./lib/api";
import {
  loadSavedIds,
  saveSavedIds,
  loadProgress,
  saveProgress,
  clearProgress,
  loadAudioRate,
  saveAudioRate,
} from "./lib/storage";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState(() => loadSavedIds());

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [seriesFilter, setSeriesFilter] = useState("Topics");
  const [moodFilter, setMoodFilter] = useState(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  const [screen, setScreen] = useState("browse"); // browse | detail | video
  const [selectedId, setSelectedId] = useState(null);
  const [showAudioFull, setShowAudioFull] = useState(false);
  const [audio, setAudio] = useState({ classId: null, playing: false, currentTime: 0, duration: 0 });
  // A native <audio> element's playbackRate (rather than a SoundCloud embed
  // widget, which has no playback-rate API) is what makes speed control
  // possible at all — see the audioElRef effect below. Global listening
  // preference, not per-class, so it persists as-is across tracks.
  const [audioRate, setAudioRate] = useState(() => loadAudioRate());
  const [shareItem, setShareItem] = useState(null);
  const [toast, setToast] = useState(null);

  const audioElRef = useRef(null);
  // Mirrors audio.currentTime/duration outside React state so the widget-
  // attach effect's cleanup (and other event bindings) can always read the
  // latest position — state set via setAudio inside a closure created on an
  // earlier render would be stale by the time cleanup runs.
  const audioProgressRef = useRef({ currentTime: 0, duration: 0 });
  // Tracks the position at which progress was last written to localStorage,
  // so a hard tab close/reload (which skips effect cleanup) doesn't lose
  // more than a few seconds — see the throttled write in PLAY_PROGRESS.
  const audioLastPersistRef = useRef(0);

  useEffect(() => {
    fetchClasses()
      .then((data) => {
        // The upstream feed occasionally contains duplicate entries for the
        // same class (same id repeated 2-3x). Duplicate React keys corrupt
        // list reconciliation — filtered-out rows can get "orphaned" and
        // stick around on screen. De-dupe by id defensively so the UI is
        // correct even if the feed still has repeats.
        const seen = new Set();
        const classes = data.classes.filter((c) => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
        setFeed({ ...data, classes });
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => saveSavedIds(savedIds), [savedIds]);

  // Scroll to the top whenever the visible screen changes (browse -> detail ->
  // video, or switching tabs) so navigating never leaves the user stranded
  // wherever the previous screen happened to be scrolled.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [screen, selectedId, activeTab]);

  const playlists = useMemo(() => {
    if (!feed) return [];
    const bySeries = new Map();
    for (const c of feed.classes) {
      for (const s of c.series) {
        if (!bySeries.has(s)) {
          bySeries.set(s, { name: s, count: 0, mostRecent: c.published_at, thumbnail: c.thumbnail });
        }
        const entry = bySeries.get(s);
        entry.count += 1;
        // Use the thumbnail of the most recently published class in the
        // series as the playlist's cover image, so cards show real artwork
        // instead of a generic gradient wherever the feed provides one.
        if (c.published_at > entry.mostRecent) {
          entry.mostRecent = c.published_at;
          entry.thumbnail = c.thumbnail;
        }
      }
    }
    return [...bySeries.values()].sort((a, b) => (a.mostRecent < b.mostRecent ? 1 : -1));
  }, [feed]);

  // The curated Topics taxonomy (Parsha, Halacha, ...) rides along on the
  // feed itself — see services/topics.py — rather than being derived from
  // series names client-side, so it always reflects the same taxonomy the
  // backend tagged classes against.
  const topicCategories = feed?.topics || [];

  const filteredClasses = useMemo(() => {
    if (!feed) return [];
    let classes = feed.classes;

    if (activeTab === "saved") {
      classes = classes.filter((c) => savedIds.has(c.id));
    }
    if (typeFilter !== "all") {
      // A class can offer both formats (video + audio), and both are now
      // independently playable (see ClassDetail's Watch/Listen buttons), so
      // it should show up under both tabs rather than only "Video".
      classes = classes.filter((c) => c.types.includes(typeFilter));
    }
    if (seriesFilter !== "Topics") {
      // seriesFilter can be either an exact series name (from a featured
      // playlist card) or a curated topic tag (from the dropdown, e.g.
      // "Parsha" or "Halacha" — see services/topics.py) — a class matches
      // if either kind of value applies to it.
      classes = classes.filter(
        (c) => c.series.includes(seriesFilter) || c.topics.includes(seriesFilter)
      );
    }
    if (searchQuery.trim()) {
      const needle = searchQuery.trim().toLowerCase();
      classes = classes.filter(
        (c) =>
          c.title.toLowerCase().includes(needle) ||
          c.description.toLowerCase().includes(needle) ||
          c.series.some((s) => s.toLowerCase().includes(needle))
      );
    }
    if (moodFilter) {
      classes = classes.filter((c) => c.moods.includes(moodFilter));
    }
    return classes;
  }, [feed, activeTab, typeFilter, seriesFilter, searchQuery, moodFilter, savedIds]);

  const selectedItem = useMemo(
    () => feed?.classes.find((c) => c.id === selectedId) || null,
    [feed, selectedId]
  );
  const audioItem = useMemo(
    () => feed?.classes.find((c) => c.id === audio.classId) || null,
    [feed, audio.classId]
  );
  const audioSrc = audioItem?.sources.find((s) => s.type === "audio");

  // Real playback via a native <audio> element (rather than the SoundCloud
  // embed widget) — the element is persistent (rendered once, unconditionally,
  // below) and this effect just points it at a new track and binds standard
  // HTMLMediaElement events, so our React state mirrors what's actually
  // playing. This is what makes playbackRate-based speed control possible;
  // the SC widget's JS API has no equivalent method.
  useEffect(() => {
    const el = audioElRef.current;
    if (!audioItem || !audioSrc || !el) return;
    let cancelled = false;
    const classId = audioItem.id;
    audioProgressRef.current = { currentTime: 0, duration: 0 };
    audioLastPersistRef.current = 0;

    const handleLoadedMetadata = () => {
      if (cancelled) return;
      // Resume from wherever the user left off last time, if anywhere.
      const saved = loadProgress(classId, "audio");
      if (saved && saved.currentTime > 0) {
        el.currentTime = saved.currentTime;
        audioProgressRef.current.currentTime = saved.currentTime;
      }
      audioProgressRef.current.duration = el.duration || 0;
      setAudio((a) =>
        a.classId === classId ? { ...a, currentTime: el.currentTime, duration: el.duration || 0 } : a
      );
      el.playbackRate = audioRate;
      el.play().catch(() => {});
    };
    const handleTimeUpdate = () => {
      const t = el.currentTime;
      audioProgressRef.current.currentTime = t;
      setAudio((a) => (a.classId === classId ? { ...a, currentTime: t } : a));
      // Throttled write so a hard tab close mid-track (which skips the
      // pause/cleanup persistence below) doesn't lose more than ~5s.
      if (t - audioLastPersistRef.current > 5) {
        audioLastPersistRef.current = t;
        saveProgress(classId, "audio", t, audioProgressRef.current.duration);
      }
    };
    const handlePlay = () => setAudio((a) => (a.classId === classId ? { ...a, playing: true } : a));
    const handlePause = () => {
      setAudio((a) => (a.classId === classId ? { ...a, playing: false } : a));
      saveProgress(classId, "audio", audioProgressRef.current.currentTime, audioProgressRef.current.duration);
    };
    const handleEnded = () => {
      setAudio((a) => (a.classId === classId ? { ...a, playing: false, currentTime: a.duration } : a));
      clearProgress(classId, "audio");
    };

    el.addEventListener("loadedmetadata", handleLoadedMetadata);
    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    el.addEventListener("ended", handleEnded);

    el.src = soundcloudStreamUrl(audioSrc.id);
    el.load();

    return () => {
      cancelled = true;
      el.removeEventListener("loadedmetadata", handleLoadedMetadata);
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("ended", handleEnded);
      // Save wherever this track got to when switching away from it (to a
      // different track, or unmounting entirely) — the pause handler above
      // already covers explicit pauses, but this also catches switching
      // straight to a new track without one (e.g. tapping a different
      // class's quick-play button while this one is still playing).
      if (audioProgressRef.current.currentTime > 0) {
        saveProgress(classId, "audio", audioProgressRef.current.currentTime, audioProgressRef.current.duration);
      }
    };
  }, [audioItem?.id, audioSrc?.id]);

  // Applies a rate change to whatever's currently loaded without having to
  // re-run (and re-seek/re-autoplay) the track-load effect above — that
  // effect only fires on track change, so new tracks pick up the current
  // rate via `audioRate` read directly in handleLoadedMetadata instead.
  useEffect(() => {
    const el = audioElRef.current;
    if (el) el.playbackRate = audioRate;
  }, [audioRate]);

  const AUDIO_RATE_STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2];

  const cycleAudioRate = () => {
    setAudioRate((r) => {
      const idx = AUDIO_RATE_STEPS.indexOf(r);
      const next = AUDIO_RATE_STEPS[(idx + 1) % AUDIO_RATE_STEPS.length];
      saveAudioRate(next);
      return next;
    });
  };

  const togglePlay = () => {
    const el = audioElRef.current;
    if (!el) return;
    if (audio.playing) el.pause();
    else el.play().catch(() => {});
  };

  const seekAudio = (t) => {
    const el = audioElRef.current;
    if (!el) return;
    const clamped = Math.min(Math.max(t, 0), audio.duration);
    el.currentTime = clamped;
    audioProgressRef.current.currentTime = clamped;
    setAudio((a) => ({ ...a, currentTime: clamped }));
  };

  const skipAudio = (delta) => {
    const el = audioElRef.current;
    if (!el) return;
    const next = Math.min(Math.max(el.currentTime + delta, 0), audio.duration);
    el.currentTime = next;
    audioProgressRef.current.currentTime = next;
    setAudio((a) => ({ ...a, currentTime: next }));
  };

  const toggleSaved = (id) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDetail = (item) => {
    setSelectedId(item.id);
    // Video-only classes have no separate "preview" step worth showing (the
    // detail screen is just a static poster with a Play button duplicating
    // what VideoPlayer already surfaces above the live embed), so those jump
    // straight to "video". Everything else goes through "detail" first:
    // audio-only classes because that's the only place to read the
    // description before streaming, and classes with BOTH a video and an
    // audio recording (e.g. a YouTube upload plus its SoundCloud re-upload)
    // because that's where the user picks which format to play — jumping
    // straight to video would silently hide the audio option entirely.
    const hasOnlyVideo = item.types.includes("video") && !item.types.includes("audio");
    setScreen(hasOnlyVideo ? "video" : "detail");
  };

  const playVideo = (item) => {
    // The audio element lives outside the screen switch (it's rendered at
    // the bottom of the app regardless of which screen is active), so
    // switching to Watch while a track is playing would otherwise leave it
    // running underneath the video instead of stopping. Pause it directly
    // rather than touching `audio` state, since the pause event fires the
    // existing event binding that updates state for us.
    if (audio.playing) {
      const el = audioElRef.current;
      if (el) el.pause();
    }
    setSelectedId(item.id);
    setScreen("video");
  };

  // Kicks off a track the app wasn't already playing. Seeds `currentTime`
  // from any saved progress immediately (rather than waiting for the element
  // to become ready and seek) so the mini player doesn't flash "0:00" before
  // jumping to the resume point.
  const startNewAudioTrack = (item) => {
    const src = item.sources.find((s) => s.type === "audio");
    const saved = loadProgress(item.id, "audio");
    setAudio({
      classId: item.id,
      playing: true,
      currentTime: saved?.currentTime || 0,
      duration: src?.duration_sec || saved?.duration || 0,
    });
  };

  const playAudio = (item) => {
    if (audio.classId === item.id) {
      togglePlay();
      return;
    }
    startNewAudioTrack(item);
  };

  // Same track-selection logic as playAudio, but one-directional instead of
  // a toggle: it guarantees the class's audio ends up playing. playAudio's
  // toggle is right for the row's round Play/Pause button (its icon reflects
  // and controls real toggle state), but wrong for "Listen"/"Listen instead"
  // buttons — those mean "switch to audio," and if that class's audio was
  // already playing in the background (e.g. from the mini player), reusing
  // playAudio would flip it to paused instead of leaving it playing.
  const ensureAudioPlaying = (item) => {
    if (audio.classId === item.id) {
      if (!audio.playing) {
        const el = audioElRef.current;
        if (el) el.play().catch(() => {});
      }
      return;
    }
    startNewAudioTrack(item);
  };

  // Quick-play shortcut for the row's round Play button in the browse list.
  // The whole point of that button is "play immediately without navigating
  // away from the list" — which is only actually possible for audio (video
  // needs the player screen), so prefer audio whenever a class has it, and
  // only fall back to navigating to the video screen for video-only
  // classes. Explicitly choosing to watch instead lives on the detail
  // screen (see ClassDetail's Watch/Listen buttons below).
  const playItem = (item) => {
    if (item.types.includes("audio")) {
      playAudio(item);
    } else {
      playVideo(item);
    }
  };

  const handleBack = () => {
    setScreen("browse");
    setSelectedId(null);
  };

  const goHome = (tab) => {
    setActiveTab(tab);
    setScreen("browse");
    setSelectedId(null);
  };

  return (
    <div className="min-h-screen flex bg-bg font-body">
      <Sidebar activeTab={activeTab} onTabChange={goHome} />

      <main
        className={`flex-1 px-5 py-6 max-w-3xl mx-auto md:mx-0 w-full ${
          audioItem ? "pb-40 md:pb-24" : "pb-24 md:pb-6"
        }`}
      >
        {screen === "browse" && (
          <>
            <MobileHeader />
            <SearchBar value={searchQuery} onChange={setSearchQuery} />

            <button
              onClick={() => setShowMoodPicker(true)}
              className="w-full flex items-center gap-3 rounded-[16px] bg-sidebar px-4 py-3.5 mb-4 text-left"
            >
              <div className="shrink-0 w-9 h-9 rounded-full bg-white/15 text-teal flex items-center justify-center">
                <SparkleIcon />
              </div>
              <div className="min-w-0">
                <div className="font-heading font-bold text-[14px] text-white truncate">
                  What's your inspiration today?
                </div>
                <div className="font-body text-[12.5px] text-white/60 truncate">
                  Find classes that match your mood
                </div>
              </div>
            </button>

            {moodFilter && (
              <div className="flex items-center gap-2 mb-4">
                <span className="font-body text-[12.5px] text-text-secondary">Showing:</span>
                <button
                  onClick={() => setMoodFilter(null)}
                  className="flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-chip-active text-teal text-[12.5px] font-body font-semibold"
                >
                  {moodFilter}
                  <CloseIcon width={13} height={13} />
                </button>
              </div>
            )}

            {activeTab === "home" && <PlaylistsRow playlists={playlists} onSelect={setSeriesFilter} />}

            <div className="flex items-center justify-between gap-3 mb-4">
              <TypeToggle value={typeFilter} onChange={setTypeFilter} />
              <TopicsDropdown series={topicCategories} value={seriesFilter} onChange={setSeriesFilter} />
            </div>

            {error && (
              <div className="text-center text-[13px] text-red-600 py-4">Couldn't load classes: {error}</div>
            )}

            {feed?.stale && (
              <div className="text-center text-[12px] text-text-tertiary mb-3">
                Showing a cached copy of the feed — live refresh is temporarily unavailable.
              </div>
            )}

            {!feed && !error && (
              <div className="text-center text-text-secondary text-[14px] py-16">Loading classes…</div>
            )}

            {feed && (
              <ClassList
                classes={filteredClasses}
                onSelect={openDetail}
                onPlay={playItem}
                audio={audio}
                emptyMessage={
                  activeTab === "saved" ? "Tap the heart on any class to save it here." : "No classes found."
                }
              />
            )}
          </>
        )}

        {screen === "detail" && selectedItem && (
          <ClassDetail
            item={selectedItem}
            isSaved={savedIds.has(selectedItem.id)}
            onBack={handleBack}
            onToggleSave={() => toggleSaved(selectedItem.id)}
            onShare={() => setShareItem(selectedItem)}
            onDownload={() => setToast(`Downloading "${selectedItem.title}"…`)}
            onPlayVideo={() => playVideo(selectedItem)}
            onPlayAudio={() => ensureAudioPlaying(selectedItem)}
          />
        )}

        {screen === "video" && selectedItem && (
          <VideoPlayer
            item={selectedItem}
            isSaved={savedIds.has(selectedItem.id)}
            onBack={handleBack}
            onToggleSave={() => toggleSaved(selectedItem.id)}
            onShare={() => setShareItem(selectedItem)}
            onDownload={() => setToast(`Downloading "${selectedItem.title}"…`)}
            onListen={() => {
              // Switch back to the poster/detail screen and make sure audio
              // is playing — mirrors tapping "Listen" from there, so
              // watching a class doesn't strand the user with no way back
              // to the audio version they might have started this class
              // with. Uses ensureAudioPlaying (not playAudio) since this is
              // a one-directional "switch to audio" action, not a toggle:
              // if the audio was already playing in the background, this
              // should leave it playing, not pause it.
              ensureAudioPlaying(selectedItem);
              setScreen("detail");
            }}
          />
        )}
      </main>

      <BottomTabBar activeTab={activeTab} onTabChange={goHome} />

      {/* Persistent (not remounted per-track) — the track-load effect above
          just points .src at the new track's stream endpoint, which is what
          lets a rate change survive across tracks and what unlocks
          playbackRate-based speed control (the SC embed widget had neither). */}
      <audio ref={audioElRef} className="hidden" preload="metadata" />

      {audioItem && !showAudioFull && (
        <MiniPlayer
          item={audioItem}
          audio={audio}
          onTogglePlay={togglePlay}
          onExpand={() => setShowAudioFull(true)}
        />
      )}

      {showAudioFull && audioItem && (
        <NowPlaying
          item={audioItem}
          audio={audio}
          isSaved={savedIds.has(audioItem.id)}
          rate={audioRate}
          onCollapse={() => setShowAudioFull(false)}
          onTogglePlay={togglePlay}
          onSeek={seekAudio}
          onSkip={skipAudio}
          onCycleRate={cycleAudioRate}
          onToggleSave={() => toggleSaved(audioItem.id)}
          onShare={() => setShareItem(audioItem)}
          onDownload={() => setToast(`Downloading "${audioItem.title}"…`)}
        />
      )}

      {shareItem && <ShareSheet item={shareItem} onClose={() => setShareItem(null)} onToast={setToast} />}

      {showMoodPicker && (
        <MoodPicker
          moods={feed?.moods || []}
          onSelect={(mood) => {
            setMoodFilter(mood);
            setShowMoodPicker(false);
            setActiveTab("home");
            setScreen("browse");
            setSelectedId(null);
          }}
          onClose={() => setShowMoodPicker(false)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
