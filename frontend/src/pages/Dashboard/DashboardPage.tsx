import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDashboard, DashboardData } from "../../api/dashboard";
import { getReviewQueue, ReviewQueue } from "../../api/reviews";
import CountUp from "../../components/common/CountUp";
import PageTransition, { StaggerContainer } from "../../components/common/PageTransition";
import { SkeletonCard } from "../../components/common/SkeletonCard";
import TiltCard from "../../components/common/TiltCard";
import {
  RefreshCw,
  Award,
  Target,
  Flame,
  Zap,
  ArrowRight,
  BookOpen,
  Sparkles,
  Clock,
} from "../../components/icons";

interface StatCardConfig {
  key: keyof DashboardData;
  label: string;
  suffix?: string;
  icon: React.ElementType;
  color: string;
  glowClass: string;
  description: string;
}

const STAT_CARDS: StatCardConfig[] = [
  {
    key: "knowledge_items",
    label: "Knowledge Items",
    icon: BookOpen,
    color: "from-indigo-500 to-blue-500",
    glowClass: "shadow-glow-brand",
    description: "Concepts & notes captured",
  },
  {
    key: "reviews_due",
    label: "Reviews Due",
    icon: Clock,
    color: "from-amber-500 to-orange-500",
    glowClass: "shadow-glow-difficult",
    description: "Pending spaced-recall reviews",
  },
  {
    key: "mastered_topics",
    label: "Mastered Items",
    icon: Award,
    color: "from-emerald-500 to-teal-500",
    glowClass: "shadow-glow-easy",
    description: "Mastery Level 4 or 5",
  },
  {
    key: "recall_accuracy",
    label: "Recall Accuracy",
    suffix: "%",
    icon: Target,
    color: "from-blue-500 to-cyan-500",
    glowClass: "shadow-glow-good",
    description: "Good / Easy recall rate",
  },
  {
    key: "learning_streak",
    label: "Learning Streak",
    suffix: " days",
    icon: Flame,
    color: "from-orange-500 to-red-500",
    glowClass: "shadow-glow-forgot",
    description: "Consecutive active days",
  },
  {
    key: "practice_completed",
    label: "Practice Completed",
    icon: Zap,
    color: "from-purple-500 to-pink-500",
    glowClass: "shadow-glow-leech",
    description: "Interactive exercises solved",
  },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [dash, q] = await Promise.all([getDashboard(), getReviewQueue()]);
        setData(dash);
        setQueue(q);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalReviewsPending = queue
    ? queue.overdue.length + queue.due_today.length
    : data?.reviews_due || 0;

  return (
    <PageTransition className="space-y-6 sm:space-y-8">
      {/* Top Header & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold">
              Dashboard Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/15 text-brand-600 dark:text-brand-300 border border-brand-500/20">
              Active Focus
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60 mt-1">
            Track your retention trajectory, daily queue, and conceptual mastery.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            to="/categories"
            className="glass-btn px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm flex items-center gap-2 text-slate-700 dark:text-white/80 hover:text-slate-950 dark:hover:text-white"
          >
            <BookOpen size={16} />
            <span>Browse Vault</span>
          </Link>
          <Link
            to="/reviews"
            className="glass-btn-primary px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm flex items-center gap-2 shadow-glow-brand"
          >
            <RefreshCw size={16} className={totalReviewsPending > 0 ? "animate-spin" : ""} />
            <span>Review Queue</span>
            {totalReviewsPending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-brand-900 ml-0.5">
                {totalReviewsPending}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Hero Learning Streak & Daily Focus Banner */}
      <div className="glass-panel p-5 sm:p-7 relative overflow-hidden border">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
              <Sparkles size={14} />
              <span>Calibrated Spaced Repetition</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-heading font-bold">
              {totalReviewsPending > 0
                ? `You have ${totalReviewsPending} review${totalReviewsPending === 1 ? "" : "s"} due today.`
                : "Your review queue is clear! Great job retaining knowledge."}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 leading-relaxed">
              Consistently retrieving memory before it fades expands your recall intervals and cements deep understanding.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 bg-white/50 dark:bg-white/[0.06] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-white/10 backdrop-blur-md w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 sm:w-12 h-11 sm:h-12 rounded-xl flex items-center justify-center ${
                  (data?.learning_streak || 0) > 0
                    ? "bg-gradient-to-tr from-amber-500 to-orange-500 shadow-glow-difficult animate-flame"
                    : "bg-black/5 dark:bg-white/10 text-slate-400 dark:text-white/40"
                }`}
              >
                <Flame size={24} className="text-white drop-shadow-sm" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-heading font-bold">
                  {loading ? (
                    <div className="skeleton-glass h-7 w-12 rounded" />
                  ) : (
                    <CountUp end={data?.learning_streak || 0} suffix=" Days" />
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-white/50 font-medium">Daily Learning Streak</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 6 Glass Stat Cards (3 col desktop, 2 col tablet, 1 col mobile) */}
      <div>
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-3 sm:mb-4 flex items-center gap-2">
          <span>Mastery Metrics</span>
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {STAT_CARDS.map((card) => {
              const Icon = card.icon;
              const val = data ? (data[card.key] as number) : 0;
              const isStreak = card.key === "learning_streak";

              return (
                <TiltCard
                  key={card.key}
                  className="glass-card p-4 sm:p-5 group hover:border-brand-500/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-slate-500 dark:text-white/60 block">{card.label}</span>
                      <div className="text-2xl sm:text-3xl font-heading font-bold flex items-center gap-2">
                        <CountUp
                          end={val}
                          decimals={card.key === "recall_accuracy" ? 1 : 0}
                          suffix={card.suffix || ""}
                        />
                        {isStreak && val > 0 && (
                          <Flame size={20} className="text-orange-500 animate-flame inline" />
                        )}
                      </div>
                    </div>

                    <div
                      className={`w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-sm border border-white/20 group-hover:scale-110 transition-transform duration-200`}
                    >
                      <Icon size={18} />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-white/40 mt-3 pt-3 border-t border-slate-200/60 dark:border-white/[0.08] flex items-center justify-between">
                    <span>{card.description}</span>
                    <ArrowRight
                      size={12}
                      className="text-slate-400 dark:text-white/30 group-hover:text-brand-500 dark:group-hover:text-white/80 group-hover:translate-x-0.5 transition-all"
                    />
                  </p>
                </TiltCard>
              );
            })}
          </StaggerContainer>
        )}
      </div>

      {/* Up Next in Queue Section */}
      {queue && (queue.overdue.length > 0 || queue.due_today.length > 0) && (
        <div className="glass-panel p-5 sm:p-6 border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-500 dark:text-amber-400" />
              <h3 className="font-heading font-semibold text-base sm:text-lg">
                Immediate Review Queue
              </h3>
            </div>
            <Link
              to="/reviews"
              className="text-xs font-medium text-brand-600 dark:text-brand-300 hover:underline flex items-center gap-1"
            >
              <span>View all ({totalReviewsPending})</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...queue.overdue, ...queue.due_today].slice(0, 4).map((item) => (
              <div
                key={item.knowledge_id}
                className="glass-card p-3.5 flex items-center justify-between gap-3 hover:border-brand-500/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold truncate">
                    {item.knowledge_title}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-white/50 truncate mt-0.5">
                    {item.question_text || "Spaced recall question"}
                  </p>
                </div>
                {item.question_id && (
                  <button
                    onClick={() =>
                      navigate(`/recall/${item.question_id}`, {
                        state: {
                          question: {
                            id: item.question_id,
                            question_text: item.question_text,
                            knowledge_id: item.knowledge_id,
                          },
                          knowledgeTitle: item.knowledge_title,
                        },
                      })
                    }
                    className="glass-btn-primary px-3 py-1.5 text-xs font-medium shrink-0 flex items-center gap-1 shadow-none"
                  >
                    <span>Recall</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
