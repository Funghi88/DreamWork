import { useRef, useState } from "react";
import { Square, Circle } from "lucide-react";

interface MeetingRecorderProps {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  onRecordingChange?: (isRecording: boolean) => void;
}

export function MeetingRecorder({ localStream, remoteStreams, onRecordingChange }: MeetingRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const streams = [localStream, ...Object.values(remoteStreams)].filter(Boolean) as MediaStream[];
    if (streams.length === 0) return;

    const videoTrack = localStream?.getVideoTracks()[0] ?? streams[0]?.getVideoTracks()[0];
    const audioTracks = streams.flatMap((s) => s.getAudioTracks()).filter(Boolean);

    const combined = new MediaStream();
    if (videoTrack) combined.addTrack(videoTrack);
    audioTracks.forEach((t) => combined.addTrack(t));

    const recorder = new MediaRecorder(combined);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      onRecordingChange?.(false);
    };

    recorder.start(1000);
    setIsRecording(true);
    onRecordingChange?.(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    onRecordingChange?.(false);
  };

  const download = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    setRecordedBlob(null);
  };

  return (
    <>
      {!isRecording && !recordedBlob && (
        <button type="button" className="live-meeting-control-btn danger" onClick={startRecording} title="Record">
          <Circle size={16} fill="currentColor" />
        </button>
      )}
      {isRecording && (
        <button type="button" className="live-meeting-control-btn danger" onClick={stopRecording} title="Stop recording">
          <Square size={16} />
        </button>
      )}
      {recordedBlob && (
        <button type="button" className="live-meeting-control-btn" onClick={download} title="Download">
          Download
        </button>
      )}
    </>
  );
}
