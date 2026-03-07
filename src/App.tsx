import { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { GlassButton } from "@/components/Glass";
import { RecordingControls } from "@/components/RecordingControls";
import { LiveMeetingModal } from "@/components/LiveMeeting/LiveMeetingModal";
import { useWindowSize } from "@/hooks/useWindowSize";
import { Sidebar } from "@/components/Sidebar";
import { CircularWebcam } from "@/components/CircularWebcam";
import type { AvatarDecor, AvatarShape } from "@/components/SettingsPanel";
import {
  initFaceLandmarker,
  drawFaceFilter,
  nextVideoTimestamp,
  type FaceFilterType,
} from "@/lib/faceFilters";
import { beautySettingsToFilter, presets } from "@/lib/beautyEffects";
import { loadSettings, saveSettings, type RecordResolution } from "@/lib/storage";
import { createCircularIcon } from "@/lib/circularIcon";
import { setCompactMode, setNormalMode } from "@/lib/windowUtils";

const RECORD_RESOLUTIONS: Record<RecordResolution, { w: number; h: number }> = {
  "720p": { w: 1280, h: 720 },
  "1080p": { w: 1920, h: 1080 },
  "4K": { w: 3840, h: 2160 },
};

const RECORD_BITRATES: Record<RecordResolution, number> = {
  "720p": 5_000_000,
  "1080p": 10_000_000,
  "4K": 25_000_000,
};
import { ResizeHandle } from "@/components/ResizeHandle";

function formatRecordingTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arcTo(x + w, y, x + w, y + rad, rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  ctx.lineTo(x + rad, y + h);
  ctx.arcTo(x, y + h, x, y + h - rad, rad);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
}

function ClipPreview({
  blob,
  onSave,
  onCopy,
}: {
  blob: Blob;
  onSave: () => void;
  onCopy: () => void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="aspect-video min-w-0 overflow-hidden rounded-xl border">
        <video
          src={url}
          controls
          className="aspect-video h-full w-full object-contain"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="glass-panel rounded-lg border-white/20 bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-md hover:bg-white/30"
          onClick={onSave}
        >
          Save
        </button>
        <button
          type="button"
          className="glass-panel rounded-lg border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-md hover:bg-white/20"
          onClick={onCopy}
        >
          Copy
        </button>
      </div>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function App() {
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const persistentScreenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const compositeRef = useRef<HTMLCanvasElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const portalCameraInnerRef = useRef<HTMLDivElement>(null);
  const avatarImgRef = useRef<HTMLImageElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fullPageContentRef = useRef<HTMLDivElement>(null);
  const excalidrawIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [portalRect, setPortalRect] = useState<DOMRect | null>(null);
  const [mainLayoutPortalRect, setMainLayoutPortalRect] = useState<DOMRect | null>(null);

  const [previewScreenStream, setPreviewScreenStream] = useState<MediaStream | null>(null);
  const [whiteboardScreenStream, setWhiteboardScreenStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showPip, setShowPip] = useState(false);
  const [avatarImageSrc, setAvatarImageSrc] = useState<string | null>(
    () => loadSettings().avatarImageSrc ?? null
  );
  const [avatarSize, setAvatarSize] = useState(() => loadSettings().avatarSize ?? 120);
  const [avatarShape, setAvatarShape] = useState<AvatarShape>(
    () => loadSettings().avatarShape ?? "circle"
  );
  const [avatarDecor, setAvatarDecor] = useState<AvatarDecor>(
    () => loadSettings().avatarDecor ?? "none"
  );
  const [glowColor, setGlowColor] = useState(() => loadSettings().glowColor ?? "#64c8ff");
  const [beautyMode, setBeautyMode] = useState(() => loadSettings().beautyMode ?? false);
  const [beautySettings, setBeautySettings] = useState(() => {
    const s = loadSettings().beautySettings;
    if (s) return s;
    return presets.natural;
  });
  const [faceFilter, setFaceFilter] = useState<FaceFilterType>(
    () => loadSettings().faceFilter ?? "none"
  );
  const [pipPos, setPipPos] = useState(() => {
    const s = loadSettings().pipPos;
    return s ?? { x: 20, y: 20 };
  });
  const [fullPagePipPos, setFullPagePipPos] = useState(() => {
    const s = loadSettings().fullPagePipPos;
    return s ?? { x: 20, y: 20 };
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => loadSettings().sidebarWidth ?? 320);
  const [whiteboardHeight, setWhiteboardHeight] = useState(
    () => loadSettings().whiteboardHeight ?? 220
  );
  const [pipDragging, setPipDragging] = useState(false);
  const pipDraggingRef = useRef(false);
  const pipOffsetRef = useRef({ x: 0, y: 0 });
  const [previewBoxDragging, setPreviewBoxDragging] = useState(false);
  const previewBoxDraggingRef = useRef(false);
  const previewBoxOffsetRef = useRef({ x: 0, y: 0 });
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardInPreview, setWhiteboardInPreview] = useState(false);
  const [showUseInPreviewDialog, setShowUseInPreviewDialog] = useState(false);
  const [fullPageWhiteboard, setFullPageWhiteboard] = useState(false);
  const activeScreenStream = fullPageWhiteboard ? whiteboardScreenStream : previewScreenStream;
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedClips, setRecordedClips] = useState<{ id: number; blob: Blob }[]>([]);
  const clipIdRef = useRef(0);
  const recordingTimeDisplayRef = useRef<HTMLSpanElement | null>(null);
  const recordingTimeElapsedRef = useRef(0);
  const { width } = useWindowSize();
  const isCompact = width < 520;
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
  const [showOutput, setShowOutput] = useState(false);
  const [micVolume, setMicVolume] = useState(() => loadSettings().micVolume ?? 100);
  const [systemVolume, setSystemVolume] = useState(() => loadSettings().systemVolume ?? 80);
  const [recordResolution, setRecordResolution] = useState<RecordResolution>(
    () => loadSettings().recordResolution ?? "1080p"
  );
  const [previewPosition, setPreviewPosition] = useState<
    "top-left" | "top-right" | "bottom-left" | "bottom-right"
  >(() => loadSettings().previewPosition ?? "top-left");
  const [fullPagePreviewPos, setFullPagePreviewPos] = useState<{ x: number; y: number } | null>(
    () => loadSettings().fullPagePreviewPos ?? null
  );
  const [showLiveMeeting, setShowLiveMeeting] = useState(false);

  // Bring window to foreground on launch (macOS often leaves it behind) — only after app has mounted
  useEffect(() => {
    if (typeof window !== "undefined" && "__TAURI__" in window) {
      import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
        getCurrentWindow().setFocus().catch(() => {})
      );
    }
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const drawLoopIdRef = useRef<number | null>(null);
  const faceLandmarkerRef = useRef<Awaited<ReturnType<typeof initFaceLandmarker>> | null>(null);
  const lastLandmarksRef = useRef<import("@mediapipe/tasks-vision").NormalizedLandmark[] | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const recordingStartRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const hasScreen = !!activeScreenStream || !!persistentScreenVideoRef.current?.srcObject;
  const hasCamera = showPip;

  const drawComposite = useCallback(
    (forceRecordRes = false) => {
      const screenVideo = persistentScreenVideoRef.current;
      const cameraVideo = cameraVideoRef.current;
      const composite = compositeRef.current;
      const pip = pipRef.current;
      const avatarImg = avatarImgRef.current;
      const preview = previewRef.current;
      if (!preview || !composite) return;

      const prevW = preview.offsetWidth;
      const prevH = preview.offsetHeight;
      if (prevW <= 0 || prevH <= 0) return;
      const res = RECORD_RESOLUTIONS[recordResolution];
      const useRecordRes = forceRecordRes || isRecording;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = useRecordRes ? res.w : Math.round(prevW * dpr);
      const h = useRecordRes ? res.h : Math.round(prevH * dpr);
      const scaleX = w / prevW;
      const scaleY = h / prevH;

      if (composite.width !== w || composite.height !== h) {
        composite.width = w;
        composite.height = h;
      }
      // Keep display size consistent to avoid shrink/blink when recording starts
      composite.style.width = `${prevW}px`;
      composite.style.height = `${prevH}px`;
      const ctx = composite.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, w, h);
      if (screenVideo?.srcObject && screenVideo.readyState >= 2) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(screenVideo, 0, 0, w, h);
      } else if (useRecordRes && !(fullPageWhiteboard && !activeScreenStream)) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, w, h);
      }

      const useAvatarImage = showPip && !!avatarImageSrc && avatarImg?.complete;
      const useCamera =
        showPip &&
        !useAvatarImage &&
        cameraVideo &&
        cameraVideo.srcObject &&
        cameraVideo.readyState >= 2;
      const pipSource = useAvatarImage ? avatarImg : cameraVideo;

      if ((useAvatarImage || useCamera) && pipSource && pip) {
        const rect = pip.getBoundingClientRect();
        const prevRect = preview.getBoundingClientRect();
        const scale = Math.min(scaleX, scaleY);
        let x = (rect.left - prevRect.left) * scaleX;
        let y = (rect.top - prevRect.top) * scaleY;
        const pw = rect.width * scale;
        const ph = rect.height * scale;
        // When fullPage+activeScreenStream, camera and preview are independent: if camera is outside preview, skip drawing on composite (DOM overlay shows it)
        const buf = 24;
        const pipWellInsidePreview =
          rect.left >= prevRect.left + buf &&
          rect.right <= prevRect.right - buf &&
          rect.top >= prevRect.top + buf &&
          rect.bottom <= prevRect.bottom - buf;
        if (!pipWellInsidePreview && fullPageWhiteboard && activeScreenStream) {
          // Don't draw camera on composite; it's shown by the separate DOM overlay
        } else {
        // Clamp to canvas bounds so camera stays visible when pip is outside preview (non-fullPage case)
        x = Math.max(0, Math.min(x, w - pw));
        y = Math.max(0, Math.min(y, h - ph));
      const isCircle = avatarShape === "circle";

      ctx.save();
      ctx.beginPath();
      if (isCircle) {
        const cx = x + pw / 2;
        const cy = y + ph / 2;
        const r = Math.min(pw, ph) / 2;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      } else {
        roundRectPath(ctx, x, y, pw, ph, Math.min(pw, ph) * 0.2);
      }
      ctx.closePath();
      ctx.clip();
      if (beautyMode) ctx.filter = beautySettingsToFilter(beautySettings);
      if (useAvatarImage && avatarImg && avatarImg.naturalWidth) {
        const scale = Math.max(
          pw / avatarImg.naturalWidth,
          ph / avatarImg.naturalHeight
        );
        const sw = avatarImg.naturalWidth * scale;
        const sh = avatarImg.naturalHeight * scale;
        ctx.drawImage(avatarImg, x - (sw - pw) / 2, y - (sh - ph) / 2, sw, sh);
      } else if (pipSource) {
        const vw =
          pipSource instanceof HTMLVideoElement
            ? pipSource.videoWidth || pw
            : (pipSource as HTMLImageElement).naturalWidth || pw;
        const vh =
          pipSource instanceof HTMLVideoElement
            ? pipSource.videoHeight || ph
            : (pipSource as HTMLImageElement).naturalHeight || ph;
        const scale = Math.max(pw / vw, ph / vh);
        const drawW = vw * scale;
        const drawH = vh * scale;
        const dx = x + (pw - drawW) / 2;
        const dy = y + (ph - drawH) / 2;
        ctx.drawImage(pipSource, 0, 0, vw, vh, dx, dy, drawW, drawH);
        if (faceFilter !== "none" && cameraVideo && faceLandmarkerRef.current) {
          if (beautyMode) ctx.filter = "none";
          try {
            const ts = nextVideoTimestamp();
            const result = faceLandmarkerRef.current.detectForVideo(
              cameraVideo,
              ts
            );
            if (result.faceLandmarks?.[0]) {
              lastLandmarksRef.current = result.faceLandmarks[0];
            }
          } catch {
            /* ignore detection errors */
          }
          if (lastLandmarksRef.current) {
            drawFaceFilter(
              ctx,
              lastLandmarksRef.current,
              faceFilter,
              dx,
              dy,
              drawW,
              drawH
            );
          }
        }
      }
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      if (isCircle) {
        const cx = x + pw / 2;
        const cy = y + ph / 2;
        const r = Math.min(pw, ph) / 2;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      } else {
        roundRectPath(ctx, x, y, pw, ph, Math.min(pw, ph) * 0.2);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = avatarDecor === "simple" ? 4 : 3;
      if (avatarDecor === "dashed") ctx.setLineDash([8, 6]);
      if (avatarDecor === "glow") {
        ctx.shadowColor = hexToRgba(glowColor, 0.6);
        ctx.shadowBlur = 24;
      }
      ctx.stroke();
      ctx.restore();
    }
    }
  },
    [
      showPip,
      avatarImageSrc,
      avatarShape,
      avatarDecor,
      glowColor,
      beautyMode,
      beautySettings,
      faceFilter,
      activeScreenStream,
      cameraStream,
      recordResolution,
      isRecording,
      fullPageWhiteboard,
    ]
  );

  const drawCompositeRef = useRef(drawComposite);
  drawCompositeRef.current = drawComposite;

  const cameraOverlayRef = useRef<HTMLCanvasElement>(null);
  // Hysteresis buffer (px) to prevent flicker when preview box is dragged near camera
  const OVERLAP_BUFFER = 60;
  // Scale preview camera to match whiteboard (180px) so both appear identical
  const PREVIEW_CANONICAL_HEIGHT = 180;
  const avatarSizeDisplayRaw =
    mainLayoutPortalRect && !fullPageWhiteboard && mainLayoutPortalRect.height > PREVIEW_CANONICAL_HEIGHT
      ? Math.min(avatarSize, Math.max(Math.round(avatarSize * 0.85), Math.round(avatarSize * (PREVIEW_CANONICAL_HEIGHT / mainLayoutPortalRect.height))))
      : avatarSize;
  // Slight reduction when at 60 so preview is never bigger than whiteboard camera
  const avatarSizeDisplay = avatarSize <= 60
    ? Math.min(avatarSize, Math.max(48, Math.round(avatarSizeDisplayRaw * 0.95)))
    : avatarSizeDisplayRaw;
  const activePipPos = fullPageWhiteboard ? fullPagePipPos : pipPos;
  const cameraOutsidePreview =
    fullPageWhiteboard &&
    activeScreenStream &&
    portalRect &&
    (activePipPos.x + avatarSize <= portalRect.left + OVERLAP_BUFFER ||
      activePipPos.x >= portalRect.left + 320 - OVERLAP_BUFFER ||
      activePipPos.y + avatarSize <= portalRect.top + OVERLAP_BUFFER ||
      activePipPos.y >= portalRect.top + 180 - OVERLAP_BUFFER);

  const drawCameraOverlay = useCallback(() => {
    const canvas = cameraOverlayRef.current;
    const video = cameraVideoRef.current;
    const img = avatarImgRef.current;
    if (!canvas || (!video?.srcObject && !img?.complete)) return;
    const useAvatarImage = showPip && !!avatarImageSrc && img?.complete;
    const useCamera =
      showPip &&
      !useAvatarImage &&
      video?.srcObject &&
      video.readyState >= 2;
    const pipSource = useAvatarImage ? img : video;
    if (!pipSource || (!useAvatarImage && !useCamera)) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(avatarSize * dpr);
    const h = Math.round(avatarSize * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    canvas.style.width = `${avatarSize}px`;
    canvas.style.height = `${avatarSize}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const pw = avatarSize * dpr;
    const ph = avatarSize * dpr;
    const isCircle = avatarShape === "circle";
    ctx.save();
    ctx.beginPath();
    if (isCircle) {
      ctx.arc(pw / 2, ph / 2, Math.min(pw, ph) / 2, 0, Math.PI * 2);
    } else {
      roundRectPath(ctx, 0, 0, pw, ph, Math.min(pw, ph) * 0.2);
    }
    ctx.closePath();
    ctx.clip();
    if (beautyMode) ctx.filter = beautySettingsToFilter(beautySettings);
    if (useAvatarImage && img?.naturalWidth) {
      const s = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
      const sw = img.naturalWidth * s;
      const sh = img.naturalHeight * s;
      ctx.drawImage(img, (pw - sw) / 2, (ph - sh) / 2, sw, sh);
    } else if (pipSource && video) {
      const vw = video.videoWidth || pw;
      const vh = video.videoHeight || ph;
      const s = Math.max(pw / vw, ph / vh);
      const drawW = vw * s;
      const drawH = vh * s;
      const dx = (pw - drawW) / 2;
      const dy = (ph - drawH) / 2;
      ctx.drawImage(video, 0, 0, vw, vh, dx, dy, drawW, drawH);
      if (faceFilter !== "none" && faceLandmarkerRef.current) {
        if (beautyMode) ctx.filter = "none";
        try {
          const result = faceLandmarkerRef.current.detectForVideo(video, nextVideoTimestamp());
          if (result.faceLandmarks?.[0]) lastLandmarksRef.current = result.faceLandmarks[0];
        } catch {
          /* ignore */
        }
        if (lastLandmarksRef.current) {
          drawFaceFilter(ctx, lastLandmarksRef.current, faceFilter, dx, dy, drawW, drawH);
        }
      }
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    if (isCircle) {
      ctx.arc(pw / 2, ph / 2, Math.min(pw, ph) / 2, 0, Math.PI * 2);
    } else {
      roundRectPath(ctx, 0, 0, pw, ph, Math.min(pw, ph) * 0.2);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = avatarDecor === "simple" ? 4 : 3;
    if (avatarDecor === "dashed") ctx.setLineDash([8, 6]);
    if (avatarDecor === "glow") {
      ctx.shadowColor = hexToRgba(glowColor, 0.6);
      ctx.shadowBlur = 24;
    }
    ctx.stroke();
    ctx.restore();
  }, [
    showPip,
    avatarImageSrc,
    avatarShape,
    avatarDecor,
    glowColor,
    beautyMode,
    beautySettings,
    faceFilter,
    avatarSize,
  ]);

  const drawCameraOverlayRef = useRef(drawCameraOverlay);
  drawCameraOverlayRef.current = drawCameraOverlay;

  useEffect(() => {
    if (!cameraOutsidePreview || !showPip) return;
    let id: number;
    const loop = () => {
      drawCameraOverlayRef.current?.();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [cameraOutsidePreview, showPip]);

  const stopScreenShare = () => {
    if (fullPageWhiteboard) {
      if (whiteboardScreenStream) {
        whiteboardScreenStream.getTracks().forEach((t) => t.stop());
        setWhiteboardScreenStream(null);
      }
    } else {
      if (previewScreenStream) {
        previewScreenStream.getTracks().forEach((t) => t.stop());
        setPreviewScreenStream(null);
      }
    }
  };

  const captureScreen = async () => {
    setCaptureError(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setCaptureError("Screen capture is not available. Use HTTPS or localhost.");
      return;
    }
    const res = RECORD_RESOLUTIONS[recordResolution];
    const videoConstraints = {
      width: { ideal: res.w },
      height: { ideal: res.h },
    };
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: videoConstraints,
        audio: true,
      });
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setPreviewScreenStream((s) => (s === stream ? null : s));
          setWhiteboardScreenStream((w) => (w === stream ? null : w));
        };
      }
      if (fullPageWhiteboard) setWhiteboardScreenStream(stream);
      else setPreviewScreenStream(stream);
    } catch (err: unknown) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: videoConstraints,
        });
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            setPreviewScreenStream((s) => (s === stream ? null : s));
            setWhiteboardScreenStream((w) => (w === stream ? null : w));
          };
        }
        if (fullPageWhiteboard) setWhiteboardScreenStream(stream);
        else setPreviewScreenStream(stream);
      } catch (err2: unknown) {
        const msg =
          err2 instanceof Error ? err2.message : "Permission denied";
        setCaptureError(msg);
      }
    }
  };

  const startCamera = async () => {
    if (avatarImageSrc) {
      setShowPip(true);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCaptureError("Camera is not available. Use HTTPS or localhost.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setShowPip(true);
      setCaptureError(null);
    } catch (err) {
      console.error("Camera failed:", err);
      setCaptureError(err instanceof Error ? err.message : "Camera permission denied");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    if (cameraVideoRef.current?.srcObject) {
      cameraVideoRef.current.srcObject = null;
    }
    setShowPip(false);
    setAvatarImageSrc(null);
  };

  const handleAvatarImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarImageSrc(reader.result as string);
      setShowPip(true);
    };
    reader.readAsDataURL(file);
  };

  const clearAvatarImage = () => {
    setAvatarImageSrc(null);
    if (!cameraStream) setShowPip(false);
  };

  const startRecording = async () => {
    const screenVideo = persistentScreenVideoRef.current;
    let composite = compositeRef.current;
    let preview = previewRef.current;
    const hasContent = activeScreenStream || screenVideo?.srcObject || showPip;
    if (!hasContent) return;
    if (!preview || !composite) return;

    const res = RECORD_RESOLUTIONS[recordResolution];
    composite.width = res.w;
    composite.height = res.h;
    drawComposite(true);

    const loop = () => {
      drawComposite(true);
      drawLoopIdRef.current = requestAnimationFrame(loop);
    };
    drawLoopIdRef.current = requestAnimationFrame(loop);

    const canvasStream = composite.captureStream(30);
    const audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    if (audioCtx.state === "suspended") await audioCtx.resume();
    const dest = audioCtx.createMediaStreamDestination();

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const micSource = audioCtx.createMediaStreamSource(micStream);
      const micGain = audioCtx.createGain();
      micGain.gain.value = micVolume / 100;
      micSource.connect(micGain);
      micGain.connect(dest);
    } catch {
      /* mic not available */
    }

    const screenAudio = activeScreenStream?.getAudioTracks?.()?.[0];
    if (screenAudio) {
      const sysSource = audioCtx.createMediaStreamSource(
        new MediaStream([screenAudio])
      );
      const sysGain = audioCtx.createGain();
      sysGain.gain.value = systemVolume / 100;
      sysSource.connect(sysGain);
      sysGain.connect(dest);
    }

    const mixedTracks = dest.stream.getAudioTracks();
    if (mixedTracks.length) canvasStream.addTrack(mixedTracks[0]);

    const videoBitrate = RECORD_BITRATES[recordResolution];
    const mediaRecorder = new MediaRecorder(canvasStream, {
      videoBitsPerSecond: videoBitrate,
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
    });
    mediaRecorderRef.current = mediaRecorder;
    recordedChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size) recordedChunksRef.current.push(e.data);
    };
    const didResize = !fullPageWhiteboard;
    mediaRecorder.onstop = () => {
      if (drawLoopIdRef.current)
        cancelAnimationFrame(drawLoopIdRef.current);
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      audioCtxRef.current?.close();
      setIsRecording(false);
      setIsRecordingPaused(false);
      if (didResize) void setNormalMode();
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      clipIdRef.current += 1;
      setRecordedClips((prev) =>
        [...prev, { id: clipIdRef.current, blob }].slice(-3)
      );
      setShowOutput(true);
    };

    mediaRecorder.start(1000);
    recordingStartRef.current = Date.now();
    setRecordingTime(0);
    setIsRecording(true);
    // Only resize window when on main layout (not full-page whiteboard)
    if (!fullPageWhiteboard) {
      setCompactMode(previewPosition, 420, 320).catch(() => undefined);
    }
    timerIdRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartRef.current) / 1000);
      recordingTimeElapsedRef.current = elapsed;
      const el = recordingTimeDisplayRef.current;
      if (el) el.textContent = formatRecordingTime(elapsed);
    }, 1000);
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr?.state === "recording" || mr?.state === "paused") {
      mr.stop();
    }
  };

  const pauseRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr?.state === "recording") {
      mr.pause();
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      setRecordingTime(recordingTimeElapsedRef.current);
      setIsRecordingPaused(true);
    }
  };

  const resumeRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr?.state === "paused") {
      mr.resume();
      const elapsed = recordingTime;
      recordingStartRef.current = Date.now() - elapsed * 1000;
      timerIdRef.current = window.setInterval(() => {
        const e = Math.floor((Date.now() - recordingStartRef.current) / 1000);
        recordingTimeElapsedRef.current = e;
        const el = recordingTimeDisplayRef.current;
        if (el) el.textContent = formatRecordingTime(e);
      }, 1000);
      setIsRecordingPaused(false);
    }
  };

  const toggleRecord = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleOpenWhiteboardRequest = () => {
    setShowUseInPreviewDialog(true);
  };

  const openFullPageWhiteboard = () => {
    // Keep previewScreenStream and whiteboardScreenStream — they persist independently per page
    // Align camera: convert pipPos (preview coords) to fullPagePipPos (full-page coords)
    const prev = previewRef.current;
    const content = fullPageContentRef.current;
    if (prev && content) {
      const pr = prev.getBoundingClientRect();
      const cr = content.getBoundingClientRect();
      if (pr.width > 0 && pr.height > 0) {
        setFullPagePipPos({
          x: pipPos.x * (cr.width / pr.width),
          y: pipPos.y * (cr.height / pr.height),
        });
      }
    }
    setFullPageWhiteboard(true);
  };

  const closeFullPageWhiteboard = () => {
    setFullPageWhiteboard(false);
  };

  const handleUseInPreviewChoice = (useInPreview: boolean) => {
    setShowWhiteboard(true);
    setWhiteboardInPreview(useInPreview);
    setShowUseInPreviewDialog(false);
  };

  const handleCloseWhiteboard = () => {
    setShowWhiteboard(false);
    setWhiteboardInPreview(false);
  };

  const downloadRecording = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dreamwork-recording.webm";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyRecording = async (blob: Blob) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "video/webm": blob }),
      ]);
    } catch {
      /* clipboard may not support video */
    }
  };

  // Persistent screen video: always mounted so stream survives layout switches (Whiteboard <-> Preview)
  useEffect(() => {
    const v = persistentScreenVideoRef.current;
    if (!v) return;
    if (activeScreenStream) {
      v.srcObject = activeScreenStream;
      v.play().catch(() => {});
    } else {
      v.srcObject = null;
    }
  }, [activeScreenStream]);

  // Sync layout-specific video from persistent ref for display; drawComposite uses persistent ref
  useEffect(() => {
    const v = screenVideoRef.current;
    if (!v || !activeScreenStream) return;
    v.srcObject = activeScreenStream;
    v.play().catch(() => {});
  }, [activeScreenStream, fullPageWhiteboard]);

  useEffect(() => {
    if (!showPip && activeScreenStream && !isRecording) {
      drawComposite();
    }
  }, [showPip, activeScreenStream, isRecording, drawComposite]);

  // Track rect for full-page portal: preview box when activeScreenStream, else full content
  useLayoutEffect(() => {
    if (!fullPageWhiteboard || !showPip) {
      setPortalRect(null);
      return;
    }
    const el = activeScreenStream ? previewRef.current : fullPageContentRef.current;
    if (!el) return;
    const update = () => {
      const target = activeScreenStream ? previewRef.current : fullPageContentRef.current;
      if (target) setPortalRect(target.getBoundingClientRect());
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [fullPageWhiteboard, showPip, activeScreenStream, fullPagePreviewPos]);

  // Portal main layout camera (iframe or overlay can block events; portal ensures camera receives them)
  useLayoutEffect(() => {
    if (fullPageWhiteboard || !showPip) {
      setMainLayoutPortalRect(null);
      return;
    }
    const el = previewRef.current;
    const update = () => {
      const e = previewRef.current;
      if (e) setMainLayoutPortalRect(e.getBoundingClientRect());
    };
    if (!el) {
      const id = requestAnimationFrame(update);
      return () => cancelAnimationFrame(id);
    }
    update();
    // Run again after paint so rect is ready immediately (fixes ~30s anchor delay)
    const id0 = requestAnimationFrame(update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    // Update on scroll so camera stays aligned when preview scrolls
    let scrollParent: Element | null = el.parentElement;
    while (scrollParent) {
      const { overflowY, overflow } = getComputedStyle(scrollParent);
      if (overflowY === "auto" || overflowY === "scroll" || overflow === "auto" || overflow === "scroll") {
        scrollParent.addEventListener("scroll", update);

        break;
      }
      scrollParent = scrollParent.parentElement;
    }
    // Re-run after layout settles (e.g. when activeScreenStream loads content)
    const t1 = setTimeout(update, 50);
    const t2 = setTimeout(update, 200);
    const t3 = setTimeout(update, 500);
    return () => {
      cancelAnimationFrame(id0);
      ro.disconnect();
      window.removeEventListener("resize", update);
      scrollParent?.removeEventListener("scroll", update);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [fullPageWhiteboard, showPip, activeScreenStream]);

  const faceFilterActiveRef = useRef(false);
  faceFilterActiveRef.current = faceFilter !== "none" && showPip && !avatarImageSrc;

  useEffect(() => {
    if (faceFilterActiveRef.current) {
      initFaceLandmarker()
        .then((lm) => {
          if (faceFilterActiveRef.current) {
            faceLandmarkerRef.current = lm;
          }
        })
        .catch((err) => {
          console.error("[faceFilter] initFaceLandmarker failed:", err);
        });
    } else {
      faceLandmarkerRef.current = null;
      lastLandmarksRef.current = null;
    }
  }, [faceFilter, showPip, avatarImageSrc]);

  // Preview draw loop when face filter is active (not recording)
  // Use ref so loop doesn't restart when drawComposite changes (e.g. during edits)
  useEffect(() => {
    if (isRecording || faceFilter === "none" || !showPip || avatarImageSrc) return;
    let id: number;
    const loop = () => {
      drawCompositeRef.current?.();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [isRecording, faceFilter, showPip, avatarImageSrc]);

  // Draw loop for full-page whiteboard (face filter loop handles face filter case)
  useEffect(() => {
    if (!fullPageWhiteboard || isRecording) return;
    if (!activeScreenStream && !showPip) return;
    if (faceFilter !== "none") return; // face filter loop handles that
    let id: number;
    const loop = () => {
      drawCompositeRef.current?.();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [fullPageWhiteboard, isRecording, activeScreenStream, showPip, faceFilter]);

  // Draw loop for main layout when camera on (screen optional; face filter loop handles face filter case)
  useEffect(() => {
    if (fullPageWhiteboard || isRecording) return;
    if (!showPip || avatarImageSrc) return;
    if (faceFilter !== "none") return; // face filter loop handles that
    let id: number;
    const loop = () => {
      drawCompositeRef.current?.();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [fullPageWhiteboard, isRecording, showPip, avatarImageSrc, faceFilter]);

  const previewScreenStreamRef = useRef(previewScreenStream);
  const whiteboardScreenStreamRef = useRef(whiteboardScreenStream);
  const cameraStreamRef = useRef(cameraStream);
  previewScreenStreamRef.current = previewScreenStream;
  whiteboardScreenStreamRef.current = whiteboardScreenStream;
  cameraStreamRef.current = cameraStream;
  useEffect(() => {
    return () => {
      previewScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
      whiteboardScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Auto-check for updates on startup (Tauri only)
  useEffect(() => {
    if (!isTauri) return;
    const run = async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const { relaunch } = await import("@tauri-apps/plugin-process");
        const update = await check();
        if (update) {
          await update.downloadAndInstall();
          await relaunch();
        }
      } catch {
        // Ignore: no updater config, network error, or not in Tauri
      }
    };
    const t = setTimeout(run, 2000);
    return () => clearTimeout(t);
  }, [isTauri]);

  // Update favicon (circular PNG) and Tauri window icon to avatar when set
  useEffect(() => {
    const setFavicon = (href: string) => {
      document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach((el) => el.remove());
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.sizes = "32x32";
      link.href = href;
      document.head.appendChild(link);
      // Force refresh: briefly change title so browser picks up new favicon
      const t = document.title;
      document.title = "";
      requestAnimationFrame(() => { document.title = t; });
    };

    if (avatarImageSrc) {
      Promise.all([
        createCircularIcon(avatarImageSrc, 32),
        createCircularIcon(avatarImageSrc, 128),
      ])
        .then(([fav, icon]) => {
          setFavicon(fav.dataUrl);
          if (isTauri) {
            import("@tauri-apps/api/window")
              .then(({ getCurrentWindow }) =>
                getCurrentWindow().setIcon(new Uint8Array(icon.arrayBuffer))
              )
              .catch((e) => console.warn("[DreamWork] setIcon failed:", e));
          }
        })
        .catch((e) => console.warn("[DreamWork] createCircularIcon failed:", e));
    } else {
      setFavicon("/logo.png");
      if (isTauri) {
        fetch("/logo.png")
          .then((r) => r.arrayBuffer())
          .then((buf) =>
            import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
              getCurrentWindow().setIcon(new Uint8Array(buf))
            )
          )
          .catch(() => {});
      }
    }
  }, [avatarImageSrc, isTauri]);

  useEffect(() => {
    saveSettings({
      glowColor,
      pipPos,
      fullPagePipPos,
      sidebarWidth,
      whiteboardHeight,
      avatarSize,
      avatarShape,
      avatarDecor,
      avatarImageSrc: avatarImageSrc ?? undefined,
      beautyMode,
      beautySettings,
      faceFilter,
      recordResolution,
      previewPosition,
      fullPagePreviewPos: fullPagePreviewPos ?? undefined,
      micVolume,
      systemVolume,
    });
  }, [
      glowColor,
      pipPos,
      fullPagePipPos,
      sidebarWidth,
      whiteboardHeight,
      avatarSize,
      avatarShape,
      avatarDecor,
      avatarImageSrc,
      beautyMode,
    beautySettings,
      faceFilter,
      recordResolution,
      previewPosition,
      fullPagePreviewPos,
      micVolume,
      systemVolume,
    ]);

  const resetCameraSettings = () => {
    setAvatarSize(120);
    setAvatarShape("circle");
    setAvatarDecor("none");
    setGlowColor("#64c8ff");
    setBeautyMode(false);
    setBeautySettings(presets.natural);
    setFaceFilter("none");
    setMicVolume(100);
    setSystemVolume(80);
    clearAvatarImage();
  };

  const pipPosRef = useRef(pipPos);
  pipPosRef.current = pipPos;
  const fullPagePipPosRef = useRef(fullPagePipPos);
  fullPagePipPosRef.current = fullPagePipPos;

  // Which camera to move: determined from click target so we anchor the top layer, not the one underneath.
  const previewPageContextRef = useRef(!fullPageWhiteboard);
  useLayoutEffect(() => {
    previewPageContextRef.current = !fullPageWhiteboard;
  }, [fullPageWhiteboard]);

  const setContextFromClick = useCallback((clientX: number, clientY: number) => {
    const sidebarPreview = document.getElementById("dreamwork-preview");
    const els = document.elementsFromPoint(clientX, clientY);
    for (const el of els) {
      if (sidebarPreview?.contains(el)) {
        previewPageContextRef.current = true;
        return;
      }
      if (fullPageContentRef.current?.contains(el)) {
        previewPageContextRef.current = false;
        return;
      }
    }
  }, []);

  const avatarSizeDisplayRef = useRef(avatarSize);
  avatarSizeDisplayRef.current = avatarSizeDisplay;

  const handlePipMouseDown = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pipDraggingRef.current) return;
    const pip = pipRef.current;
    const usePreviewPagePos = previewPageContextRef.current;
    const useViewportCoords = !usePreviewPagePos && !!activeScreenStream;
    const container = usePreviewPagePos
      ? previewRef.current
      : (activeScreenStream ? null : fullPageContentRef.current);
    if (!pip) return;
    if (!useViewportCoords && !container) return;
    const pe = e as React.PointerEvent;
    const captureTarget = (pe.pointerId != null && e.currentTarget instanceof HTMLElement) ? e.currentTarget : pip;
    if (pe.pointerId != null && "setPointerCapture" in captureTarget) captureTarget.setPointerCapture(pe.pointerId);
    const iframe = excalidrawIframeRef.current;
    if (iframe) iframe.style.pointerEvents = "none";
    const posRef = usePreviewPagePos ? pipPosRef : fullPagePipPosRef;
    const setPos = usePreviewPagePos ? setPipPos : setFullPagePipPos;
    const pos = posRef.current;
    const rect = useViewportCoords
      ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
      : container!.getBoundingClientRect();
    pipOffsetRef.current = {
      x: e.clientX - (rect.left + pos.x),
      y: e.clientY - (rect.top + pos.y),
    };
    pipDraggingRef.current = true;
    setPipDragging(true);
    const onMove = (ev: PointerEvent | MouseEvent) => {
      const r = useViewportCoords
        ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
        : container!.getBoundingClientRect();
      const { x: ox, y: oy } = pipOffsetRef.current;
      let x = ev.clientX - r.left - ox;
      let y = ev.clientY - r.top - oy;
      const useViewport = !!portalRect || !!mainLayoutPortalRect || useViewportCoords;
      const offset = usePreviewPagePos ? avatarSizeDisplayRef.current / 4 : 0;
      const px = useViewport ? r.left + x - offset : x;
      const py = useViewport ? r.top + y - offset : y;
      (pip as HTMLElement).style.left = `${px}px`;
      (pip as HTMLElement).style.top = `${py}px`;
      posRef.current = { x, y };
    };
    const cleanup = () => {
      if (iframe) iframe.style.pointerEvents = "";
      setPos(posRef.current);
      document.removeEventListener("pointermove", onMoveP);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.removeEventListener("mousemove", onMoveM);
      document.removeEventListener("mouseup", onUp);
      pipDraggingRef.current = false;
      setPipDragging(false);
    };
    const onUp = cleanup;
    const onMoveP = onMove as (ev: PointerEvent) => void;
    const onMoveM = onMove as (ev: MouseEvent) => void;
    document.addEventListener("pointermove", onMoveP);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    document.addEventListener("mousemove", onMoveM);
    document.addEventListener("mouseup", onUp);
  }, [portalRect, mainLayoutPortalRect, activeScreenStream, avatarSize]);

  const handlePreviewBoxDrag = useCallback((e: React.PointerEvent) => {
    if (!fullPageWhiteboard || !activeScreenStream || previewBoxDraggingRef.current) return;
    const preview = previewRef.current;
    const parent = fullPageContentRef.current;
    if (!preview || !parent) return;
    e.preventDefault();
    e.stopPropagation();
    const parentRect = parent.getBoundingClientRect();
    const pos = fullPagePreviewPos ?? {
      x: parentRect.width - 320 - 16,
      y: parentRect.height - 180 - 16,
    };
    previewBoxOffsetRef.current = {
      x: e.clientX - (parentRect.left + pos.x),
      y: e.clientY - (parentRect.top + pos.y),
    };
    setFullPagePreviewPos(pos);
    previewBoxDraggingRef.current = true;
    setPreviewBoxDragging(true);
    const onMove = (ev: PointerEvent | MouseEvent) => {
      const pr = parent.getBoundingClientRect();
      const { x: ox, y: oy } = previewBoxOffsetRef.current;
      let x = ev.clientX - pr.left - ox;
      let y = ev.clientY - pr.top - oy;
      x = Math.max(0, Math.min(x, pr.width - 320));
      y = Math.max(0, Math.min(y, pr.height - 180));
      setFullPagePreviewPos({ x, y });
    };
    const cleanup = () => {
      document.removeEventListener("pointermove", onMove as (ev: PointerEvent) => void);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.removeEventListener("mousemove", onMove as (ev: MouseEvent) => void);
      document.removeEventListener("mouseup", onUp);
      previewBoxDraggingRef.current = false;
      setPreviewBoxDragging(false);
    };
    const onUp = cleanup;
    document.addEventListener("pointermove", onMove as (ev: PointerEvent) => void);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    document.addEventListener("mousemove", onMove as (ev: MouseEvent) => void);
    document.addEventListener("mouseup", onUp);
  }, [fullPageWhiteboard, activeScreenStream, fullPagePreviewPos]);

  const handlePreviewPointerDown = useCallback((e: React.PointerEvent) => {
    if (!showPip || pipDraggingRef.current) return;
    setContextFromClick(e.clientX, e.clientY);
    const pip = pipRef.current;
    const container = fullPageWhiteboard
      ? (activeScreenStream ? previewRef.current : fullPageContentRef.current)
      : previewRef.current;
    if (!container) return;
    const buffer = 40;
    let inCameraBounds: boolean;
    if (pip) {
      const r = pip.getBoundingClientRect();
      inCameraBounds =
        e.clientX >= r.left - buffer && e.clientX <= r.right + buffer &&
        e.clientY >= r.top - buffer && e.clientY <= r.bottom + buffer;
    } else {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pos = fullPageWhiteboard ? fullPagePipPosRef.current : pipPosRef.current;
      inCameraBounds =
        x >= pos.x - buffer && x <= pos.x + avatarSize + buffer &&
        y >= pos.y - buffer && y <= pos.y + avatarSize + buffer;
    }
    // When we have both preview box and camera (fullPage+screen), distinguish: camera vs preview box drag
    if (fullPageWhiteboard && activeScreenStream) {
      if (inCameraBounds) {
        e.preventDefault();
        e.stopPropagation();
        handlePipMouseDown(e as unknown as React.MouseEvent);
      } else {
        handlePreviewBoxDrag(e);
      }
    } else if (!fullPageWhiteboard || inCameraBounds) {
      // Sidebar: any click in preview starts camera drag. FullPage without screen: only when on camera.
      e.preventDefault();
      e.stopPropagation();
      handlePipMouseDown(e as unknown as React.MouseEvent);
    }
  }, [fullPageWhiteboard, activeScreenStream, showPip, avatarSize, handlePipMouseDown, handlePreviewBoxDrag, setContextFromClick]);

  // Native document capture: any click in preview starts drag (bypasses iframe blocking)
  const handlePipMouseDownRef = useRef(handlePipMouseDown);
  handlePipMouseDownRef.current = handlePipMouseDown;
  const handlePreviewPointerDownRef = useRef(handlePreviewPointerDown);
  handlePreviewPointerDownRef.current = handlePreviewPointerDown;
  useEffect(() => {
    if (!showPip) return;
    const handleNative = (e: PointerEvent | MouseEvent) => {
      if (pipDraggingRef.current || previewBoxDraggingRef.current) return;
      if ((e.target as HTMLElement)?.closest?.('[role="dialog"], [data-modal-overlay]')) return;
      const el = (e.target as Node).nodeType === Node.ELEMENT_NODE ? (e.target as HTMLElement) : (e.target as Node).parentElement;
      if (el?.closest?.('[data-dreamwork-no-intercept]')) return;
      if (el?.closest?.('header, button, a, input, select, [role="button"], aside')) return;
      const container = fullPageWhiteboard
        ? (activeScreenStream ? previewRef.current : fullPageContentRef.current)
        : previewRef.current;
      const r = container?.getBoundingClientRect();
      if (!container) return;
      let inPreview =
        e.clientX >= r!.left && e.clientX <= r!.right &&
        e.clientY >= r!.top && e.clientY <= r!.bottom;
      // When camera is portaled, it can be outside the container; include its rect
      if (!inPreview && fullPageWhiteboard) {
        const pip = pipRef.current;
        if (pip) {
          const pr = pip.getBoundingClientRect();
          const buf = 40;
          inPreview =
            e.clientX >= pr.left - buf && e.clientX <= pr.right + buf &&
            e.clientY >= pr.top - buf && e.clientY <= pr.bottom + buf;
        }
      }
      if (!inPreview) return;
      setContextFromClick(e.clientX, e.clientY);
      e.preventDefault();
      e.stopPropagation();
      handlePreviewPointerDownRef.current(e as unknown as React.PointerEvent);
    };
    document.addEventListener("pointerdown", handleNative, { capture: true });
    document.addEventListener("mousedown", handleNative, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", handleNative, { capture: true });
      document.removeEventListener("mousedown", handleNative, { capture: true });
    };
  }, [showPip, fullPageWhiteboard, activeScreenStream, setContextFromClick]);

  useEffect(() => {
    if (pipDragging || previewBoxDragging) {
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      return () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [pipDragging, previewBoxDragging]);

  useEffect(() => {
    const v = cameraVideoRef.current;
    if (v && cameraStream) {
      v.srcObject = cameraStream;
      v.play().catch(() => {});
    }
  }, [cameraStream, fullPageWhiteboard]);

  const applyPreviewPosition = async (pos: typeof previewPosition) => {
    setPreviewPosition(pos);
    if (isRecording) {
      await setCompactMode(pos, 420, 320);
    }
  };

  return (
    <>
      <LiveMeetingModal
        isOpen={showLiveMeeting}
        onClose={() => setShowLiveMeeting(false)}
      />
      {/* Persistent screen video: never unmounts so stream survives Whiteboard <-> Preview navigation */}
      <video
        ref={persistentScreenVideoRef}
        autoPlay
        muted
        playsInline
        className="fixed -z-50 size-0 opacity-0 pointer-events-none"
        aria-hidden
      />
      {/* No standalone hidden video on preview page - CircularWebcam provides the video for drawComposite */}
      {fullPageWhiteboard ? (
      <div className="glass-bg flex h-screen flex-col overflow-hidden">
      <header
        data-dreamwork-no-intercept
        className={`glass-panel sticky top-0 z-50 flex shrink-0 flex-col shadow-sm ${
          isCompact ? "gap-1.5 px-3 py-2" : "gap-2 px-4 py-3"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex shrink-0 items-center gap-2">
              <img
                src={avatarImageSrc ?? "/logo.png"}
                alt="DreamWork"
                className={`rounded-full object-cover ring-2 ring-white/30 ${isCompact ? "size-7" : "size-9"}`}
              />
              <div className="min-w-0">
                <h1 className={`font-semibold tracking-tight truncate ${isCompact ? "text-sm" : "text-lg"}`}>
                  DreamWork
                </h1>
                {!isCompact && (
                  <p className="text-[10px] font-normal text-muted-foreground">
                    Professional Screen Recording Studio
                  </p>
                )}
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1">
              <RecordingControls
                hasScreen={hasScreen}
                hasCamera={hasCamera}
                isRecording={isRecording}
                isRecordingPaused={isRecordingPaused}
                compact={isCompact}
                onCaptureScreen={captureScreen}
                onStopScreenShare={stopScreenShare}
                onToggleCamera={showPip ? stopCamera : startCamera}
                onToggleRecord={toggleRecord}
                onPauseRecording={pauseRecording}
                onResumeRecording={resumeRecording}
                onOpenFullPageWhiteboard={closeFullPageWhiteboard}
                onOpenLiveMeeting={() => setShowLiveMeeting(true)}
                showWhiteboard={true}
              />
              {isRecording && (
                <span ref={recordingTimeDisplayRef} className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatRecordingTime(recordingTime)}
                </span>
              )}
            </div>
            {!isCompact && (
              <div className="flex shrink-0 items-center gap-2">
                <div className="sector-card flex items-center gap-2 rounded-lg px-3 py-1.5 text-[8px] font-semibold">
                  <span className={hasScreen ? "font-semibold text-emerald-600" : "text-muted-foreground"}>
                    {hasScreen ? "✓" : "1."} Screen
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className={hasCamera ? "font-semibold text-emerald-600" : "text-muted-foreground"}>
                    {hasCamera ? "✓" : "2."} Camera
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground">3. Record</span>
                </div>
              </div>
            )}
          </div>
        </header>
        <div ref={fullPageContentRef} className="relative flex-1 min-h-0 sector-card overflow-hidden">
          <iframe
            ref={excalidrawIframeRef}
            src="https://excalidraw.com"
            title="Excalidraw"
            className="absolute inset-0 h-full w-full border-0 z-0"
            style={showPip ? { pointerEvents: "none" } : undefined}
          />
          {/* Composite overlay for camera+filter when no screen (so filter can show) */}
          {showPip && !activeScreenStream && (
            <div
              ref={previewRef}
              className="absolute inset-0 z-[9998]"
              onPointerDownCapture={handlePreviewPointerDown}
            >
              <canvas
                ref={compositeRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              {/* Hit target: 1.5x size, centered on camera */}
              <div
                className="absolute z-10 cursor-grab touch-none"
                style={{
                  left: Math.max(0, fullPagePipPos.x - avatarSize / 4),
                  top: Math.max(0, fullPagePipPos.y - avatarSize / 4),
                  width: avatarSize * 1.5,
                  height: avatarSize * 1.5,
                  touchAction: "none",
                }}
                onMouseDown={handlePipMouseDown}
                onPointerDown={(e) => handlePipMouseDown(e as unknown as React.MouseEvent<HTMLDivElement>)}
                aria-label="Drag to move camera"
              />
            </div>
          )}
          {/* Camera: portal to body for both web and app (iframe blocks events in sibling layout) */}
          {showPip && fullPageWhiteboard && (portalRect || activeScreenStream || (isRecording && !activeScreenStream)) &&
            createPortal(
              <div
                style={{
                  position: "fixed",
                  left: fullPageWhiteboard && activeScreenStream ? fullPagePipPos.x : (portalRect ? portalRect.left + fullPagePipPos.x : fullPagePipPos.x),
                  top: fullPageWhiteboard && activeScreenStream ? fullPagePipPos.y : (portalRect ? portalRect.top + fullPagePipPos.y : fullPagePipPos.y),
                  width: avatarSize,
                  height: avatarSize,
                  zIndex: 99999,
                  ...(cameraOutsidePreview && {
                    backgroundColor: "rgb(15 23 42)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                    borderRadius: avatarShape === "circle" ? "50%" : 8,
                  }),
                }}
                ref={pipRef}
              >
                {/* Canvas overlay: beauty/filter when outside preview; above CircularWebcam (9999) so effects show */}
                {cameraOutsidePreview && (
                  <canvas
                    ref={cameraOverlayRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{
                      borderRadius: avatarShape === "circle" ? "50%" : 8,
                      zIndex: 10000,
                    }}
                  />
                )}
                {/* Drag overlay: on top for pointer events */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    cursor: "grab",
                    zIndex: 10001,
                    borderRadius: avatarShape === "circle" ? "50%" : undefined,
                  }}
                  onMouseDown={handlePipMouseDown}
                  onPointerDown={(e) => handlePipMouseDown(e as unknown as React.MouseEvent<HTMLDivElement>)}
                  aria-label="Drag to move camera"
                />
                <CircularWebcam
                  hidden={
                    ((faceFilter !== "none" && !avatarImageSrc) && !cameraOutsidePreview) || !!activeScreenStream
                  }
                  forceCanvasDisplay={false}
                  useExternalVideo={false}
                  cameraStream={cameraStream}
                  avatarSize={avatarSize}
                  avatarShape={avatarShape}
                  avatarDecor={avatarDecor}
                  glowColor={glowColor}
                  beautyMode={beautyMode}
                  beautyFilter={beautySettingsToFilter(beautySettings)}
                  avatarImageSrc={avatarImageSrc}
                  pipPos={{ x: 0, y: 0 }}
                  onPipMouseDown={handlePipMouseDown}
                  pipRef={portalCameraInnerRef}
                  cameraVideoRef={cameraVideoRef}
                  avatarImgRef={avatarImgRef}
                />
              </div>,
              document.body
            )}
          {showPip && fullPageWhiteboard && !portalRect && !activeScreenStream && (
            <CircularWebcam
              hidden={faceFilter !== "none" && !avatarImageSrc}
              forceCanvasDisplay={false}
              useExternalVideo={false}
              cameraStream={cameraStream}
              avatarSize={avatarSize}
              avatarShape={avatarShape}
              avatarDecor={avatarDecor}
              glowColor={glowColor}
              beautyMode={beautyMode}
              beautyFilter={beautySettingsToFilter(beautySettings)}
              avatarImageSrc={avatarImageSrc}
              pipPos={fullPagePipPos}
              onPipMouseDown={handlePipMouseDown}
              pipRef={pipRef}
              cameraVideoRef={cameraVideoRef}
              avatarImgRef={avatarImgRef}
            />
          )}
          {/* Preview box: when screen captured, shows composed view (screen + camera + filter) */}
          {activeScreenStream && (
            <div
              ref={previewRef}
              className={`absolute z-[9999] h-[180px] w-[320px] overflow-hidden rounded-xl border-2 border-white/30 bg-slate-900 shadow-xl ${
                fullPagePreviewPos ? "" : "bottom-4 right-4"
              } ${previewBoxDragging ? "cursor-grabbing" : "cursor-grab"}`}
              style={fullPagePreviewPos ? { left: fullPagePreviewPos.x, top: fullPagePreviewPos.y } : undefined}
              onPointerDownCapture={handlePreviewPointerDown}
            >
              <video
                ref={screenVideoRef}
                className="block size-full object-contain"
                autoPlay
                muted
                playsInline
                style={{ visibility: showPip ? "hidden" : "visible" }}
                onLoadedData={() => drawComposite()}
              />
              <canvas
                ref={compositeRef}
                className="absolute inset-0 size-full pointer-events-none"
                style={{ visibility: showPip ? "visible" : "hidden" }}
              />
              {/* Hit target: only when camera is relative to preview (not viewport coords); else portaled camera has its own overlay */}
              {showPip && !(fullPageWhiteboard && activeScreenStream) && (
                <div
                  className="absolute z-10 cursor-grab touch-none"
                  style={{
                    left: Math.max(0, pipPos.x - avatarSize / 4),
                    top: Math.max(0, pipPos.y - avatarSize / 4),
                    width: avatarSize * 1.5,
                    height: avatarSize * 1.5,
                    touchAction: "none",
                  }}
                  onMouseDown={handlePipMouseDown}
                  onPointerDown={(e) => handlePipMouseDown(e as unknown as React.MouseEvent<HTMLDivElement>)}
                  aria-label="Drag to move camera"
                />
              )}
            </div>
          )}
        </div>
      </div>
      ) : (
    <div className="glass-bg flex h-screen flex-col overflow-hidden">
      {showUseInPreviewDialog && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 backdrop-blur-sm" data-modal-overlay role="dialog" aria-modal="true">
          <div className="flex flex-col gap-4 rounded-xl border border-black/10 bg-[#fafafa] p-6 shadow-xl">
            <p className="text-sm font-medium text-foreground">Use whiteboard in preview?</p>
            <p className="text-xs text-muted-foreground">
              Yes: overlay on preview for recording. No: keep in sidebar.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-gray-100"
                onClick={() => handleUseInPreviewChoice(false)}
              >
                No
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-gray-100"
                onClick={() => handleUseInPreviewChoice(true)}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      <header
        data-dreamwork-no-intercept
        className={`glass-panel sticky top-0 z-50 flex shrink-0 flex-col shadow-sm ${
          isCompact ? "gap-1.5 px-3 py-2" : "gap-2 px-4 py-3"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex shrink-0 items-center gap-2">
            <img
              src={avatarImageSrc ?? "/logo.png"}
              alt="DreamWork"
              className={`rounded-full object-cover ring-2 ring-white/30 ${isCompact ? "size-7" : "size-9"}`}
            />
            <div className="min-w-0">
              <h1 className={`font-semibold tracking-tight truncate ${isCompact ? "text-sm" : "text-lg"}`}>
                DreamWork
              </h1>
              {!isCompact && (
                <p className="text-[10px] font-normal text-muted-foreground">
                  Professional Screen Recording Studio
                </p>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <RecordingControls
              hasScreen={hasScreen}
              hasCamera={hasCamera}
              isRecording={isRecording}
              isRecordingPaused={isRecordingPaused}
              compact={isCompact}
              onCaptureScreen={captureScreen}
              onStopScreenShare={stopScreenShare}
              onToggleCamera={showPip ? stopCamera : startCamera}
              onToggleRecord={toggleRecord}
              onPauseRecording={pauseRecording}
              onResumeRecording={resumeRecording}
                onOpenFullPageWhiteboard={openFullPageWhiteboard}
                onToggleWhiteboard={() => setShowWhiteboard((v) => !v)}
                onOpenLiveMeeting={() => setShowLiveMeeting(true)}
                showWhiteboard={showWhiteboard}
            />
          </div>
          {!isCompact && (
            <div className="flex shrink-0 items-center gap-2">
              <div className="sector-card flex items-center gap-2 rounded-lg px-3 py-1.5 text-[8px] font-semibold">
                <span className={hasScreen ? "font-semibold text-emerald-600" : "text-muted-foreground"}>
                  {hasScreen ? "✓" : "1."} Screen
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={hasCamera ? "font-semibold text-emerald-600" : "text-muted-foreground"}>
                  {hasCamera ? "✓" : "2."} Camera
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-muted-foreground">3. Record</span>
              </div>
            </div>
          )}
        </div>
        {isRecording && (
          <div className={`flex flex-wrap items-center gap-2 ${isCompact ? "gap-1.5" : ""}`}>
            <div
              className={`flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/20 font-mono tabular-nums backdrop-blur-md ${
                isCompact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
              }`}
            >
              <span className={`rounded-full ${isCompact ? "h-1.5 w-1.5" : "h-2 w-2"} ${isRecordingPaused ? "bg-amber-500" : "animate-pulse bg-red-500"}`} />
              <span ref={recordingTimeDisplayRef}>{formatRecordingTime(recordingTime)}</span>
              <span className="font-medium text-red-600">
                {isRecordingPaused ? "⏸" : "● LIVE"}
              </span>
            </div>
            <div className="flex gap-1">
              {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((pos) => (
                <GlassButton
                  key={pos}
                  variant={previewPosition === pos ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => applyPreviewPosition(pos)}
                >
                  {pos === "top-left" ? "↖" : pos === "top-right" ? "↗" : pos === "bottom-left" ? "↙" : "↘"}
                </GlassButton>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className={`flex flex-1 min-h-0 ${isRecording && isTauri ? "flex-col" : ""}`}>
        <main
          className="flex min-w-0 flex-1 flex-col min-h-0 overflow-auto p-4"
          style={{ minWidth: 200 }}
        >
          <div id="dreamwork-preview" className="sector-card flex flex-1 flex-col overflow-hidden p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </span>
            </div>
            <div
              ref={previewRef}
              className="relative w-full overflow-hidden rounded-xl border border-border/80 bg-slate-900 shadow-lg aspect-video max-h-[calc(100vh-14rem)]"
              onPointerDownCapture={handlePreviewPointerDown}
            >
            {captureError && !showPip && (
              <div className="glass-panel absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6">
                <span className="text-center text-sm">{captureError}</span>
                <span className="text-center text-xs text-muted-foreground">
                  Choose a screen or window in the picker. Grant Screen Recording in
                  System Settings if needed.
                </span>
                <button
                  type="button"
                  className="glass-panel rounded-lg border-white/20 bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-md hover:bg-white/30"
                  onClick={captureScreen}
                >
                  Try again
                </button>
              </div>
            )}
            {!activeScreenStream && !captureError && !showPip && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Capture screen to start
              </div>
            )}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ zIndex: showPip ? 25 : undefined }}
            >
              <video
                ref={screenVideoRef}
                className="block size-full object-contain"
                autoPlay
                muted
                playsInline
                style={{
                  display: activeScreenStream ? "block" : "none",
                  visibility: showPip ? "hidden" : "visible",
                }}
                onLoadedData={() => drawComposite()}
              />
              <canvas
                ref={compositeRef}
                id="composite"
                className="absolute inset-0 pointer-events-none"
                style={{ display: showPip || activeScreenStream ? "block" : "none", zIndex: 1 }}
              />
            </div>
            {showWhiteboard && whiteboardInPreview && (
              <div className="absolute inset-0 z-20 rounded-xl overflow-hidden bg-white">
                <iframe
                  ref={excalidrawIframeRef}
                  src="https://excalidraw.com"
                  title="Excalidraw"
                  className="absolute inset-0 h-full w-full border-0"
                  style={showPip ? { pointerEvents: "none" } : undefined}
                />
              </div>
            )}
            {showPip && mainLayoutPortalRect &&
              createPortal(
                <div
                  style={{
                    position: "fixed",
                    left: mainLayoutPortalRect.left + pipPos.x - avatarSizeDisplay / 4,
                    top: mainLayoutPortalRect.top + pipPos.y - avatarSizeDisplay / 4,
                    width: avatarSizeDisplay * 1.5,
                    height: avatarSizeDisplay * 1.5,
                    zIndex: 99999,
                    cursor: "grab",
                    touchAction: "none",
                  }}
                  ref={pipRef}
                  onMouseDown={handlePipMouseDown}
                  onPointerDown={(e) => handlePipMouseDown(e as unknown as React.MouseEvent<HTMLDivElement>)}
                  aria-label="Drag to move camera"
                >
                  <div
                    style={{
                      position: "absolute",
                      left: avatarSizeDisplay / 4,
                      top: avatarSizeDisplay / 4,
                      width: avatarSizeDisplay,
                      height: avatarSizeDisplay,
                      borderRadius: avatarShape === "circle" ? "50%" : undefined,
                    }}
                  >
                    <CircularWebcam
                    hidden={true}
                    useCanvasForDisplay={isTauri}
                    useImgForDisplay={isTauri}
                    cameraStream={cameraStream}
                    avatarSize={avatarSizeDisplay}
                    avatarShape={avatarShape}
                    avatarDecor={avatarDecor}
                    glowColor={glowColor}
                    beautyMode={beautyMode}
                    beautyFilter={beautySettingsToFilter(beautySettings)}
                    avatarImageSrc={avatarImageSrc}
                    pipPos={{ x: 0, y: 0 }}
                    onPipMouseDown={handlePipMouseDown}
                    pipRef={portalCameraInnerRef}
                    cameraVideoRef={cameraVideoRef}
                    avatarImgRef={avatarImgRef}
                  />
                </div>
                </div>,
                document.body
              )}
            {showPip && !mainLayoutPortalRect && (
              <CircularWebcam
                hidden={true}
                useCanvasForDisplay={isTauri}
                useImgForDisplay={isTauri}
                cameraStream={cameraStream}
                avatarSize={avatarSize}
                avatarShape={avatarShape}
                avatarDecor={avatarDecor}
                glowColor={glowColor}
                beautyMode={beautyMode}
                beautyFilter={beautySettingsToFilter(beautySettings)}
                avatarImageSrc={avatarImageSrc}
                pipPos={pipPos}
                onPipMouseDown={handlePipMouseDown}
                pipRef={pipRef}
                cameraVideoRef={cameraVideoRef}
                avatarImgRef={avatarImgRef}
              />
            )}
            </div>

            {showOutput && recordedClips.length > 0 && (
            <div className="glass-panel mt-4 flex flex-col gap-4 rounded-xl p-4">
              <div className="grid grid-cols-3 gap-4">
                {recordedClips.map(({ id, blob }) => (
                  <ClipPreview
                    key={id}
                    blob={blob}
                    onSave={() => downloadRecording(blob)}
                    onCopy={() => copyRecording(blob)}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {recordedClips.length}/3 clips — save before recording again
              </span>
            </div>
            )}
          </div>
        </main>

        {(!isRecording || !isTauri) && (
          <>
            <ResizeHandle
              direction="horizontal"
              onResize={(d) =>
                setSidebarWidth((w) => Math.max(240, Math.min(600, w - d)))
              }
            />
            <aside
              data-sidebar
              className="flex min-h-0 shrink-0 flex-col overflow-hidden"
              style={{ width: sidebarWidth }}
            >
          <Sidebar
            showWhiteboard={showWhiteboard}
            whiteboardInPreview={whiteboardInPreview}
            whiteboardHeight={whiteboardHeight}
            onWhiteboardHeightChange={setWhiteboardHeight}
            onOpenWhiteboardRequest={handleOpenWhiteboardRequest}
            onCloseWhiteboard={handleCloseWhiteboard}
            onMoveWhiteboardToSidebar={() => setWhiteboardInPreview(false)}
            onToggleWhiteboard={() => setShowWhiteboard((v) => !v)}
            onScrollToPreview={() => {
              document.getElementById("dreamwork-preview")?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
            }}
            showPip={showPip}
            avatarSize={avatarSize}
            onAvatarSizeChange={setAvatarSize}
            avatarShape={avatarShape}
            onAvatarShapeChange={setAvatarShape}
            avatarDecor={avatarDecor}
            onAvatarDecorChange={setAvatarDecor}
            glowColor={glowColor}
            onGlowColorChange={setGlowColor}
            beautyMode={beautyMode}
            onBeautyModeChange={setBeautyMode}
            beautySettings={beautySettings}
            onBeautySettingsChange={setBeautySettings}
            faceFilter={faceFilter}
            onFaceFilterChange={setFaceFilter}
            avatarImageSrc={avatarImageSrc}
            onUseImage={handleAvatarImage}
            onClearImage={clearAvatarImage}
            micVolume={micVolume}
            onMicVolumeChange={setMicVolume}
            systemVolume={systemVolume}
            onSystemVolumeChange={setSystemVolume}
            recordResolution={recordResolution}
            onRecordResolutionChange={setRecordResolution}
            onResetSettings={resetCameraSettings}
          />
            </aside>
          </>
        )}
      </div>
    </div>
      )}
    </>
  );
}
