import { GlassButton } from "@/components/Glass";
import { Video } from "lucide-react";

interface RecordingControlsProps {
  hasScreen: boolean;
  hasCamera: boolean;
  isRecording: boolean;
  isRecordingPaused?: boolean;
  compact?: boolean;
  onCaptureScreen: () => void;
  onStopScreenShare?: () => void;
  onToggleCamera: () => void;
  onToggleRecord: () => void;
  onPauseRecording?: () => void;
  onResumeRecording?: () => void;
  onToggleWhiteboard?: () => void;
  onOpenFullPageWhiteboard?: () => void;
  onOpenLiveMeeting?: () => void;
  showWhiteboard: boolean;
}

export function RecordingControls({
  hasScreen,
  hasCamera,
  isRecording,
  isRecordingPaused = false,
  compact = false,
  onCaptureScreen,
  onStopScreenShare,
  onToggleCamera,
  onToggleRecord,
  onPauseRecording,
  onResumeRecording,
  onToggleWhiteboard,
  onOpenFullPageWhiteboard,
  onOpenLiveMeeting,
  showWhiteboard,
}: RecordingControlsProps) {
  const recordingCompact = compact && isRecording;

  return (
    <div className="flex flex-wrap items-center gap-2 [&_button]:text-[12px] [&_button]:font-semibold">
      {!recordingCompact && (
        <>
          <GlassButton
            variant={hasScreen ? "primary" : "secondary"}
            onClick={hasScreen && onStopScreenShare ? onStopScreenShare : onCaptureScreen}
            size="sm"
          >
            {hasScreen ? (compact ? "Stop share" : "Stop sharing") : (compact ? "Capture" : "Capture Screen")}
          </GlassButton>
          <GlassButton
            variant={hasCamera ? "primary" : "secondary"}
            onClick={onToggleCamera}
            size="sm"
          >
            {compact ? (hasCamera ? "Stop Cam" : "Camera") : hasCamera ? "Stop Camera" : "Start Camera"}
          </GlassButton>
        </>
      )}
      <GlassButton
        variant={isRecording ? "primary" : "destructive"}
        size="sm"
        disabled={!hasScreen && !hasCamera}
        onClick={onToggleRecord}
        title={!hasScreen && !hasCamera ? "Capture screen or start camera first" : undefined}
      >
        {isRecording ? "Stop" : compact ? "Start" : "Start Recording"}
      </GlassButton>
      {isRecording && onPauseRecording && onResumeRecording && (
        <GlassButton
          variant="secondary"
          size="sm"
          onClick={isRecordingPaused ? onResumeRecording : onPauseRecording}
        >
          {isRecordingPaused ? "Resume" : "Pause"}
        </GlassButton>
      )}
      {!compact && (
        <>
          <span className="text-muted-foreground/50">│</span>
          <GlassButton
            variant={showWhiteboard ? "primary" : "secondary"}
            onClick={onOpenFullPageWhiteboard ?? onToggleWhiteboard}
            size="sm"
          >
            Whiteboard
          </GlassButton>
          {onOpenLiveMeeting && (
            <GlassButton variant="secondary" size="sm" onClick={onOpenLiveMeeting}>
              <Video size={14} />
              Live Meeting
            </GlassButton>
          )}
        </>
      )}
    </div>
  );
}
