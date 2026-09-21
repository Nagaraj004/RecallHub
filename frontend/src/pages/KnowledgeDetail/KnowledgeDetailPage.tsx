import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Knowledge, getKnowledge, getReviewHistory, ReviewHistoryItem, deleteKnowledge, updateKnowledge } from "../../api/knowledge";
import { KnowledgeNote, listNotes, createNote } from "../../api/notes";
import { RecallQuestion, createQuestion, listQuestions } from "../../api/recall";
import PageTransition from "../../components/common/PageTransition";
import { SkeletonDetail } from "../../components/common/SkeletonCard";
import DifficultyRating from "../../components/common/DifficultyRating";
import RichTextEditor from "../../components/notes/RichTextEditor";
import NoteCard from "../../components/notes/NoteCard";
import ImageLightbox from "../../components/notes/ImageLightbox";
import PrintNotebookView from "../../components/notes/PrintNotebookView";
import { prepareNotesForPrint, waitForPrintReadiness, PrintNoteData } from "../../utils/printExport";
import {
  ArrowLeft,
  BookOpen,
  HelpCircle,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Clock,
  Download,
  Loader2,
  Printer,
} from "../../components/icons";

export default function KnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<Knowledge | null>(null);
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [questions, setQuestions] = useState<RecallQuestion[]>([]);
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [printNotes, setPrintNotes] = useState<PrintNoteData[]>([]);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getKnowledge(id),
      listNotes(id).catch(() => []),
      listQuestions(id),
      getReviewHistory(id).catch(() => []),
    ])
      .then(([k, n, q, h]) => {
        setItem(k);
        setNotes(n);
        setQuestions(q);
        setHistory(h);
      })
      .catch((err) => {
        console.error("Failed to load knowledge item:", err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (notes.length > 0) {
      prepareNotesForPrint(notes)
        .then((prepared) => setPrintNotes(prepared))
        .catch((err) => console.error("Error pre-rendering print notes:", err));
    } else {
      setPrintNotes([]);
    }
  }, [notes]);

  async function handleAddNote(data: { label: string; content: string; canvas_data?: string | null }) {
    if (!id) return;
    setSavingNote(true);
    try {
      const created = await createNote(id, data);
      setNotes((prev) => [created, ...prev]);
      setIsAddingNote(false);
    } catch (err) {
      console.error("Failed to create note:", err);
    } finally {
      setSavingNote(false);
    }
  }

  function handleNoteUpdated(updatedNote: KnowledgeNote) {
    setNotes((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );
  }

  function handleNoteDeleted(deletedId: string) {
    setNotes((prev) => prev.filter((n) => n.id !== deletedId));
  }

  async function handleDownloadPdf() {
    if (!item) return;
    setIsPreparingPrint(true);
    try {
      const prepared = await prepareNotesForPrint(notes);
      setPrintNotes(prepared);
      await waitForPrintReadiness();
      window.print();
    } catch (err) {
      console.error("Failed to prepare notes for print export:", err);
    } finally {
      setIsPreparingPrint(false);
    }
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !newQuestion.trim()) return;
    try {
      await createQuestion(id, newQuestion.trim());
      setNewQuestion("");
      const updated = await listQuestions(id);
      setQuestions(updated);
    } catch (err) {
      console.error("Failed to add recall question:", err);
    }
  }

  async function handleRatingChange(newDifficulty: number) {
    if (!id || !item || newDifficulty === item.difficulty) return;
    const prevDifficulty = item.difficulty;
    // Optimistic update
    setItem((prev) => (prev ? { ...prev, difficulty: newDifficulty } : null));
    setSavingRating(true);
    try {
      const updated = await updateKnowledge(id, { difficulty: newDifficulty });
      setItem(updated);
    } catch (err) {
      console.error("Failed to update difficulty rating:", err);
      // Roll back on failure
      setItem((prev) => (prev ? { ...prev, difficulty: prevDifficulty } : null));
    } finally {
      setSavingRating(false);
    }
  }

  async function handleDelete() {
    if (!id || !window.confirm("Are you sure you want to delete this knowledge item?")) return;
    setDeleting(true);
    try {
      await deleteKnowledge(id);
      navigate("/categories");
    } catch (err) {
      console.error("Failed to delete knowledge:", err);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <PageTransition className="w-full space-y-6">
        <SkeletonDetail />
      </PageTransition>
    );
  }

  if (!item) {
    return (
      <PageTransition className="max-w-xl mx-auto text-center py-16">
        <div className="glass-panel p-8 space-y-4">
          <BookOpen size={36} className="mx-auto text-slate-400 dark:text-white/40" />
          <h2 className="text-xl font-heading font-bold">Knowledge Item Not Found</h2>
          <p className="text-sm text-slate-500 dark:text-white/60">This item may have been deleted or archived.</p>
          <Link to="/categories" className="glass-btn-primary px-4 py-2 inline-flex items-center gap-2">
            <ArrowLeft size={16} />
            <span>Back to Knowledge Vault</span>
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="w-full space-y-6">
      {/* Lightbox Modal */}
      <ImageLightbox
        src={lightboxImg}
        onClose={() => setLightboxImg(null)}
      />

      {/* Dedicated Native Browser Print View (visible strictly under @media print) */}
      <PrintNotebookView knowledge={item} printNotes={printNotes} />

      {/* Main Two-Zone Side-by-Side Layout on Desktop (>1024px) / Stacked on Tablet & Mobile */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6 xl:gap-8">
        
        {/* ── LEFT ZONE (30-35% on Desktop): Concept Summary & Actions (Sticky) ── */}
        <aside className="w-full lg:w-[340px] xl:w-[380px] 2xl:w-[420px] shrink-0 space-y-4 lg:sticky lg:top-20">
          
          {/* Top Breadcrumb Navigation */}
          <button
            onClick={() => navigate(-1)}
            className="text-xs sm:text-sm text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors py-1 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Vault</span>
          </button>

          {/* Concept Header Card */}
          <div className="glass-panel p-5 sm:p-6 border shadow-glass space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/15 text-brand-600 dark:text-brand-300 border border-brand-500/20 uppercase tracking-wider">
                {item.type || "Core Concept"}
              </span>
              <DifficultyRating
                value={item.difficulty}
                onChange={handleRatingChange}
                isSaving={savingRating}
                variant="badge"
              />
            </div>

            <h1 className="text-xl sm:text-2xl font-heading font-bold tracking-tight">
              {item.title}
            </h1>

            {item.description && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Concept Quick Meta Stats */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10 text-xs text-slate-500 dark:text-white/50">
              <div className="bg-black/5 dark:bg-white/[0.04] p-2 rounded-xl border border-slate-200/60 dark:border-white/5">
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-white/40">Notes</span>
                <span className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                  {notes.length} {notes.length === 1 ? "page" : "pages"}
                </span>
              </div>
              <div className="bg-black/5 dark:bg-white/[0.04] p-2 rounded-xl border border-slate-200/60 dark:border-white/5">
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-white/40">Questions</span>
                <span className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                  {questions.length} {questions.length === 1 ? "card" : "cards"}
                </span>
              </div>
            </div>

            {/* Action Buttons Stack */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isPreparingPrint}
                className="w-full glass-btn px-4 py-2 text-xs text-slate-700 dark:text-white/80 hover:text-slate-950 dark:hover:text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                title="Download or Print notes as PDF via native browser dialog"
              >
                {isPreparingPrint ? (
                  <Loader2 size={14} className="animate-spin text-brand-500 dark:text-brand-300" />
                ) : (
                  <Download size={14} />
                )}
                <span>{isPreparingPrint ? "Preparing Notes..." : "Download Notes as PDF"}</span>
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full glass-btn px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-400/30 flex items-center justify-center gap-2 transition-colors"
                title="Delete Knowledge Item"
              >
                <Trash2 size={14} />
                <span>{deleting ? "Deleting..." : "Delete Concept"}</span>
              </button>
            </div>
          </div>

          {/* Recall Questions Card in Left Zone */}
          <div className="glass-panel p-5 border space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle size={17} className="text-brand-500 dark:text-brand-400" />
                <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                  Spaced Recall Prompts
                </h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 font-semibold text-slate-600 dark:text-white/70">
                {questions.length}
              </span>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-2">
              <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Add an active recall question for this concept..."
                className="w-full text-xs p-2.5 rounded-xl glass-input min-h-[64px] resize-none focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={!newQuestion.trim()}
                className="glass-btn-primary w-full py-1.5 text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={13} />
                <span>Add Question Card</span>
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-2.5 rounded-lg bg-black/5 dark:bg-white/[0.03] border border-slate-200/40 dark:border-white/5 space-y-1"
                >
                  <div className="flex items-start gap-1.5">
                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                      Q{idx + 1}.
                    </span>
                    <p className="text-slate-800 dark:text-white/90 leading-relaxed font-medium">
                      {q.question_text}
                    </p>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-white/40 text-center py-3 italic">
                  No recall questions added yet.
                </p>
              )}
            </div>
          </div>

          {/* Spaced Repetition History */}
          {history.length > 0 && (
            <div className="glass-panel p-5 border space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-white/60">
                <Clock size={15} />
                <span>Review History</span>
              </div>
              <div className="space-y-2 text-xs">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between text-slate-600 dark:text-white/70 py-1 border-b border-slate-100 dark:border-white/5 last:border-0"
                  >
                    <span>{new Date(h.answered_at).toLocaleDateString()}</span>
                    <span className="font-semibold capitalize text-brand-600 dark:text-brand-400">
                      {h.result} {h.confidence_before_reveal ? `(${h.confidence_before_reveal}/5)` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── RIGHT ZONE (65-70% on Desktop): Spacious Handwritten Notes & Synthesis ── */}
        <section className="w-full lg:flex-1 min-w-0 space-y-5">
          {/* Physical Handwritten Notebook Container */}
          <div className="relative rounded-2xl p-1.5 sm:p-7 shadow-2xl notebook-cover overflow-hidden space-y-4 sm:space-y-5 w-full max-w-full">
            {/* Stitched Border inside cover */}
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#bfa57d]/60 pointer-events-none" />

            {/* Bookmark Ribbon on top right */}
            <div
              className="absolute -top-1 right-12 w-6 h-12 bg-gradient-to-b from-rose-600 to-rose-800 shadow-md rounded-b-sm pointer-events-none z-20 flex items-end justify-center pb-1"
              style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)" }}
            >
              <div className="w-1 h-1 rounded-full bg-yellow-300/60" />
            </div>

            {/* Notebook Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 px-1 sm:px-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100/90 border border-amber-300/80 text-amber-900 flex items-center justify-center shadow-xs shrink-0">
                  <BookOpen size={19} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-handwriting font-bold text-amber-950 tracking-wide">
                      Handwritten Notes & Synthesis
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200/90 border border-amber-400/80 text-[11px] font-handwriting font-bold text-amber-950">
                      {notes.length} {notes.length === 1 ? "page" : "pages"}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/75 font-handwriting font-medium">
                    Tactile ink notes, resizable photos, code fragments & Feynman explanations
                  </p>
                </div>
              </div>

              {!isAddingNote && (
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-50 text-xs sm:text-sm font-handwriting font-bold flex items-center gap-2 shadow-lg border border-amber-950 transition-transform active:scale-95 self-start sm:self-auto cursor-pointer"
                >
                  <span>+ Write New Page</span>
                </button>
              )}
            </div>

            {/* Active Add Note Page Editor */}
            {isAddingNote && (
              <div className="relative z-10 w-full max-w-full">
                <RichTextEditor
                  onSave={handleAddNote}
                  onCancel={() => setIsAddingNote(false)}
                  saving={savingNote}
                />
              </div>
            )}

            {/* Stack of Loose Notebook Pages */}
            <div className="relative z-10 space-y-3 sm:space-y-4 pt-1 w-full max-w-full">
              {notes.length === 0 && !isAddingNote ? (
                <div
                  onClick={() => setIsAddingNote(true)}
                  className="notebook-paper notebook-binder-holes deckled-top rounded-sm p-2 sm:p-8 pl-7 sm:pl-20 pr-2.5 sm:pr-8 text-center cursor-pointer hover:brightness-105 transition-all shadow-xl group border border-amber-800/40 text-slate-900 w-full max-w-full box-border"
                  style={{ minHeight: "170px" }}
                >
                  <div className="washi-tape-strip washi-tape-strip -top-3 left-1/2 -translate-x-1/2 w-28 sm:w-32 h-6 rounded-xs" />
                  
                  <div className="py-4 space-y-2">
                    <Sparkles size={26} className="mx-auto text-amber-700 group-hover:scale-110 transition-transform" />
                    <h3 className="text-base sm:text-lg font-handwriting font-bold text-slate-950">
                      This notebook page is currently blank...
                    </h3>
                    <p className="text-xs sm:text-sm font-handwriting text-slate-700 max-w-md mx-auto">
                      Click here with your pen to start writing notes, Feynman distillations, or drag & drop screenshots directly onto paper.
                    </p>
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-sm bg-amber-900 text-amber-100 text-xs font-handwriting font-bold shadow-xs">
                        <Plus size={13} />
                        <span>Start First Handwritten Page</span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                notes.map((note, idx) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    index={idx}
                    knowledgeId={item.id}
                    onUpdated={handleNoteUpdated}
                    onDeleted={handleNoteDeleted}
                    onImageClick={(src) => setLightboxImg(src)}
                  />
                ))
              )}
            </div>
          </div>
        </section>

      </div>
    </PageTransition>
  );
}
