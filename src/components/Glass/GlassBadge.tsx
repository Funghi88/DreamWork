import { cn } from "@/lib/utils";

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive";
  className?: string;
}

export function GlassBadge({
  children,
  variant = "default",
  className,
}: GlassBadgeProps) {
  const variants = {
    default:
      "border-white/20 bg-white/10 text-foreground backdrop-blur-md",
    success:
      "border-emerald-400/30 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    warning:
      "border-amber-400/30 bg-amber-500/20 text-amber-700 dark:text-amber-300",
    destructive:
      "border-red-400/30 bg-red-500/20 text-red-700 dark:text-red-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium backdrop-blur-md",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
