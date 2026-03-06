import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function GlassButton({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: GlassButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    primary:
      "border border-white/30 bg-white/20 text-foreground backdrop-blur-md hover:bg-white/30",
    secondary:
      "border border-white/20 bg-white/10 text-foreground backdrop-blur-md hover:bg-white/20",
    ghost:
      "border border-transparent bg-transparent text-foreground hover:bg-white/10",
    destructive:
      "border border-red-400/40 bg-red-500/20 text-red-700 backdrop-blur-md hover:bg-red-500/30 dark:text-red-300",
  };
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-9 px-4 text-sm",
    lg: "h-10 px-5 text-base",
  };
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
