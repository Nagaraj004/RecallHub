import React from "react";
import { Check, Flame, AlertTriangle, Sparkles, XCircle } from "../icons";

export type ResultType = "forgot" | "difficult" | "partial" | "good" | "easy";

interface ResultBurstProps {
  active: boolean;
  type: ResultType | null;
  label: string;
}

const RESULT_CONFIG: Record<
  ResultType,
  {
    bg: string;
    glow: string;
    border: string;
    textColor: string;
    icon: React.ReactNode;
  }
> = {
  forgot: {
    bg: "rgba(239, 68, 68, 0.95)",
    glow: "rgba(239, 68, 68, 0.6)",
    border: "rgba(252, 165, 165, 0.8)",
    textColor: "#ffffff",
    icon: <XCircle size={48} className="text-white" />,
  },
  difficult: {
    bg: "rgba(245, 158, 11, 0.95)",
    glow: "rgba(245, 158, 11, 0.6)",
    border: "rgba(253, 230, 138, 0.8)",
    textColor: "#ffffff",
    icon: <AlertTriangle size={48} className="text-white" />,
  },
  partial: {
    bg: "rgba(234, 179, 8, 0.95)",
    glow: "rgba(234, 179, 8, 0.6)",
    border: "rgba(254, 240, 138, 0.8)",
    textColor: "#ffffff",
    icon: <Sparkles size={48} className="text-white" />,
  },
  good: {
    bg: "rgba(59, 130, 246, 0.95)",
    glow: "rgba(59, 130, 246, 0.6)",
    border: "rgba(147, 197, 253, 0.8)",
    textColor: "#ffffff",
    icon: <Check size={48} className="text-white" />,
  },
  easy: {
    bg: "rgba(16, 185, 129, 0.95)",
    glow: "rgba(16, 185, 129, 0.6)",
    border: "rgba(110, 231, 183, 0.8)",
    textColor: "#ffffff",
    icon: <Flame size={48} className="text-white" />,
  },
};

export default function ResultBurst({ active, type, label }: ResultBurstProps) {
  if (!active || !type) return null;

  const config = RESULT_CONFIG[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none animate-[fadeIn_150ms_ease-out]">
      {/* Background tinted flash */}
      <div
        className="absolute inset-0 transition-opacity duration-300 backdrop-blur-md"
        style={{
          backgroundColor: config.bg,
          opacity: 0.85,
        }}
      />

      {/* Center bursting badge */}
      <div
        className="relative z-10 flex flex-col items-center justify-center p-8 rounded-3xl animate-[scaleUp_350ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{
          boxShadow: `0 0 80px ${config.glow}, 0 20px 40px rgba(0,0,0,0.5)`,
          border: `2px solid ${config.border}`,
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="p-4 rounded-2xl bg-white/20 mb-3 shadow-inner">
          {config.icon}
        </div>
        <span className="text-3xl font-heading font-bold tracking-tight text-white drop-shadow-md">
          {label}
        </span>
        <span className="text-sm font-medium text-white/80 mt-1 uppercase tracking-wider">
          Score Recorded
        </span>
      </div>
    </div>
  );
}
