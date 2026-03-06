import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-xl transition-all duration-300",
        className
      )}
    >
      {children}
    </div>
  );
}
