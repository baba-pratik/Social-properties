import React, { useRef, useEffect, useState, useCallback } from "react";
import { Volume2, VolumeX, Play, Pause, Maximize } from "lucide-react";

interface ReelPlayerProps {
  src: string;
  poster?: string;
  aspectRatio?: number;
  onEnded?: () => void;
  onError?: () => void;
  onCanPlay?: () => void;
  onPlaying?: () => void;
}

export const ReelPlayer: React.FC<ReelPlayerProps> = ({
  src,
  poster,
  aspectRatio,
  onEnded,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Autoplay with sound strategy
  const attemptAutoplay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = false;
      await video.play();
      setIsPlaying(true);
      setIsMuted(false);
      setShowUnmuteOverlay(false);
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        // fallback to muted autoplay
        video.muted = true;
        try {
          await video.play();
          setIsPlaying(true);
          setIsMuted(true);
          setShowUnmuteOverlay(true);
        } catch (_) {
          setIsPlaying(false);
        }
      } else {
        setIsPlaying(false);
        onError?.();
      }
    }
  }, [onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = src;
    if (poster) video.poster = poster;
    video.load();
    attemptAutoplay();
    return () => {
      video.pause();
      video.src = "";
    };
  }, [src, poster, attemptAutoplay]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onEnd = () => {
      setIsPlaying(false);
      onEnded?.();
    };
    const onErrorHandler = () => onError?.();
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("ended", onEnd);
    video.addEventListener("error", onErrorHandler);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("ended", onEnd);
      video.removeEventListener("error", onErrorHandler);
    };
  }, [onEnded, onError]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
    setShowUnmuteOverlay(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.currentTime = (val / 100) * video.duration;
    setCurrentTime(video.currentTime);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!isFullscreen) {
      video.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (t: number) => {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Hide controls after 3s of inactivity
  const showControls = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 3000);
  };

  return (
    <div
      className="relative w-full h-full bg-black"
      style={{ aspectRatio: aspectRatio ? `${aspectRatio}` : "9/16" }}
      onMouseEnter={showControls}
      onMouseLeave={() => setControlsVisible(false)}
      onTouchStart={showControls}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onClick={togglePlay}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Unmute overlay */}
      {showUnmuteOverlay && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/40 z-20"
          onClick={(e) => {
            e.stopPropagation();
            const video = videoRef.current;
            if (video) {
              video.muted = false;
              video.play();
              setIsMuted(false);
              setShowUnmuteOverlay(false);
              setIsPlaying(true);
            }
          }}
          aria-label="Tap to unmute"
        >
          <div className="bg-white/20 backdrop-blur p-4 rounded-full">
            <Volume2 className="w-10 h-10 text-white" />
          </div>
        </button>
      )}

      {/* Controls overlay */}
      {controlsVisible && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-10">
          <div className="flex items-center gap-2 text-white">
            <button onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <button onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={duration ? (currentTime / duration) * 100 : 0}
              onChange={handleSeek}
              className="flex-1 h-1 appearance-none bg-white/30 accent-emerald-500 rounded"
            />
            <span className="text-xs font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {src && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-30 hidden" id="errorFallback">
          <div className="text-white/70 text-center px-4">Video unavailable</div>
        </div>
      )}
    </div>
  );
};