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
import { fetchClasses } from "./lib/api";
import { loadSavedIds, saveSavedIds, loadProgress, saveProgress, clearProgress } from "./lib/storage";
import { categoryForClass, buildTopicCategories } from "./lib/topics";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState(() => loadSavedIds());

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [seriesFilter, setSeriesFilter] = useState("Topics");

  const [screen, setScreen] = useState("browse"); // browse | detail | video
  const [selectedId, setSelectedId] = useState(null);
  const [showAudioFull, setShowAudioFull] = useState(false);
  const [audio, setAudio] = useState({ classId: null, playing: false, currentTime: 0, duration: 0 });
  const [shareItem, setShareItem] = useState(null);
  const [toast, setToast] = useState(null);

  const audioIframeRef = useRef(null);
  const audioWidgetRef = useRef(null);
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

  const topicCategories = useMemo(() => buildTopicCategories(feed?.series || []), [feed]);

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
      // playlist card) or a broad topic category (from the dropdown) — a
      // class matches if either kind of value applies to it.
      classes = classes.filter(
        (c) => c.series.includes(seriesFilter) || categoryForClass(c) === seriesFilter
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
    return classes;
  }, [feed, activeTab, typeFilter, seriesFilter, searchQuery, savedIds]);

  const selectedItem = useMemo(
    () => feed?.classes.find((c) => c.id === selectedId) || null,
    [feed, selectedId]
  );
  const audioItem = useMemo(
    () => feed?.classes.find((c) => c.id === audio.classId) || null,
    [feed, audio.classId]
  );
  const audioEmbedUrl = audioItem?.sources.find((s) => s.type === "audio")?.embed_url;

  // Real playback via the SoundCloud Widget JS API — the hidden <iframe> below
  // is remounted (via `key`) whenever the track changes, and this effect
  // attaches a fresh SC.Widget to it and binds real playback events so our
  // React state mirrors what's actually playing (not a simulated clock).
  useEffect(() => {
    if (!audioItem || !audioEmbedUrl) return;
    let cancelled = false;
    const classId = audioItem.id;
    audioProgressRef.current = { currentTime: 0, duration: 0 };
    audioLastPersistRef.current = 0;

    const attach = () => {
      if (cancelled || !audioIframeRef.current || !window.SC) return;
      const widget = window.SC.Widget(audioIframeRef.current);
      audioWidgetRef.current = widget;
      const { Events } = window.SC.Widget;

      widget.bind(Events.READY, () => {
        // Resume from wherever the user left off last time, if anywhere.
        const saved = loadProgress(classId, "audio");
        if (saved && saved.currentTime > 0) {
          widget.seekTo(saved.currentTime * 1000);
          audioProgressRef.current.currentTime = saved.currentTime;
          setAudio((a) => (a.classId === classId ? { ...a, currentTime: saved.currentTime } : a));
        }
        widget.play();
        widget.getDuration((ms) => {
          audioProgressRef.current.duration = ms / 1000;
          setAudio((a) => (a.classId === classId ? { ...a, duration: ms / 1000 } : a));
        });
      });
      widget.bind(Events.PLAY, () =>
        setAudio((a) => (a.classId === classId ? { ...a, playing: true } : a))
      );
      widget.bind(Events.PAUSE, () => {
        setAudio((a) => (a.classId === classId ? { ...a, playing: false } : a));
        saveProgress(classId, "audio", audioProgressRef.current.currentTime, audioProgressRef.current.duration);
      });
      widget.bind(Events.FINISH, () => {
        setAudio((a) => (a.classId === classId ? { ...a, playing: false, currentTime: a.duration } : a));
        clearProgress(classId, "audio");
      });
      widget.bind(Events.PLAY_PROGRESS, (data) => {
        const t = data.currentPosition / 1000;
        audioProgressRef.current.currentTime = t;
        setAudio((a) => (a.classId === classId ? { ...a, currentTime: t } : a));
        // Throttled write so a hard tab close mid-track (which skips the
        // PAUSE/cleanup persistence below) doesn't lose more than ~5s.
        if (t - audioLastPersistRef.current > 5) {
          audioLastPersistRef.current = t;
          saveProgress(classId, "audio", t, audioProgressRef.current.duration);
        }
      });
    };

    // Save wherever this track got to when switching away from it (to a
    // different track, or unmounting entirely) — the PAUSE binding above
    // already covers explicit pauses, but this also catches switching
    // straight to a new track without one (e.g. tapping a different class's
    // quick-play button while this one is still playing).
    const persistOnTeardown = () => {
      if (audioProgressRef.current.currentTime > 0) {
        saveProgress(classId, "audio", audioProgressRef.current.currentTime, audioProgressRef.current.duration);
      }
    };

    if (window.SC) {
      attach();
      return () => {
        cancelled = true;
        persistOnTeardown();
      };
    }
    const pollId = setInterval(() => {
      if (window.SC) {
        clearInterval(pollId);
        attach();
      }
    }, 100);
    return () => {
      cancelled = true;
      clearInterval(pollId);
      persistOnTeardown();
    };
  }, [audioItem?.id, audioEmbedUrl]);

  const togglePlay = () => {
    const widget = audioWidgetRef.current;
    if (!widget) return;
    if (audio.playing) widget.pause();
    else widget.play();
  };

  const seekAudio = (t) => {
    const widget = audioWidgetRef.current;
    if (!widget) return;
    const clamped = Math.min(Math.max(t, 0), audio.duration);
    widget.seekTo(clamped * 1000);
    setAudio((a) => ({ ...a, currentTime: clamped }));
  };

  const skipAudio = (delta) => {
    const widget = audioWidgetRef.current;
    if (!widget) return;
    widget.getPosition((ms) => {
      const next = Math.min(Math.max(ms / 1000 + delta, 0), audio.duration);
      widget.seekTo(next * 1000);
      setAudio((a) => ({ ...a, currentTime: next }));
    });
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
    // The audio widget lives outside the screen switch (it's rendered at
    // the bottom of the app regardless of which screen is active), so
    // switching to Watch while a track is playing would otherwise leave it
    // running underneath the video instead of stopping. Pause it directly
    // via the widget rather than touching `audio` state, since PAUSE fires
    // the existing event binding that updates state for us.
    if (audio.playing) {
      const widget = audioWidgetRef.current;
      if (widget) widget.pause();
    }
    setSelectedId(item.id);
    setScreen("video");
  };

  // Kicks off a track the app wasn't already playing. Seeds `currentTime`
  // from any saved progress immediately (rather than waiting for the widget
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
        const widget = audioWidgetRef.current;
        if (widget) widget.play();
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

      {audioItem && audioEmbedUrl && (
        <iframe
          key={audioItem.id}
          ref={audioIframeRef}
          title="audio-player"
          src={audioEmbedUrl}
          allow="autoplay"
          className="hidden"
        />
      )}

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
          onCollapse={() => setShowAudioFull(false)}
          onTogglePlay={togglePlay}
          onSeek={seekAudio}
          onSkip={skipAudio}
          onToggleSave={() => toggleSaved(audioItem.id)}
          onShare={() => setShareItem(audioItem)}
          onDownload={() => setToast(`Downloading "${audioItem.title}"…`)}
        />
      )}

      {shareItem && <ShareSheet item={shareItem} onClose={() => setShareItem(null)} onToast={setToast} />}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
