import React, { useEffect, useState } from "react";
import {
  PracticeItem,
  listPracticeItems,
  createPracticeItem,
  submitPracticeAttempt,
} from "../../api/practice";
import { Knowledge, listKnowledge } from "../../api/knowledge";
import PageTransition from "../../components/common/PageTransition";
import {
  CheckCircle2,
  XCircle,
  Plus,
  BookOpen,
  Eye,
  Zap,
} from "../../components/icons";

export default function PracticePage() {
  const [knowledgeList, setKnowledgeList] = useState<Knowledge[]>([]);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string>("");
  const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active testing state
  const [activeItem, setActiveItem] = useState<PracticeItem | null>(null);
  const [userAttemptAnswer, setUserAttemptAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);

  // Add practice item state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [newExpectedAnswer, setNewExpectedAnswer] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const kList = await listKnowledge();
        setKnowledgeList(kList);
        if (kList.length > 0) {
          const firstId = kList[0].id;
          setSelectedKnowledgeId(firstId);
          const items = await listPracticeItems(firstId);
          setPracticeItems(items);
        }
      } catch (err) {
        console.error("Failed to load practice knowledge items:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSelectKnowledge(kId: string) {
    setSelectedKnowledgeId(kId);
    setActiveItem(null);
    setRevealed(false);
    setUserAttemptAnswer("");
    setFeedback(null);
    try {
      const items = await listPracticeItems(kId);
      setPracticeItems(items);
    } catch (err) {
      console.error("Failed to load practice items for knowledge:", err);
    }
  }

  async function handleAddPracticeItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedKnowledgeId || !newPrompt.trim()) return;
    try {
      await createPracticeItem({
        knowledge_id: selectedKnowledgeId,
        prompt: newPrompt.trim(),
        expected_answer: newExpectedAnswer.trim() || undefined,
        type: "problem",
      });
      setNewPrompt("");
      setNewExpectedAnswer("");
      setShowAddModal(false);
      const items = await listPracticeItems(selectedKnowledgeId);
      setPracticeItems(items);
    } catch (err) {
      console.error("Failed to create practice item:", err);
    }
  }

  async function handleScoreAttempt(correct: boolean) {
    if (!activeItem || submittingAttempt) return;
    setSubmittingAttempt(true);
    try {
      const res = await submitPracticeAttempt({
        practice_item_id: activeItem.id,
        user_answer: userAttemptAnswer || undefined,
        self_rated_correct: correct,
      });

      setFeedback({
        message: correct
          ? `Correct! Mastery level updated${res.new_mastery_level !== null ? ` to Level ${res.new_mastery_level}` : ""}.`
          : "Attempt recorded. Keep practicing to build solid mastery!",
        success: correct,
      });

      setTimeout(() => {
        setActiveItem(null);
        setRevealed(false);
        setUserAttemptAnswer("");
        setFeedback(null);
      }, 1500);
    } catch (err) {
      console.error("Failed to submit practice attempt:", err);
    } finally {
      setSubmittingAttempt(false);
    }
  }

  const activeKnowledge = knowledgeList.find((k) => k.id === selectedKnowledgeId);

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold">
              Deliberate Practice Lab
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/15 text-brand-600 dark:text-brand-300 border border-brand-500/20">
              Mastery Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60 mt-1">
            Solve problems, code snippets, and scenario exercises to advance conceptual mastery levels (0–5).
          </p>
        </div>

        {selectedKnowledgeId && (
          <button
            onClick={() => setShowAddModal(true)}
            className="glass-btn-primary px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-glow-brand self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>New Practice Prompt</span>
          </button>
        )}
      </div>

      {/* Main Grid: Knowledge Selector Left & Practice Workspace Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left: Concept / Topic Selector (col-span-4) */}
        <div className="md:col-span-4 glass-panel p-4 flex flex-col h-[320px] md:h-[520px] border">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <BookOpen size={16} className="text-brand-500 dark:text-brand-300" />
              <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-white/80">
                Knowledge Focus
              </h2>
            </div>
            <span className="text-xs text-slate-400 dark:text-white/40 font-mono">({knowledgeList.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <div className="space-y-2">
                <div className="skeleton-glass h-12 rounded-xl" />
                <div className="skeleton-glass h-12 rounded-xl" />
                <div className="skeleton-glass h-12 rounded-xl" />
              </div>
            ) : knowledgeList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-white/40 text-xs">
                <span>No knowledge units created yet. Create some in the Knowledge tab first!</span>
              </div>
            ) : (
              knowledgeList.map((k) => {
                const isSelected = selectedKnowledgeId === k.id;
                return (
                  <button
                    key={k.id}
                    onClick={() => handleSelectKnowledge(k.id)}
                    className={`w-full text-left p-3 rounded-xl text-xs sm:text-sm transition-all flex flex-col gap-1 group ${
                      isSelected
                        ? "bg-brand-500/15 dark:bg-white/15 text-brand-600 dark:text-white border border-brand-500/20 dark:border-white/20 shadow-inner font-semibold"
                        : "text-slate-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="truncate">{k.title}</span>
                    <span className="text-[11px] text-slate-400 dark:text-white/40 font-normal">
                      Difficulty: {k.difficulty}/5
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Practice Workbench (col-span-8) */}
        <div className="md:col-span-8 glass-panel p-5 sm:p-6 flex flex-col justify-between min-h-[420px] md:min-h-[520px] border">
          {activeItem ? (
            /* ACTIVE EXERCISE TESTING STATE */
            <div className="space-y-5 animate-[fadeIn_200ms_ease-out]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
                  Active Practice Attempt
                </span>
                <button
                  onClick={() => {
                    setActiveItem(null);
                    setRevealed(false);
                  }}
                  className="text-xs text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel attempt
                </button>
              </div>

              <div>
                <span className="text-xs text-brand-600 dark:text-brand-300 font-semibold uppercase tracking-wider block mb-1">
                  Exercise Prompt
                </span>
                <p className="text-base sm:text-lg font-heading font-semibold leading-relaxed">
                  {activeItem.prompt}
                </p>
              </div>

              {!revealed ? (
                <div className="space-y-4">
                  <textarea
                    className="glass-input w-full p-3.5 text-sm leading-relaxed"
                    rows={4}
                    placeholder="Work out your solution / answer here..."
                    value={userAttemptAnswer}
                    onChange={(e) => setUserAttemptAnswer(e.target.value)}
                  />
                  <button
                    onClick={() => setRevealed(true)}
                    className="glass-btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-glow-brand"
                  >
                    <Eye size={16} />
                    <span>Check Solution</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-[fadeIn_200ms_ease-out]">
                  {/* Expected Solution Card */}
                  <div className="glass-card p-4 space-y-1.5 bg-emerald-500/[0.06] border-emerald-500/30">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider block">
                      Expected Solution / Key Criteria
                    </span>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {activeItem.expected_answer || "Self-check against conceptual notes."}
                    </p>
                  </div>

                  {feedback && (
                    <div
                      className={`p-3 rounded-xl text-xs font-semibold text-center ${
                        feedback.success
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-400/30"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-200 border border-amber-400/30"
                      }`}
                    >
                      {feedback.message}
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-center space-y-3">
                    <p className="text-xs sm:text-sm font-semibold">
                      Did your solution solve the problem correctly?
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        disabled={submittingAttempt}
                        onClick={() => handleScoreAttempt(false)}
                        className="glass-btn px-5 py-2 text-xs font-semibold text-red-600 dark:text-red-300 hover:bg-red-500/15 border-red-400/30 flex items-center gap-1.5"
                      >
                        <XCircle size={15} />
                        <span>Incorrect / Partial</span>
                      </button>
                      <button
                        disabled={submittingAttempt}
                        onClick={() => handleScoreAttempt(true)}
                        className="glass-btn-primary px-6 py-2 text-xs font-semibold shadow-glow-easy flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={15} />
                        <span>Correct Solution</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* PRACTICE ITEMS LIST */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg">
                    {activeKnowledge?.title || "Select a Concept"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    {practiceItems.length} practice exercise{practiceItems.length === 1 ? "" : "s"} available
                  </p>
                </div>
              </div>

              {practiceItems.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm text-slate-500 dark:text-white/60">No practice exercises added for this concept yet.</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="glass-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 shadow-glow-brand"
                  >
                    <Plus size={14} />
                    <span>Create First Exercise</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {practiceItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-500/40 transition-all group"
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-mono text-slate-400 dark:text-white/40 uppercase tracking-wider block">
                          Exercise #{idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm font-medium">{item.prompt}</p>
                      </div>

                      <button
                        onClick={() => {
                          setActiveItem(item);
                          setRevealed(false);
                          setUserAttemptAnswer("");
                        }}
                        className="glass-btn-primary px-4 py-1.5 text-xs font-semibold shrink-0 flex items-center gap-1 shadow-none group-hover:scale-105 transition-transform self-end sm:self-auto"
                      >
                        <Zap size={13} />
                        <span>Solve & Practice</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Practice Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_150ms_ease-out]">
          <div className="glass-panel p-6 sm:p-7 max-w-lg w-full border shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <h3 className="font-heading font-bold text-lg">Create Practice Exercise</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddPracticeItem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-white/80">Exercise Prompt / Problem</label>
                <textarea
                  className="glass-input w-full p-3 text-xs sm:text-sm"
                  rows={3}
                  required
                  placeholder="e.g. Given an initial deposit of $5,000 compounding monthly at 6% annual rate, calculate the balance after 3 years."
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-white/80">
                  Expected Answer / Solution Criteria
                </label>
                <textarea
                  className="glass-input w-full p-3 text-xs sm:text-sm"
                  rows={3}
                  placeholder="e.g. Formula: A = P(1 + r/n)^(nt). Calculation: 5000*(1 + 0.06/12)^36 ≈ $5,983.40"
                  value={newExpectedAnswer}
                  onChange={(e) => setNewExpectedAnswer(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="glass-btn px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPrompt.trim()}
                  className="glass-btn-primary px-5 py-2 text-xs font-semibold disabled:opacity-40"
                >
                  Create Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
