import { GlassCard } from "@/components/Glass";
import { X, MicOff, VideoOff, UserCheck } from "lucide-react";
import "./ParticipantsPanel.css";

interface Participant {
  id: string;
  userName: string;
  stream?: MediaStream;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

interface ParticipantsPanelProps {
  participants: Participant[];
  localName: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function ParticipantsPanel({
  participants,
  localName,
  isMuted,
  isVideoOff,
  isOpen,
  onClose,
}: ParticipantsPanelProps) {
  if (!isOpen) return null;

  const allParticipants = [
    { id: "local", userName: localName || "You", isMuted, isVideoOff },
    ...participants.map((p) => ({
      id: p.id,
      userName: p.userName,
      isMuted: p.isMuted ?? false,
      isVideoOff: p.isVideoOff ?? !p.stream?.getVideoTracks().some((t) => t.enabled),
    })),
  ];

  return (
    <GlassCard className="participants-panel">
      <div className="participants-panel-header">
        <span className="participants-panel-title">
          <UserCheck size={16} />
          Participants ({allParticipants.length})
        </span>
        <button type="button" onClick={onClose} className="participants-panel-close" aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div className="participants-panel-list">
        {allParticipants.map((p) => (
          <div key={p.id} className="participants-panel-item">
            <span className="participants-panel-avatar">{p.userName?.[0]?.toUpperCase() || "?"}</span>
            <span className="participants-panel-name">{p.userName}</span>
            <div className="participants-panel-status">
              {p.isMuted && <MicOff size={12} />}
              {p.isVideoOff && <VideoOff size={12} />}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
