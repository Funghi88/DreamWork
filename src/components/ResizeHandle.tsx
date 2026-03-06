import { useRef, useEffect } from "react";

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  direction: "horizontal" | "vertical";
  className?: string;
}

export function ResizeHandle({
  onResize,
  direction,
  className = "",
}: ResizeHandleProps) {
  const ref = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!ref.current) return;
      onResize(direction === "horizontal" ? e.movementX : e.movementY);
    };
    const onUp = () => {
      ref.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [onResize, direction]);

  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    ref.current = true;
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      role="separator"
      aria-orientation={direction}
      onMouseDown={onDown}
      className={`shrink-0 touch-none select-none bg-transparent hover:bg-white/30 transition-colors ${
        direction === "horizontal"
          ? "w-1.5"
          : "h-1.5"
      } ${className}`}
      style={{
        cursor: direction === "horizontal" ? "col-resize" : "row-resize",
      }}
    />
  );
}
