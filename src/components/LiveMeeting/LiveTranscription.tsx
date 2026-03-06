import { useEffect, useRef, useState } from "react";
import { GlassCard } from "@/components/Glass";
import { Mic, X } from "lucide-react";
import "./LiveTranscription.css";

interface TranscriptionEntry {
  id: string;
  text: string;
  ts: number;
}

interface LiveTranscriptionProps {
  isOpen: boolean;
  onClose: () => void;
  localStream?: MediaStream | null;
}

export function LiveTranscription({ isOpen, onClose }: LiveTranscriptionProps) {
  const [entries, setEntries] = useState<TranscriptionEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
        : null;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const last = e.results.length - 1;
      const result = e.results[last];
      if (result?.isFinal && result[0]?.transcript?.trim()) {
        setEntries((prev) => [
          ...prev,
          { id: `${Date.now()}-${last}`, text: result[0].transcript, ts: Date.now() },
        ]);
      }
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.abort();
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [entries]);

  const toggleListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return;

    if (isListening) {
      rec.stop();
      setIsListening(false);
    } else {
      rec.start();
      setIsListening(true);
    }
  };

  if (!isOpen) return null;

  return (
    <GlassCard className="live-transcription-panel">
      <div className="live-transcription-header">
        <span>Live Transcription</span>
        <button type="button" onClick={onClose} className="live-transcription-close" aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div className="live-transcription-control">
        <button
          type="button"
          onClick={toggleListening}
          className={`live-transcription-mic ${isListening ? "active" : ""}`}
        >
          <Mic size={18} />
          {isListening ? "Listening..." : "Start"}
        </button>
      </div>
      <div ref={listRef} className="live-transcription-list">
        {entries.length === 0 && (
          <div className="live-transcription-empty">
            Click Start to transcribe your speech. Works best in Chrome.
          </div>
        )}
        {entries.map((e) => (
          <div key={e.id} className="live-transcription-entry">
            {e.text}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
