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
import { loadSavedIds, saveSavedIds } from "./lib/storage";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState(() => loadSavedIds());

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [seriesFilter, setSeriesFilter] = useState("All Topics");

  const [screen, setScreen] = useState("browse"); // browse | detail | video
  const [selectedId, setSelectedId] = useState(null);
  const [showAudioFull, setShowAudioFull] = useState(false);
  const [audio, setAudio] = useState({ classId: null, playing: false, currentTime: 0, duration: 0 });
  const [shareItem, setShareItem] = useState(null);
  const [toast, setToast] = useState(null);

  const audioIframeRef = useRef(null);
  const audioWidgetRef = useRef(null);

  useEffect(() => {
    fetchClasses()
      .then(setFeed)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => saveSavedIds(savedIds), [savedIds]);

  const playlists = useMemo(() => {
    if (!feed) return [];
    const bySeries = new Map();
    for (const c of feed.classes) {
      for (const s of c.series) {
        if (!bySeries.has(s)) bySeries.set(s, { name: s, count: 0, mostRecent: c.published_at });
        const entry = bySeries.get(s);
        entry.count += 1;
        if (c.published_at > entry.mostRecent) entry.mostRecent = c.published_at;
      }
    }
    return [...bySeries.values()].sort((a, b) => (a.mostRecent < b.mostRecent ? 1 : -1));
  }, [feed]);

  const filteredClasses = useMemo(() => {
    if (!feed) return [];
    let classes = feed.classes;

    if (activeTab === "saved") {
      classes = classes.filter((c) => savedIds.has(c.id));
    }
    if (typeFilter !== "all") {
      classes = classes.filter((c) => c.types.includes(typeFilter));
    }
    if (seriesFilter !== "All Topics") {
      classes = classes.filter((c) => c.series.includes(seriesFilter));
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

    const attach = () => {
      if (cancelled || !audioIframeRef.current || !window.SC) return;
      const widget = window.SC.Widget(audioIframeRef.current);
      audioWidgetRef.current = widget;
      const { Events } = window.SC.Widget;

      widget.bind(Events.READY, () => {
        widget.play();
        widget.getDuration((ms) =>
          setAudio((a) => (a.classId === audioItem.id ? { ...a, duration: ms / 1000 } : a))
        );
      });
      widget.bind(Events.PLAY, () =>
        setAudio((a) => (a.classId === audioItem.id ? { ...a, playing: true } : a))
      );
      widget.bind(Events.PAUSE, () =>
        setAudio((a) => (a.classId === audioItem.id ? { ...a, playing: false } : a))
      );
      widget.bind(Events.FINISH, () =>
        setAudio((a) => (a.classId === audioItem.id ? { ...a, playing: false, currentTime: a.duration } : a))
      );
      widget.bind(Events.PLAY_PROGRESS, (data) =>
        setAudio((a) => (a.classId === audioItem.id ? { ...a, currentTime: data.currentPosition / 1000 } : a))
      );
    };

    if (window.SC) {
      attach();
      return () => {
        cancelled = true;
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
    setScreen("detail");
  };

  const playItem = (item) => {
    if (item.types.includes("video")) {
      setSelectedId(item.id);
      setScreen("video");
      return;
    }
    if (audio.classId === item.id) {
      togglePlay();
      return;
    }
    const src = item.sources.find((s) => s.type === "audio");
    setAudio({ classId: item.id, playing: true, currentTime: 0, duration: src?.duration_sec || 0 });
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
              <TopicsDropdown series={feed?.series || []} value={seriesFilter} onChange={setSeriesFilter} />
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
            onPlay={() => playItem(selectedItem)}
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
