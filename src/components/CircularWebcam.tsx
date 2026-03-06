import { useEffect, useRef, useState } from "react";
import type { AvatarShape, AvatarDecor } from "./SettingsPanel";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface CircularWebcamProps {
  hidden?: boolean;
  /** When true, hide the video so canvas composite shows through */
  forceCanvasDisplay?: boolean;
  /** When true, don't render video - external ref (e.g. persistent video) is used for drawing */
  useExternalVideo?: boolean;
  /** When true, draw video to canvas for display (fixes WebView video rendering) */
  useCanvasForDisplay?: boolean;
  /** When useCanvasForDisplay, draw from this video ref (e.g. hidden video in main DOM) */
  externalVideoRef?: React.RefObject<HTMLVideoElement | null>;
  /** When true with useCanvasForDisplay, display via img (toDataURL) - workaround for WebView canvas */
  useImgForDisplay?: boolean;
  /** Camera stream - set directly so video works when component mounts in any layout */
  cameraStream?: MediaStream | null;
  avatarSize: number;
  avatarShape: AvatarShape;
  avatarDecor: AvatarDecor;
  glowColor: string;
  beautyMode: boolean;
  beautyFilter: string;
  avatarImageSrc: string | null;
  pipPos: { x: number; y: number };
  onPipMouseDown: (e: React.MouseEvent) => void;
  pipRef: React.RefObject<HTMLDivElement | null>;
  cameraVideoRef?: React.Ref<HTMLVideoElement | null>;
  avatarImgRef: React.RefObject<HTMLImageElement | null>;
}

export function CircularWebcam({
  hidden,
  forceCanvasDisplay = false,
  useExternalVideo: _useExternalVideo = false,
  useCanvasForDisplay = false,
  useImgForDisplay = false,
  externalVideoRef,
  cameraStream,
  avatarSize,
  avatarShape,
  avatarDecor,
  glowColor,
  beautyMode,
  beautyFilter,
  avatarImageSrc,
  pipPos,
  onPipMouseDown,
  pipRef,
  cameraVideoRef,
  avatarImgRef,
}: CircularWebcamProps) {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  useEffect(() => {
    const el = videoElRef.current;
    if (el && cameraStream) {
      el.srcObject = cameraStream;
      el.play().catch(() => {});
    }
  }, [cameraStream]);

  // Canvas draw loop when useCanvasForDisplay (fixes WebView video not rendering)
  useEffect(() => {
    if (!useCanvasForDisplay || avatarImageSrc) return;
    const video = externalVideoRef?.current ?? videoElRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraStream) return;
    let id: number;
    let frameCount = 0;
    const draw = () => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          ctx.drawImage(video, 0, 0);
          if (useImgForDisplay && (frameCount++ % 3 === 0)) {
            try {
              const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
              setImgSrc(dataUrl);
            } catch {
              /* ignore */
            }
          }
        }
      }
      id = requestAnimationFrame(draw);
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [useCanvasForDisplay, useImgForDisplay, cameraStream, avatarImageSrc, externalVideoRef]);

  const shapeClass = avatarShape === "circle" ? "rounded-full" : "rounded-2xl";
  const borderClass =
    avatarDecor === "simple"
      ? "border-4 border-white"
      : avatarDecor === "dashed"
        ? "border border-dashed border-white"
        : "border-[3px] border-white/90";
  const shadowClass =
    avatarDecor === "glow"
      ? ""
      : avatarDecor === "none"
        ? "shadow-lg"
        : "shadow-md";

  return (
    <div
      ref={pipRef}
      className={`absolute overflow-hidden cursor-grab touch-none select-none z-[100] ${shapeClass} ${borderClass} ${shadowClass}`}
      style={{
        touchAction: "none",
        left: pipPos.x,
        top: pipPos.y,
        width: avatarSize,
        height: avatarSize,
        opacity: hidden || forceCanvasDisplay ? 0.01 : 1,
        pointerEvents: "auto",
        zIndex: 9999,
        ...(avatarDecor === "glow" && {
          boxShadow: `0 0 24px ${hexToRgba(glowColor, 0.6)}, inset 0 0 12px rgba(255,255,255,0.1)`,
        }),
      }}
      onMouseDown={onPipMouseDown}
      onPointerDown={(e) => onPipMouseDown(e as unknown as React.MouseEvent<HTMLDivElement>)}
    >
      {/* Drag handle - circular when avatar is circle, else rectangular */}
      <div
        className={`absolute bottom-0 right-0 z-10 cursor-grab active:cursor-grabbing ${avatarShape === "circle" ? "rounded-full" : ""}`}
        style={{ width: "40%", height: "40%", minWidth: 24, minHeight: 24 }}
        onMouseDown={onPipMouseDown}
        onPointerDown={(e) => onPipMouseDown(e as unknown as React.MouseEvent<HTMLDivElement>)}
        aria-label="Drag to move camera"
      />
      {avatarImageSrc ? (
        <img
          ref={avatarImgRef}
          src={avatarImageSrc}
          alt=""
          className="pointer-events-none absolute inset-0 w-full h-full object-cover"
          style={beautyMode ? { filter: beautyFilter } : undefined}
          draggable={false}
        />
      ) : useCanvasForDisplay ? (
        <>
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 w-full h-full object-cover"
            style={useImgForDisplay ? { display: "none" } : beautyMode ? { filter: beautyFilter } : undefined}
          />
          {useImgForDisplay && imgSrc && (
            <img
              ref={imgRef}
              src={imgSrc}
              alt=""
              className="pointer-events-none absolute inset-0 w-full h-full object-cover"
              style={beautyMode ? { filter: beautyFilter } : undefined}
              draggable={false}
            />
          )}
        </>
      ) : (
        <video
          ref={(el) => {
            videoElRef.current = el;
            if (cameraVideoRef) {
              if (typeof cameraVideoRef === "function") {
                cameraVideoRef(el);
              } else {
                (cameraVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
              }
            }
            if (el && cameraStream) {
              el.srcObject = cameraStream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          muted
          playsInline
          className="pointer-events-none absolute inset-0 w-full h-full object-cover"
          style={beautyMode ? { filter: beautyFilter } : undefined}
          draggable={false}
        />
      )}
    </div>
  );
}
