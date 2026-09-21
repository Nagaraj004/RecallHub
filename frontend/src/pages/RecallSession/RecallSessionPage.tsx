import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { RecallQuestion, RecallResult, submitRecall } from "../../api/recall";
import { Knowledge, getKnowledge } from "../../api/knowledge";
import PageTransition from "../../components/common/PageTransition";
import ResultBurst, { ResultType } from "../../components/common/ResultBurst";
import {
  Sparkles,
  ArrowLeft,
  Eye,
  RotateCcw,
} from "../../components/icons";

interface ResultOption {
  value: RecallResult;
  label: string;
  sublabel: string;
  emoji: string;
  colorClass: string;
  glowClass: string;
  borderClass: string;
}

const RESULT_OPTIONS: ResultOption[] = [
  {
    value: "forgot",
    label: "Forgot",
    sublabel: "Reset interval",
    emoji: "😵",
    colorClass: "hover:bg-red-500/20 text-red-500 dark:text-red-300",
    glowClass: "shadow-glow-forgot",
    borderClass: "border-red-500/30 hover:border-red-500",
  },
  {
    value: "difficult",
    label: "Difficult",
    sublabel: "Hard retrieval",
    emoji: "😐",
    colorClass: "hover:bg-amber-500/20 text-amber-600 dark:text-amber-300",
    glowClass: "shadow-glow-difficult",
    borderClass: "border-amber-500/30 hover:border-amber-500",
  },
  {
    value: "partial",
    label: "Partial",
    sublabel: "Key points recalled",
    emoji: "🙂",
    colorClass: "hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-300",
    glowClass: "shadow-glow-partial",
    borderClass: "border-yellow-500/30 hover:border-yellow-500",
  },
  {
    value: "good",
    label: "Good",
    sublabel: "Smooth recall",
    emoji: "😊",
    colorClass: "hover:bg-blue-500/20 text-blue-600 dark:text-blue-300",
    glowClass: "shadow-glow-good",
    borderClass: "border-blue-500/30 hover:border-blue-500",
  },
  {
    value: "easy",
    label: "Easy",
    sublabel: "Instant mastery",
    emoji: "🔥",
    colorClass: "hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300",
    glowClass: "shadow-glow-easy",
    borderClass: "border-emerald-500/30 hover:border-emerald-500",
  },
];

const CONFIDENCE_LEVELS = [
  { val: 1, label: "Complete guess" },
  { val: 2, label: "Uncertain" },
  { val: 3, label: "Somewhat confident" },
  { val: 4, label: "Confident" },
  { val: 5, label: "Absolute certainty" },
];

export default function RecallSessionPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation() as {
    state?: { question?: RecallQuestion; knowledgeTitle?: string };
  };
  const navigate = useNavigate();

  const [question, setQuestion] = useState<RecallQuestion | null>(location.state?.question || null);
  const [knowledgeTitle, setKnowledgeTitle] = useState<string>(location.state?.knowledgeTitle || "");
  const [knowledgeDetails, setKnowledgeDetails] = useState<Knowledge | null>(null);

  const [userAnswer, setUserAnswer] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Result flash state
  const [burstActive, setBurstActive] = useState(false);
  const [burstType, setBurstType] = useState<ResultType | null>(null);
  const [burstLabel, setBurstLabel] = useState("");

  useEffect(() => {
    if (!id) return;
    if (question?.knowledge_id) {
      getKnowledge(question.knowledge_id)
        .then((k) => {
          setKnowledgeDetails(k);
          if (!knowledgeTitle) setKnowledgeTitle(k.title);
        })
        .catch(() => {});
    }
  }, [id, question, knowledgeTitle]);

  if (!id) {
    return (
      <PageTransition className="max-w-lg mx-auto text-center py-12">
        <div className="glass-panel p-6 space-y-4">
          <p className="text-sm text-slate-500 dark:text-white/60">No recall question ID specified.</p>
          <Link to="/reviews" className="glass-btn-primary px-4 py-2 inline-flex items-center gap-2">
            <ArrowLeft size={16} />
            <span>Go to Review Queue</span>
          </Link>
        </div>
      </PageTransition>
    );
  }

  async function handleScore(result: RecallResult, label: string) {
    if (submitting) return;
    setSubmitting(true);
    setBurstType(result as ResultType);
    setBurstLabel(label);
    setBurstActive(true);

    try {
      await submitRecall({
        question_id: id!,
        user_answer: userAnswer || undefined,
        confidence_before_reveal: confidence ?? undefined,
        result,
      });

      // 420ms feedback delay before transition
      setTimeout(() => {
        navigate("/reviews");
      }, 420);
    } catch (err) {
      console.error("Failed to submit recall:", err);
      setBurstActive(false);
      setSubmitting(false);
    }
  }

  return (
    <PageTransition className="max-w-2xl mx-auto space-y-5 sm:space-y-6">
      {/* Fullscreen Result Flash Overlay */}
      <ResultBurst active={burstActive} type={burstType} label={burstLabel} />

      {/* Top Breadcrumb & Status */}
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Exit Session</span>
        </button>

        <div className="flex items-center gap-2 text-slate-500 dark:text-white/50">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium">Active Retrieval Mode</span>
        </div>
      </div>

      {/* Hero 3D Flip Card Container */}
      <div className="perspective-1000 w-full min-h-[500px]">
        <div
          className={`relative w-full h-full transition-transform duration-600 preserve-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
          style={{
            transitionDuration: "600ms",
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* FRONT OF CARD: Question + Answer Input + Confidence */}
          <div
            className={`w-full glass-panel p-5 sm:p-8 border backface-hidden flex flex-col justify-between ${
              !isFlipped ? "animate-breathe shadow-glow-brand" : ""
            }`}
          >
            <div>
              {/* Question Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/15 text-brand-600 dark:text-brand-300 border border-brand-500/20 uppercase tracking-wider">
                  Recall Question
                </span>
                {knowledgeTitle && (
                  <span className="text-xs text-slate-500 dark:text-white/50 truncate max-w-[200px] sm:max-w-[280px]">
                    {knowledgeTitle}
                  </span>
                )}
              </div>

              {/* Prompt Text */}
              <h2 className="text-lg sm:text-2xl font-heading font-bold tracking-tight leading-snug mb-5">
                {question?.question_text || "Retrieve the concept details and formula from memory."}
              </h2>

              {/* User Answer Textarea */}
              <div className="space-y-1.5 mb-5 sm:mb-6">
                <label className="text-xs font-medium text-slate-600 dark:text-white/70 flex items-center justify-between">
                  <span>Your Answer (mental rehearsal or typed)</span>
                  <span className="text-[11px] text-slate-400 dark:text-white/40">{userAnswer.length} chars</span>
                </label>
                <textarea
                  className="glass-input w-full p-3 sm:p-3.5 text-sm sm:text-base leading-relaxed resize-y min-h-[110px]"
                  rows={4}
                  placeholder="Type your retrieval attempt here before revealing the answer..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Calibration: Confidence Rating (1-5) */}
              <div className="space-y-2 mb-6 sm:mb-8 bg-white/40 dark:bg-white/[0.03] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-brand-500 dark:text-brand-300" />
                    <span>Confidence Calibration (1–5)</span>
                  </span>
                  {confidence && (
                    <span className="text-xs text-brand-600 dark:text-brand-300 font-medium">
                      {CONFIDENCE_LEVELS[confidence - 1].label}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-white/50">
                  Rate your subjective confidence before revealing. Helps identify calibration gaps.
                </p>

                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                  {CONFIDENCE_LEVELS.map((c) => {
                    const isSelected = confidence === c.val;
                    return (
                      <button
                        key={c.val}
                        type="button"
                        onClick={() => setConfidence(c.val)}
                        className={`min-h-[44px] py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          isSelected
                            ? "bg-brand-500 text-white border-brand-400 shadow-glow-brand scale-105"
                            : "bg-white/60 dark:bg-white/[0.05] text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/15 hover:bg-white dark:hover:bg-white/15"
                        }`}
                      >
                        <span className="text-sm font-bold">{c.val}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Reveal Button with Pulse (min 44px touch target) */}
            <button
              type="button"
              onClick={() => setIsFlipped(true)}
              className="glass-btn-primary w-full min-h-[48px] py-3 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 shadow-glow-brand hover:scale-[1.01] transition-transform animate-pulse cursor-pointer"
            >
              <Eye size={18} />
              <span>Reveal Answer & Compare (3D Flip)</span>
            </button>
          </div>

          {/* BACK OF CARD: Comparison + Honest Self-Scoring */}
          <div
            className="absolute inset-0 w-full h-full glass-panel p-5 sm:p-8 border backface-hidden rotate-y-180 flex flex-col justify-between overflow-y-auto"
          >
            <div className="space-y-4 sm:space-y-5">
              {/* Header on Back */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                  <h3 className="font-heading font-bold text-base">
                    Self-Evaluation & Scoring
                  </h3>
                </div>
                <button
                  onClick={() => setIsFlipped(false)}
                  className="text-xs text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  <span>Flip back</span>
                </button>
              </div>

              {/* Side-by-side or stacked Answer Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Your Typed Answer */}
                <div className="glass-card p-3.5 sm:p-4 space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
                    Your Retrieval Attempt
                  </span>
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                    {userAnswer.trim() || "(No answer was typed — mental attempt)"}
                  </p>
                </div>

                {/* Canonical Understanding / Notes */}
                <div className="glass-card p-3.5 sm:p-4 space-y-1 bg-brand-500/[0.06] border-brand-500/30">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                    Target Concept & Notes
                  </span>
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-medium">
                    {knowledgeDetails?.my_understanding ||
                      knowledgeDetails?.description ||
                      "Compare against the fundamental definition and principles of this concept."}
                  </p>
                  {knowledgeDetails?.example && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-white/70">
                      <span className="text-emerald-600 dark:text-emerald-300 font-semibold">Example: </span>
                      {knowledgeDetails.example}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center pt-1">
                <p className="text-xs sm:text-sm font-semibold">
                  How accurately did you remember this concept?
                </p>
                <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5">
                  Your score dynamically schedules the next optimal review interval.
                </p>
              </div>
            </div>

            {/* 5 Result Buttons: Stacks cleanly into 2-row grid on mobile, 5 across on sm+ */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5 pt-3.5 border-t border-slate-200 dark:border-white/10">
              {RESULT_OPTIONS.map((opt, idx) => (
                <button
                  key={opt.value}
                  disabled={submitting}
                  onClick={() => handleScore(opt.value, opt.label)}
                  className={`glass-panel p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-200 border min-h-[54px] ${
                    idx === 4 ? "col-span-2 sm:col-span-1" : ""
                  } ${opt.borderClass} ${opt.colorClass} ${opt.glowClass} hover:scale-105 active:scale-95 disabled:opacity-50 group cursor-pointer`}
                >
                  <span className="text-2xl sm:text-3xl mb-0.5 filter drop-shadow group-hover:scale-110 transition-transform">
                    {opt.emoji}
                  </span>
                  <span className="text-xs sm:text-sm font-heading font-bold block">
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-white/50 hidden sm:block mt-0.5">
                    {opt.sublabel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
