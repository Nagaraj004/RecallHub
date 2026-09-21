import React, { useState } from "react";
import { Star, Loader2, Check } from "../icons";

interface DifficultyRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  variant?: "badge" | "inline" | "form";
  isSaving?: boolean;
  disabled?: boolean;
  className?: string;
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "1/5 • Very Easy",
  2: "2/5 • Easy",
  3: "3/5 • Medium",
  4: "4/5 • Hard",
  5: "5/5 • Very Hard",
};

export default function DifficultyRating({
  value,
  onChange,
  size = "md",
  variant = "badge",
  isSaving = false,
  disabled = false,
  className = "",
}: DifficultyRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const displayRating = hoverRating !== null ? hoverRating : Math.max(1, Math.min(5, value || 1));
  const isInteractive = !!onChange && !disabled;

  const starSizes = {
    sm: 11,
    md: 13,
    lg: 16,
  };

  const handleStarClick = (rating: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isInteractive || isSaving) return;
    onChange(rating);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
    setIsEditing(false);
  };

  if (variant === "form") {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <span className="text-[11px] text-slate-500 dark:text-white/50 font-medium">Difficulty:</span>
        <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Difficulty rating">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= displayRating;
            return (
              <button
                key={star}
                type="button"
                disabled={disabled}
                onClick={(e) => handleStarClick(star, e)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                title={DIFFICULTY_LABELS[star]}
                className="p-1 rounded-md hover:bg-amber-500/15 active:scale-95 transition-all text-amber-500 dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <Star
                  size={starSizes[size]}
                  className={`transition-all duration-150 ${
                    active
                      ? "fill-amber-400 text-amber-500 scale-105"
                      : "text-slate-300 dark:text-white/20 fill-transparent hover:text-amber-300"
                  }`}
                />
              </button>
            );
          })}
        </div>
        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold ml-1">
          {displayRating}/5
        </span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= displayRating;
            return (
              <button
                key={star}
                type="button"
                disabled={!isInteractive || isSaving}
                onClick={(e) => handleStarClick(star, e)}
                onMouseEnter={() => isInteractive && setHoverRating(star)}
                onMouseLeave={() => isInteractive && setHoverRating(null)}
                title={DIFFICULTY_LABELS[star]}
                className={`p-0.5 rounded transition-transform ${
                  isInteractive ? "hover:scale-125 cursor-pointer" : "cursor-default"
                }`}
              >
                <Star
                  size={starSizes[size]}
                  className={`transition-colors ${
                    active
                      ? "fill-amber-400 text-amber-500"
                      : "text-slate-300 dark:text-white/20 fill-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>
        {isSaving ? (
          <Loader2 size={12} className="animate-spin text-amber-500 ml-1" />
        ) : justSaved ? (
          <Check size={12} className="text-emerald-500 ml-1 animate-[fadeIn_200ms_ease-out]" />
        ) : null}
      </div>
    );
  }

  // Default "badge" variant — interactive badge on click or inline star picker
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div
        onClick={() => isInteractive && setIsEditing(!isEditing)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all duration-200 ${
          isInteractive
            ? "cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 active:scale-98 shadow-xs hover:border-amber-500/40"
            : "bg-amber-500/10 border border-amber-500/20"
        } text-amber-600 dark:text-amber-400`}
        title={isInteractive ? "Click to change difficulty rating (1-5)" : `Difficulty ${value}/5`}
      >
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= (hoverRating !== null ? hoverRating : value);
            return (
              <button
                key={star}
                type="button"
                disabled={!isInteractive || isSaving}
                onClick={(e) => handleStarClick(star, e)}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  if (isInteractive) setHoverRating(star);
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  if (isInteractive) setHoverRating(null);
                }}
                className={`p-0.5 rounded transition-transform ${
                  isInteractive ? "hover:scale-125 cursor-pointer focus:outline-none" : "cursor-default"
                }`}
                aria-label={`Set difficulty to ${star}`}
              >
                <Star
                  size={12}
                  className={`transition-all duration-150 ${
                    active
                      ? "fill-amber-400 text-amber-500 scale-105"
                      : "text-slate-300 dark:text-white/25 fill-transparent hover:text-amber-400"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <span className="font-semibold text-[11px] ml-0.5 select-none">
          Difficulty {displayRating}/5
        </span>

        {isSaving ? (
          <Loader2 size={12} className="animate-spin text-amber-500 ml-0.5" />
        ) : justSaved ? (
          <Check size={12} className="text-emerald-500 ml-0.5 animate-[fadeIn_200ms_ease-out]" />
        ) : isInteractive ? (
          <span className="text-[10px] opacity-60 ml-0.5 font-normal">
            (rate)
          </span>
        ) : null}
      </div>
    </div>
  );
}
