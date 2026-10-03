import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { Button, Tag, message, Tooltip, Switch, Spin } from 'antd';
import {
  PlayCircleFilled,
  PauseCircleFilled,
  HeartFilled,
  HeartOutlined,
  ShareAltOutlined,
  ArrowLeftOutlined,
  LinkOutlined,
  CheckCircleFilled,
  FireFilled,
  StepForwardOutlined,
  StepBackwardOutlined,
  FullscreenOutlined,
  ThunderboltFilled,
  UnorderedListOutlined,
  VideoCameraFilled,
  LoadingOutlined,
  RotateRightOutlined,
  WarningOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import Hls from 'hls.js';
import {
  getPosterUrl,
  fetchDramaEpisodes,
  fetchDramaDetail,
  refreshEpisodeStream,
  getProxyStreamUrl,
  searchDramas,
  translateContent,
} from '../services/api';
import { isFavorite, saveFavorite, removeFavorite, saveHistory, getSectionsCache, getDB } from '../services/db';
import { useDramaStore } from '../store/useDramaStore';
import { FALLBACK_DATA } from '../services/fallbackData';


export function Watch() {
  const { bookId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    selectedProvider,
    refreshCounts,
    autoTranslate,
    setAutoTranslate,
  } = useDramaStore();

  const [drama, setDrama] = useState(location.state?.drama || null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [resumePromptTime, setResumePromptTime] = useState(0);

  // Auto-Translation state (Title, Synopsis)
  const [translatedData, setTranslatedData] = useState({
    title: '',
    description: '',
    category_name: '',
    tags: [],
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);



  // Mode: 'single' (từng tập) vs 'full_movie' (ghép tất cả tập vào 1 tập liên tục)
  const [isFullMovieMode, setIsFullMovieMode] = useState(true);

  // Batch pagination state (batches of 30 episodes)
  const BATCH_SIZE = 30;
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);

  // Video current time & duration for timeline tracking
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const playerContainerRef = useRef(null);

  // Auto-scroll focus to player on mobile upon mounting or changing drama/episode
  const scrollToPlayerOnMobile = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (playerContainerRef.current) {
        playerContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // LocalStorage timestamps helpers
  const getSavedTimestamp = (title, epIdx) => {
    try {
      const ts = JSON.parse(localStorage.getItem('df_timestamps_v1') || '{}');
      return ts[`${title}__${epIdx}`] || 0;
    } catch {
      return 0;
    }
  };

  const saveCurrentTimestamp = (title, epIdx, secs) => {
    if (!title || secs < 2) return;
    try {
      const ts = JSON.parse(localStorage.getItem('df_timestamps_v1') || '{}');
      ts[`${title}__${epIdx}`] = Math.floor(secs);
      localStorage.setItem('df_timestamps_v1', JSON.stringify(ts));
    } catch {}
  };

  // Reset state on drama change & immediately scroll to player
  useEffect(() => {
    setDrama(location.state?.drama || null);
    setEpisodes([]);
    setCurrentEpisodeIndex(0);
    setLoading(true);
    setStreamError(null);
    scrollToPlayerOnMobile();
  }, [bookId]);

  // 1. Load Drama Info & Full Details
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const searchParams = new URLSearchParams(location.search);
      const directWatchUrl = searchParams.get('watch') || searchParams.get('url');
      const directTitle = searchParams.get('title');
      const directProvider = searchParams.get('provider');

      // Check location state only if it matches current bookId
      let current = null;
      if (location.state?.drama && String(location.state.drama.book_id) === String(bookId)) {
        current = { ...location.state.drama };
      }

      // If URL has direct watch url, always ensure it is attached
      if (directWatchUrl) {
        if (!current) {
          current = {
            book_id: bookId,
            watch_url: directWatchUrl,
            title: directTitle ? decodeURIComponent(directTitle) : 'Đang tải thông tin phim...',
            category_name: directProvider ? decodeURIComponent(directProvider) : '',
          };
        } else if (!current.watch_url) {
          current.watch_url = directWatchUrl;
        }
      }

      // Check IndexedDB history and favorites first
      if (!current && bookId) {
        try {
          const db = await getDB();
          const inHist = await db.get('history', bookId);
          if (inHist) {
            current = inHist;
          } else {
            const inFav = await db.get('favorites', bookId);
            if (inFav) current = inFav;
          }

          // Check all cached sections across all providers
          if (!current && db.objectStoreNames.contains('sections_cache')) {
            const allCaches = await db.getAll('sections_cache');
            for (const c of allCaches) {
              for (const sec of (c.data?.sections || [])) {
                const found = sec.items?.find((i) => String(i.book_id) === String(bookId));
                if (found) {
                  current = found;
                  break;
                }
              }
              if (current) break;
            }
          }
        } catch (e) {
          console.warn('[Watch] Error looking up cached drama:', e);
        }
      }

      // Check fallback data sections
      if (!current) {
        for (const sec of (FALLBACK_DATA.sections || [])) {
          const found = sec.items?.find((i) => String(i.book_id) === String(bookId));
          if (found) {
            current = found;
            break;
          }
        }
      }

      // Exact search query by bookId if still not found (NEVER pick searchRes[0] if mismatch)
      if (!current && bookId) {
        try {
          const searchRes = await searchDramas(bookId);
          if (searchRes && searchRes.length > 0) {
            const exact = searchRes.find((x) => String(x.book_id) === String(bookId));
            if (exact) {
              current = exact;
            }
          }
        } catch {}
      }

      // If still no metadata, build minimal current object without hijacking to Dragon Lord
      if (!current && bookId) {
        current = {
          book_id: bookId,
          title: directTitle ? decodeURIComponent(directTitle) : `Phim #${bookId}`,
          watch_url: directWatchUrl || '',
          category_name: directProvider ? decodeURIComponent(directProvider) : '',
        };
      }

      if (mounted && current) {
        setDrama(current);
        saveHistory(current);
        isFavorite(current.book_id).then((fav) => setBookmarked(fav));

        // Load detail and episodes directly from /api/drama
        let epList = [];
        if (current.watch_url) {
          try {
            let detail = await fetchDramaDetail({ watch_url: current.watch_url, lang: 'vi-VN' });
            if (!detail || !detail.ok || !Array.isArray(detail.episodes) || detail.episodes.length === 0) {
              // Retry with upstream native language (id-ID)
              detail = await fetchDramaDetail({ watch_url: current.watch_url, lang: 'id-ID' });
            }

            if (mounted && detail && detail.ok) {
              setDrama((prev) => ({
                ...prev,
                ...detail,
                slug: detail.slug || prev?.slug,
                rs_ctx: detail.rs_ctx || prev?.rs_ctx || '',
                description: detail.description || prev?.description,
                title: detail.title || prev?.title,
                poster_url: detail.poster || prev?.poster_url,
              }));
              if (Array.isArray(detail.episodes) && detail.episodes.length > 0) {
                epList = detail.episodes;
              }
            }
          } catch (e) {
            console.warn('[Watch] Error fetching drama detail:', e);
          }
        }

        if (epList.length === 0) {
          epList = await fetchDramaEpisodes(current);
        }

        if (mounted) {
          setEpisodes(epList);
          setCurrentEpisodeIndex(0);
        }
      }

      if (mounted) {
        setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [bookId, location.search]);

  // 1b. Auto-Translation Effect (Titles, Synopsis, Category, Tags)
  useEffect(() => {
    let mounted = true;
    if (!drama?.title) return;

    if (!autoTranslate) return;

    async function doTranslate() {
      setIsTranslating(true);
      try {
        const rawTags = Array.isArray(drama.tag_names) ? drama.tag_names : [];
        const textsToTranslate = [
          drama.title || '',
          drama.description || '',
          drama.category_name || '',
          ...rawTags,
        ];

        const res = await translateContent({ texts: textsToTranslate, to: 'vi' });
        if (mounted && Array.isArray(res) && res.length >= 3) {
          setTranslatedData({
            title: res[0] || drama.title,
            description: res[1] || drama.description,
            category_name: res[2] || drama.category_name,
            tags: res.slice(3) || rawTags,
          });
        }
      } catch (err) {
        console.warn('[Watch] Auto-translate error:', err);
      } finally {
        if (mounted) {
          setIsTranslating(false);
        }
      }
    }

    doTranslate();
    return () => {
      mounted = false;
    };
  }, [drama?.title, drama?.description, autoTranslate]);

  const isTranslatedActive = autoTranslate && !showOriginal && Boolean(translatedData.title);
  const displayTitle = isTranslatedActive ? translatedData.title : (drama?.title || '');
  const displayDescription = isTranslatedActive && translatedData.description ? translatedData.description : (drama?.description || '');
  const displayCategory = isTranslatedActive && translatedData.category_name ? translatedData.category_name : (drama?.category_name || '');
  const displayTags = isTranslatedActive && translatedData.tags?.length ? translatedData.tags : (drama?.tag_names || []);


  // Auto switch batch tab when currentEpisodeIndex changes
  useEffect(() => {
    if (episodes.length > BATCH_SIZE) {
      const targetBatch = Math.floor(currentEpisodeIndex / BATCH_SIZE);
      if (targetBatch !== activeBatchIndex) {
        setActiveBatchIndex(targetBatch);
      }
    }
  }, [currentEpisodeIndex, episodes.length]);

  // Current active episode
  const activeEpisode = episodes[currentEpisodeIndex] || null;
  const currentEpisodeNumber = activeEpisode?.number || activeEpisode?.route_episode_number || (currentEpisodeIndex + 1);
  const totalEpisodes = episodes.length || 45;

  // Estimated total duration in Full Movie Mode (~90s per episode)
  const estEpisodeSeconds = duration > 0 ? duration : 90;
  const estTotalSeconds = totalEpisodes * estEpisodeSeconds;
  const currentTotalSeconds = currentEpisodeIndex * estEpisodeSeconds + currentTime;


  // Format mm:ss or hh:mm:ss
  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Prefetch stream for next episode in background
  const prefetchNextEpisode = async (nextIndex) => {
    if (!episodes[nextIndex]) return;
    const nextEp = episodes[nextIndex];
    if (nextEp.play_url) return;
    if (nextEp.watch_url) {
      try {
        const refreshed = await refreshEpisodeStream({
          watch_url: nextEp.watch_url,
          slug: drama?.slug,
          ep: nextEp.number || nextIndex + 1,
          rs_ctx: nextEp.rs_ctx || drama?.rs_ctx || '',
        });
        if (refreshed && refreshed.play_url) {
          nextEp.play_url = refreshed.play_url;
        }
      } catch {}
    }
  };

  // 2. Setup HLS Video Playback with Resilient Crawler Recovery & Proxy Stream Fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeEpisode) return;

    let mounted = true;
    let streamUrl = activeEpisode.play_url || activeEpisode.direct_play_url;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setStreamError(null);
    setResumePromptTime(0);
    setLoadingVideo(true);

    async function initPlayback() {
      // If stream URL is empty, on-demand resolve using Edge / Origin crawler refresh
      if (!streamUrl && (activeEpisode.watch_url || drama?.slug)) {
        const refreshed = await refreshEpisodeStream({
          watch_url: activeEpisode.watch_url,
          slug: drama?.slug,
          ep: currentEpisodeNumber,
          rs_ctx: activeEpisode.rs_ctx || drama?.rs_ctx || '',
        });
        if (refreshed && refreshed.play_url) {
          streamUrl = refreshed.play_url;
          activeEpisode.play_url = streamUrl;
          if (refreshed.subtitle_url) {
            activeEpisode.subtitle_url = refreshed.subtitle_url;
          }
        }
      }

      if (!mounted) return;

      if (!streamUrl) {
        setLoadingVideo(false);
        setStreamError(`Chưa có luồng phát trực tiếp khả dụng từ nhà cung cấp cho tập ${currentEpisodeNumber}.`);
        return;
      }

      // Trigger prefetch for next episode
      prefetchNextEpisode(currentEpisodeIndex + 1);

      let hasRetriedProxy = false;
      let hasRetriedRefresh = false;
      const isM3U8 = streamUrl.includes('.m3u8') || streamUrl.includes('m3u8') || activeEpisode.is_hls;

      if (isM3U8 && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 60,
          maxBufferLength: 30,
        });

        hlsRef.current = hls;
        hls.attachMedia(video);

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          if (!mounted) return;
          try {
            hls.loadSource(streamUrl);
          } catch (e) {
            console.warn('[HLS] loadSource error:', e);
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!mounted) return;
          setLoadingVideo(false);
          setStreamError(null);

          // Check if previous timestamp exists for resume
          const savedTs = getSavedTimestamp(drama?.title, currentEpisodeIndex);
          if (savedTs > 5) {
            setResumePromptTime(savedTs);
          }

          if (isPlaying) {
            video.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, async (event, data) => {
          if (data.fatal) {
            console.warn('[HLS] Fatal error:', data.type, data.details);
            // 1. Try refreshing stream link once via upstream Edge refresh-source
            if (!hasRetriedRefresh && (activeEpisode.watch_url || drama?.slug)) {
              hasRetriedRefresh = true;
              console.log('[HLS] Stream expired or failed. Requesting fresh stream from Edge...');
              try {
                const refreshed = await refreshEpisodeStream({
                  watch_url: activeEpisode.watch_url,
                  slug: drama?.slug,
                  ep: currentEpisodeNumber,
                  rs_ctx: activeEpisode.rs_ctx || drama?.rs_ctx || '',
                });
                if (refreshed && refreshed.play_url && refreshed.play_url !== streamUrl) {
                  streamUrl = refreshed.play_url;
                  activeEpisode.play_url = streamUrl;
                  hls.loadSource(streamUrl);
                  return;
                }
              } catch (err) {
                console.warn('[HLS] Refresh recovery failed:', err);
              }
            }

            // 2. Try proxy stream retry
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !hasRetriedProxy && !streamUrl.includes('/api/proxy-stream')) {
              hasRetriedProxy = true;
              console.log('[HLS] Attempting CORS proxy stream retry...');
              hls.loadSource(getProxyStreamUrl(streamUrl));
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              setLoadingVideo(false);
              setStreamError(`Luồng phát từ nhà cung cấp bị gián đoạn hoặc hết hạn (Tập ${currentEpisodeNumber}). Bấm "Thử lại" hoặc chuyển sang tập khác.`);
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          if (!mounted) return;
          setLoadingVideo(false);
          const savedTs = getSavedTimestamp(drama?.title, currentEpisodeIndex);
          if (savedTs > 5) {
            setResumePromptTime(savedTs);
          }
          if (isPlaying) {
            video.play().catch(() => {});
          }
        });
        video.addEventListener('error', () => {
          if (!hasRetriedProxy && !streamUrl.includes('/api/proxy-stream')) {
            hasRetriedProxy = true;
            video.src = getProxyStreamUrl(streamUrl);
            video.play().catch(() => {});
          } else {
            setLoadingVideo(false);
            setStreamError(`Không thể phát tập ${currentEpisodeNumber}.`);
          }
        });
      } else {
        video.src = streamUrl;
        setLoadingVideo(false);
      }
    }

    initPlayback();

    return () => {
      mounted = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeEpisode]);

  const handlePlayToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback request error:', err);
        // Fallback for strict browser autoplay policy: mute and play
        video.muted = true;
        video.play().then(() => {
          setIsPlaying(true);
          message.info('Video đang phát (đã tắt tiếng). Bạn có thể bật tiếng trên thanh điều khiển.');
        }).catch(() => {
          setIsPlaying(true);
        });
      });
    }
  };

  const handleSelectEpisode = (index) => {
    if (index < 0 || index >= episodes.length) return;
    setCurrentEpisodeIndex(index);
    setIsPlaying(true);
    scrollToPlayerOnMobile();
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }, 120);
  };

  const handleNextEpisode = () => {
    if (currentEpisodeIndex + 1 < episodes.length) {
      handleSelectEpisode(currentEpisodeIndex + 1);
    } else {
      message.success('Bạn đã xem xong trọn bộ 55 tập phim!');
      setIsPlaying(false);
    }
  };

  const handlePrevEpisode = () => {
    if (currentEpisodeIndex > 0) {
      handleSelectEpisode(currentEpisodeIndex - 1);
    }
  };

  // Video onEnded handler: If Full Movie Mode, seamlessly jump to next episode and keep playing!
  const handleVideoEnded = () => {
    if (isFullMovieMode) {
      if (currentEpisodeIndex + 1 < episodes.length) {
        message.info(`Đang chuyển liền mạch sang Tập ${currentEpisodeIndex + 2}...`);
        handleNextEpisode();
      } else {
        message.success('Đã kết thúc trọn bộ phim!');
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(false);
    }
  };

  // Seek across full movie timeline
  const handleFullMovieSeek = (e) => {
    const targetTotalSecs = Number(e.target.value);
    const targetEpIndex = Math.min(
      episodes.length - 1,
      Math.floor(targetTotalSecs / estEpisodeSeconds)
    );
    const targetOffset = targetTotalSecs % estEpisodeSeconds;

    if (targetEpIndex !== currentEpisodeIndex) {
      setCurrentEpisodeIndex(targetEpIndex);
      setIsPlaying(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = targetOffset;
        }
      }, 500);
    } else if (videoRef.current) {
      videoRef.current.currentTime = targetOffset;
    }
  };

  const toggleFavorite = async () => {
    if (!drama) return;
    if (bookmarked) {
      await removeFavorite(drama.book_id);
      setBookmarked(false);
      message.info('Đã xóa khỏi danh sách yêu thích');
    } else {
      await saveFavorite(drama);
      setBookmarked(true);
      message.success('Đã lưu phim để xem offline');
    }
    refreshCounts();
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: drama?.title,
        text: drama?.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      message.success('Đã sao chép liên kết phim vào bộ nhớ tạm!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="relative flex items-center justify-center mb-5">
          <div className="absolute h-20 w-20 rounded-full bg-rose-600/25 blur-xl animate-pulse" />
          <Spin indicator={<LoadingOutlined style={{ fontSize: 44, color: '#e11d48' }} spin />} />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-white mb-2 font-display">
          Đang tải thông tin phim...
        </h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Đang chuẩn bị dữ liệu phim và danh sách tập chất lượng cao. Vui lòng chờ trong giây lát...
        </p>
      </div>
    );
  }

  if (!drama) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-xl font-bold text-white mb-2">Không tìm thấy phim</h2>
        <p className="text-slate-400 text-xs mb-4">Mã phim không tồn tại hoặc đã bị gỡ.</p>
        <Link to="/">
          <Button type="primary">Trở về trang chủ</Button>
        </Link>
      </div>
    );
  }

  const poster = getPosterUrl(drama.poster_url);
  const nartoWatchUrl = `https://narto-drama.com/detail/watch/forbidden-affair-taming-the-dragon-lord/${currentEpisodeNumber}?lang=id-ID&from=home`;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5">
      {/* Top back navigation & quick breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-800 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeftOutlined className="text-rose-500" /> Quay lại danh sách
        </button>

        {/* Mode Switch: Ghép trọn bộ 1 tập vs Từng tập */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-3.5 py-1.5 shadow-md backdrop-blur-md">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <VideoCameraFilled className={isFullMovieMode ? 'text-rose-500' : 'text-slate-500'} />
            Ghép trọn bộ 1 tập:
          </span>
          <Switch
            checked={isFullMovieMode}
            onChange={(checked) => {
              setIsFullMovieMode(checked);
              if (checked) {
                message.success('Đã bật chế độ Ghép trọn bộ 1 tập! Phim sẽ phát liên tục không ngắt quãng.');
              } else {
                message.info('Đã chuyển sang chế độ xem từng tập riêng lẻ.');
              }
            }}
            checkedChildren="BẬT"
            unCheckedChildren="TẮT"
            className="bg-slate-700"
          />
        </div>

        <a
          href={drama.watch_url || nartoWatchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold bg-rose-500/10 px-3.5 py-2 rounded-xl border border-rose-500/20 transition-all"
        >
          <LinkOutlined /> Mở web gốc ({drama.category_name || 'Upstream'}) &rarr;
        </a>
      </div>

      {/* Full Movie Banner Mode Alert */}
      {isFullMovieMode && (
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-slate-900/70 p-3.5 border border-rose-500/30 flex items-center justify-between gap-3 text-xs shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white font-black text-xs shadow-md shadow-rose-600/30 shrink-0">
              <ThunderboltFilled />
            </span>
            <div>
              <strong className="text-white text-xs sm:text-sm">Đang xem chế độ Ghép trọn bộ ({totalEpisodes} tập):</strong>
              <span className="text-slate-300 ml-1.5 hidden sm:inline leading-relaxed">
                Tự động nối tiếp tập tiếp theo mượt mà như một bộ phim điện ảnh (~{Math.round(estTotalSeconds / 60)} phút).
              </span>
            </div>
          </div>
          <span className="shrink-0 rounded-xl bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-300 border border-rose-500/40 font-mono shadow-sm">
            Tập {currentEpisodeNumber} / {totalEpisodes}
          </span>
        </div>
      )}

      {/* Main Grid: Vertical Player on left/center, Episode Picker & Details on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Short Drama Player */}
        <div ref={playerContainerRef} className="lg:col-span-8 flex flex-col items-center scroll-mt-4 w-full">
          <div className="relative w-full max-w-[440px] aspect-[9/16] max-h-[78vh] rounded-3xl overflow-hidden bg-black border-2 border-slate-800/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] flex items-center justify-center group ring-1 ring-white/10">
            {/* Ambient Backlight Glow behind player */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-rose-600/20 via-transparent to-indigo-600/20 opacity-50 blur-xl pointer-events-none" />

            {/* HTML5 Video Element with HLS stream */}
            <video
              ref={videoRef}
              playsInline
              preload="metadata"
              poster={poster}
              controls={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={(e) => {
                const ct = e.target.currentTime;
                setCurrentTime(ct);
                if (e.target.duration && !isNaN(e.target.duration)) {
                  setDuration(e.target.duration);
                }
                saveCurrentTimestamp(drama?.title, currentEpisodeIndex, ct);
              }}
              onEnded={handleVideoEnded}
              className="w-full h-full object-contain bg-black z-10"
            />


            {/* Resume Playback Banner */}
            {resumePromptTime > 0 && (
              <div className="absolute top-4 left-4 right-4 z-30 rounded-2xl bg-slate-900/90 border border-rose-500/40 p-3 shadow-xl backdrop-blur-md flex items-center justify-between text-xs text-white animate-fade-in">
                <span>Tiếp tục từ <strong>{formatTime(resumePromptTime)}</strong>?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = resumePromptTime;
                        videoRef.current.play().catch(() => {});
                      }
                      setResumePromptTime(0);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer text-xs hover:bg-rose-500 transition-colors"
                  >
                    Tiếp tục
                  </button>
                  <button
                    onClick={() => setResumePromptTime(0)}
                    className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer text-xs transition-colors"
                  >
                    Bỏ qua
                  </button>
                </div>
              </div>
            )}

            {/* Stream Error Overlay with Resilient Recovery Option */}
            {streamError && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/85 backdrop-blur-md text-center">
                <WarningOutlined className="text-4xl text-rose-500 mb-3" />
                <h4 className="text-white font-bold text-sm mb-1">Không thể phát tập {currentEpisodeNumber}</h4>
                <p className="text-slate-400 text-xs mb-4 max-w-xs">{streamError}</p>
                <div className="flex gap-2">
                  <Button
                    type="primary"
                    icon={<RotateRightOutlined />}
                    onClick={() => handleSelectEpisode(currentEpisodeIndex)}
                    className="bg-rose-600 hover:bg-rose-500 text-xs rounded-xl"
                  >
                    Thử lại
                  </Button>
                  {currentEpisodeIndex + 1 < episodes.length && (
                    <Button
                      onClick={handleNextEpisode}
                      className="border-slate-700 bg-slate-800 text-slate-200 text-xs rounded-xl"
                    >
                      Tập tiếp theo &rarr;
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {loadingVideo && !streamError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-500 border-t-transparent mb-2" />
                <span className="text-xs text-slate-300 font-medium">Đang chuyển tập {currentEpisodeNumber}...</span>
              </div>
            )}

            {/* Poster Overlay when not playing */}
            {!isPlaying && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-6 bg-gradient-to-t from-black via-black/30 to-black/60 pointer-events-none">
                {/* Top Badge */}
                <div className="w-full flex items-center justify-between">
                  <span className="rounded-full bg-rose-600/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-md">
                    {isFullMovieMode ? `Phim Trọn Bộ • Tập ${currentEpisodeNumber}/${totalEpisodes}` : `Tập ${currentEpisodeNumber} / ${totalEpisodes}`}
                  </span>
                  <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-slate-200 border border-white/10">
                    {displayCategory || drama.category_name}
                  </span>
                </div>

                {/* Big Center Play Button */}
                <button
                  onClick={handlePlayToggle}
                  aria-label="Phát video"
                  className="pointer-events-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-600 text-white shadow-2xl shadow-rose-600/60 transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-4 ring-rose-500/30"
                >
                  <PlayCircleFilled className="text-4xl pl-1" />
                </button>

                {/* Bottom Video Meta info */}
                <div className="w-full text-center px-4">
                  <h3 className="text-base font-bold text-white drop-shadow mb-1 line-clamp-1">
                    {displayTitle || drama.title}
                  </h3>
                  <p className="text-xs text-slate-300 drop-shadow">
                    {isFullMovieMode ? 'Nhấn để bắt đầu xem trọn bộ liền mạch' : `Nhấn để phát Tập ${currentEpisodeNumber}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Full Movie Timeline Scrubber (When Full Movie Mode is ON) */}
          {isFullMovieMode && (
            <div className="w-full max-w-[440px] mt-3.5 p-3.5 rounded-2xl glass-panel border border-slate-800/90 shadow-xl">
              <div className="flex items-center justify-between text-[11px] text-slate-300 mb-2 font-mono">
                <span className="text-rose-400 font-bold flex items-center gap-1.5">
                  <ThunderboltFilled className="text-amber-400" />
                  Tập {currentEpisodeNumber}/{totalEpisodes} ({formatTime(currentTotalSeconds)})
                </span>
                <span className="text-slate-400">Tổng thời lượng: {formatTime(estTotalSeconds)}</span>
              </div>

              {/* Progress Slider */}
              <input
                type="range"
                min="0"
                max={estTotalSeconds}
                value={currentTotalSeconds}
                onChange={handleFullMovieSeek}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-400 transition-all"
              />

              {/* Quick Jump Markers for episodes */}
              <div className="flex justify-between items-center mt-1.5 px-0.5 text-[10px] text-slate-500 font-mono font-medium">
                <span>Tập 1</span>
                <span>Tập 15</span>
                <span>Tập 30</span>
                <span>Tập 45</span>
                <span>Tập {totalEpisodes}</span>
              </div>
            </div>
          )}

          {/* Quick Player Bar: Prev / Play / Next / CC / Fullscreen */}
          <div className="w-full max-w-[440px] mt-3.5 flex items-center justify-between gap-2 p-3 rounded-2xl glass-panel border border-slate-800/90 shadow-xl">
            <Button
              icon={<StepBackwardOutlined />}
              disabled={currentEpisodeIndex === 0}
              onClick={handlePrevEpisode}
              className="rounded-xl border-slate-700 bg-slate-900/80 text-slate-200 text-xs font-semibold h-10 px-3 cursor-pointer"
            >
              Tập trước
            </Button>

            <Button
              type="primary"
              icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
              onClick={handlePlayToggle}
              className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 font-bold px-5 text-xs h-10 shadow-lg shadow-rose-600/30 cursor-pointer"
            >
              {isPlaying ? 'Tạm dừng' : `Phát Tập ${currentEpisodeNumber}`}
            </Button>

            <Button
              icon={<StepForwardOutlined />}
              disabled={currentEpisodeIndex + 1 >= episodes.length}
              onClick={handleNextEpisode}
              className="rounded-xl border-slate-700 bg-slate-900/80 text-slate-200 text-xs font-semibold h-10 px-3 cursor-pointer"
            >
              Tập tiếp
            </Button>

            <Tooltip title="Toàn màn hình">
              <button
                onClick={handleFullscreen}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              >
                <FullscreenOutlined className="text-base" />
              </button>
            </Tooltip>
          </div>

          {/* Action Row */}
          <div className="w-full max-w-[440px] mt-3 flex items-center justify-between gap-3 p-3 rounded-2xl glass-panel border border-slate-800/90 shadow-xl">
            <Button
              icon={bookmarked ? <HeartFilled className="text-rose-500" /> : <HeartOutlined />}
              onClick={toggleFavorite}
              className={`rounded-xl border-slate-700 text-xs font-semibold flex-1 h-10 cursor-pointer ${
                bookmarked ? 'bg-rose-950/40 text-rose-300 border-rose-500/40' : 'bg-slate-900/80 text-slate-200'
              }`}
            >
              {bookmarked ? 'Đã lưu trong kho' : 'Lưu vào kho'}
            </Button>

            <Button
              icon={<ShareAltOutlined />}
              onClick={handleShare}
              className="rounded-xl border-slate-700 bg-slate-900/80 text-slate-200 text-xs font-semibold flex-1 h-10 cursor-pointer hover:text-white hover:border-slate-500"
            >
              Chia sẻ liên kết
            </Button>
          </div>
        </div>

        {/* Right Column: Episodes Playlist & Drama Details */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">
          {/* Episodes Playlist Box */}
          <div className="rounded-3xl glass-panel p-5 sm:p-6 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <h3 className="font-extrabold text-white text-base font-display flex items-center gap-2">
                <span>Danh Sách Tập Phim</span>
              </h3>
              <span className="text-xs text-rose-400 font-bold bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 font-mono shadow-sm">
                {totalEpisodes} tập
              </span>
            </div>

            {/* Batch Navigation Tabs (e.g. 1-30, 31-60...) */}
            {episodes.length > BATCH_SIZE && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 scrollbar-none">
                {Array.from({ length: Math.ceil(episodes.length / BATCH_SIZE) }, (_, bIdx) => {
                  const start = bIdx * BATCH_SIZE + 1;
                  const end = Math.min(episodes.length, (bIdx + 1) * BATCH_SIZE);
                  const isActive = bIdx === activeBatchIndex;
                  return (
                    <button
                      key={bIdx}
                      onClick={() => setActiveBatchIndex(bIdx)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/40 ring-1 ring-rose-400'
                          : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {start}–{end}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Episode Number Grid or Loading State */}
            {episodes.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 26, color: '#e11d48' }} spin />} />
                <span className="mt-3 text-xs text-slate-400 font-medium">Đang tải danh sách tập...</span>
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto pr-1 grid grid-cols-5 gap-2 scrollbar-thin">
                {(episodes.length > BATCH_SIZE
                  ? episodes.slice(activeBatchIndex * BATCH_SIZE, (activeBatchIndex + 1) * BATCH_SIZE)
                  : episodes
                ).map((ep, relIdx) => {
                  const idx = (episodes.length > BATCH_SIZE ? activeBatchIndex * BATCH_SIZE : 0) + relIdx;
                  const epNum = ep.number || ep.route_episode_number || (idx + 1);
                  const isActive = idx === currentEpisodeIndex;
                  return (
                    <button
                      key={ep.id || idx}
                      onClick={() => handleSelectEpisode(idx)}
                      className={`h-11 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isActive
                          ? 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-600/50 ring-2 ring-rose-400 transform scale-105'
                          : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <span>{epNum}</span>
                      {isActive && (
                        <span className="text-[8px] uppercase tracking-tighter opacity-90 font-mono">Đang phát</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drama Title & Synopsis */}
          <div className="rounded-3xl glass-panel p-6 border border-slate-800 shadow-2xl">
            {/* Auto-Translation Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 rounded-2xl bg-slate-900/90 border border-slate-750 shadow-inner">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                    isTranslatedActive
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-md shadow-rose-500/10'
                      : 'bg-slate-800 text-slate-400 border border-slate-700/80'
                  }`}
                >
                  <TranslationOutlined className="text-base" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white font-display">Tự Động Dịch Tiếng Việt</span>
                    {isTranslating ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                        <Spin indicator={<LoadingOutlined style={{ fontSize: 11, color: '#fbbf24' }} spin />} /> Đang dịch...
                      </span>
                    ) : isTranslatedActive ? (
                      <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-bold">
                        Đã Dịch
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {autoTranslate
                      ? showOriginal
                        ? 'Đang hiển thị văn bản gốc'
                        : 'Dịch tự động Tiêu đề, Thể loại & Tóm tắt cốt truyện'
                      : 'Chế độ dịch đang tắt'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {translatedData.title && (
                  <button
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                  >
                    {showOriginal ? 'Xem Bản Dịch TV' : 'Xem Bản Gốc'}
                  </button>
                )}
                <Switch
                  checked={autoTranslate}
                  onChange={(checked) => {
                    setAutoTranslate(checked);
                    if (checked) {
                      setShowOriginal(false);
                      message.success('Đã BẬT tự động dịch Tiếng Việt');
                    } else {
                      message.info('Đã TẮT tự động dịch');
                    }
                  }}
                  checkedChildren="BẬT"
                  unCheckedChildren="TẮT"
                  className="bg-slate-700"
                />
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white mb-2 font-display tracking-tight">
              {displayTitle}
            </h1>

            {isTranslatedActive && drama.title && drama.title !== displayTitle && (
              <p className="text-xs text-slate-400 -mt-1 mb-3 italic">
                Tên gốc: <span className="text-slate-300 font-medium">{drama.title}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 text-xs font-bold shadow-sm">
                {displayCategory || drama.category_name}
              </span>
              {displayTags?.map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700/60 px-2.5 py-1 text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <h4 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 mb-2">Tóm tắt nội dung</h4>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line max-h-56 overflow-y-auto pr-1 font-normal">
              {displayDescription || 'Đang cập nhật tóm tắt nội dung cho bộ phim này.'}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}


export default Watch;
