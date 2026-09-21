import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DueItem, ReviewQueue, getReviewQueue } from "../../api/reviews";
import PageTransition from "../../components/common/PageTransition";
import { SkeletonCard } from "../../components/common/SkeletonCard";
import {
  Clock,
  AlertTriangle,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "../../components/icons";

interface BucketProps {
  title: string;
  count: number;
  badge: string;
  tintClass: string;
  borderClass: string;
  icon: React.ReactNode;
  items: DueItem[];
  isOverdue?: boolean;
  onPractice: (item: DueItem) => void;
}

function BucketPanel({
  title,
  count,
  badge,
  tintClass,
  borderClass,
  icon,
  items,
  isOverdue,
  onPractice,
}: BucketProps) {
  return (
    <div
      className={`glass-panel p-4 sm:p-5 flex flex-col h-[320px] sm:h-[340px] border ${borderClass} ${tintClass} transition-all duration-300 relative overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-heading font-semibold text-sm sm:text-base">
            {title}
          </h2>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            count > 0 ? "bg-black/10 dark:bg-white/20 text-slate-800 dark:text-white" : "bg-black/5 dark:bg-white/5 text-slate-400 dark:text-white/40"
          }`}
        >
          {count}
        </span>
      </div>

      {/* Items Container with Layout / Reflow support */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-white/40 text-xs">
            <CheckCircle2 size={24} className="mb-1.5 text-emerald-500/60 dark:text-emerald-400/50" />
            <span>{badge}</span>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.knowledge_id}
              className={`glass-card p-3 flex items-center justify-between gap-3 hover:border-brand-500/40 transition-all duration-200 group ${
                isOverdue ? "animate-pulse-subtle border-red-400/30" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <Link
                  to={`/knowledge/${item.knowledge_id}`}
                  className="text-xs sm:text-sm font-semibold hover:text-brand-500 transition-colors block truncate"
                >
                  {item.knowledge_title}
                </Link>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-white/50">
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">
                    {item.question_text || "Spaced review"}
                  </span>
                  <span>•</span>
                  <span>{item.interval_days}d interval</span>
                </div>
              </div>

              {item.question_id && (
                <button
                  onClick={() => onPractice(item)}
                  className="glass-btn-primary px-3 py-1.5 text-xs font-semibold shrink-0 flex items-center gap-1 shadow-none group-hover:scale-105 transition-transform"
                >
                  <span>Review</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ReviewQueuePage() {
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const q = await getReviewQueue();
        setQueue(q);
      } catch (err) {
        console.error("Failed to load review queue:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handlePractice(item: DueItem) {
    if (!item.question_id) return;
    navigate(`/recall/${item.question_id}`, {
      state: {
        question: {
          id: item.question_id,
          question_text: item.question_text,
          knowledge_id: item.knowledge_id,
        },
        knowledgeTitle: item.knowledge_title,
      },
    });
  }

  function handleStartBatch() {
    if (!queue) return;
    const nextItem = [...queue.overdue, ...queue.due_today, ...queue.leeches][0];
    if (nextItem) {
      handlePractice(nextItem);
    }
  }

  const totalActionable = queue
    ? queue.overdue.length + queue.due_today.length + queue.leeches.length
    : 0;

  return (
    <PageTransition className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold">
              Review Queue
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/15 text-brand-600 dark:text-brand-300 border border-brand-500/20">
              SM-2 Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60 mt-1">
            Categorized review buckets to maintain optimal memory retention curves.
          </p>
        </div>

        {totalActionable > 0 && (
          <button
            onClick={handleStartBatch}
            className="glass-btn-primary px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-glow-brand self-start sm:self-auto"
          >
            <Zap size={16} />
            <span>Start Review Session ({totalActionable})</span>
          </button>
        )}
      </div>

      {/* 2x2 Grid on md+, 1 Column on Mobile */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="h-[320px] sm:h-[340px]" />
          ))}
        </div>
      ) : queue ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* 1. Overdue Bucket (Red Tinted) */}
          <BucketPanel
            title="Overdue"
            count={queue.overdue.length}
            badge="No overdue items! Retention schedule is optimal."
            tintClass="bg-red-500/[0.04] dark:bg-red-950/20"
            borderClass="border-red-500/30"
            icon={<Clock size={18} className="text-red-500 dark:text-red-400" />}
            items={queue.overdue}
            isOverdue={queue.overdue.length > 0}
            onPractice={handlePractice}
          />

          {/* 2. Due Today Bucket (Amber Tinted) */}
          <BucketPanel
            title="Due Today"
            count={queue.due_today.length}
            badge="All of today's reviews are completed!"
            tintClass="bg-amber-500/[0.04] dark:bg-amber-950/20"
            borderClass="border-amber-500/30"
            icon={<Sparkles size={18} className="text-amber-500 dark:text-amber-400" />}
            items={queue.due_today}
            onPractice={handlePractice}
          />

          {/* 3. Upcoming Bucket (Green Tinted) */}
          <BucketPanel
            title="Upcoming"
            count={queue.upcoming.length}
            badge="Upcoming reviews will appear here as dates approach."
            tintClass="bg-emerald-500/[0.04] dark:bg-emerald-950/20"
            borderClass="border-emerald-500/30"
            icon={<Calendar size={18} className="text-emerald-500 dark:text-emerald-400" />}
            items={queue.upcoming}
            onPractice={handlePractice}
          />

          {/* 4. Leeches Bucket (Purple Tinted with Warning Icon) */}
          <BucketPanel
            title="Leeches (3+ Forgotten)"
            count={queue.leeches.length}
            badge="No leech items detected. Your mental models are clear!"
            tintClass="bg-purple-500/[0.04] dark:bg-purple-950/20"
            borderClass="border-purple-500/30"
            icon={<AlertTriangle size={18} className="text-purple-500 dark:text-purple-400" />}
            items={queue.leeches}
            onPractice={handlePractice}
          />
        </div>
      ) : null}
    </PageTransition>
  );
}
