import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { KnowledgeNote, updateNote, deleteNote } from "../../api/notes";
import RichTextEditor from "./RichTextEditor";
import NoteCanvasLayer from "./NoteCanvasLayer";
import { Edit3, Trash2, Calendar, Sparkles } from "../icons";

interface NoteCardProps {
  note: KnowledgeNote;
  knowledgeId: string;
  index?: number;
  onUpdated: (updatedNote: KnowledgeNote) => void;
  onDeleted: (deletedId: string) => void;
  onImageClick: (src: string) => void;
}


function getRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return dateStr;
  }
}

// Generate consistent pseudo-random values based on note id string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Sticky note / taped tag styles with dark mode variants
const TAG_STYLES: Record<string, { bg: string; text: string; tapeClass: string }> = {
  feynman: { bg: "#fef3c7", text: "#92400e", tapeClass: "washi-tape-pink" },
  example: { bg: "#dcfce7", text: "#166534", tapeClass: "washi-tape-mint" },
  takeaway: { bg: "#ffedd5", text: "#9a3412", tapeClass: "washi-tape-strip" },
  summary: { bg: "#e0e7ff", text: "#3730a3", tapeClass: "washi-tape-lavender" },
  "deep-dive": { bg: "#fce7f3", text: "#9d174d", tapeClass: "washi-tape-pink" },
  correction: { bg: "#ffe4e6", text: "#9f1239", tapeClass: "washi-tape-pink" },
  description: { bg: "#f3e8ff", text: "#6b21a8", tapeClass: "washi-tape-lavender" },
  note: { bg: "#fef9c3", text: "#854d0e", tapeClass: "washi-tape-strip" },
};

function Paperclip() {
  return (
    <svg
      width="28"
      height="54"
      viewBox="0 0 28 54"
      fill="none"
      className="absolute -top-3.5 right-12 z-20 drop-shadow-md pointer-events-none select-none opacity-90"
      style={{ transform: "rotate(-6deg)" }}
    >
      <path
        d="M8 12 V38 C8 44 14 48 20 44 C26 40 26 34 26 28 V8 C26 3 20 1 15 2 C9 3 5 8 5 15 V39 C5 47 13 52 20 49 C26 46 27 40 27 34"
        stroke="#94a3b8"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 12 V38 C8 44 14 48 20 44 C26 40 26 34 26 28 V8 C26 3 20 1 15 2 C9 3 5 8 5 15 V39 C5 47 13 52 20 49 C26 46 27 40 27 34"
        stroke="#e2e8f0"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PushPin() {
  return (
    <div
      className="absolute -top-3 left-8 z-20 drop-shadow-lg pointer-events-none select-none"
      style={{ transform: "rotate(12deg)" }}
    >
      <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 border border-amber-700/60 shadow-inner flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
      </div>
    </div>
  );
}

export default function NoteCard({
  note,
  knowledgeId,
  index = 0,
  onUpdated,
  onDeleted,
  onImageClick,
}: NoteCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isTearing, setIsTearing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  // Check window width for responsive rotation stack vs straight vertical scroll
  useEffect(() => {
    function checkWidth() {
      setIsMobileOrTablet(window.innerWidth < 1024);
    }
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Determine if writing animation should play
  const [isWriting, setIsWriting] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const key = `recallhub_anim_note_${note.id}`;
    const alreadyShown = sessionStorage.getItem(key);
    if (!alreadyShown) {
      setIsWriting(true);
      const timer = setTimeout(() => {
        setIsWriting(false);
        sessionStorage.setItem(key, "1");
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [note.id, prefersReducedMotion]);

  // Deterministic variations per note (desktop only for rotation)
  const { rotation, fontSizeRem, decorationType, tagStyle } = useMemo(() => {
    const hash = hashString(note.id || `note-${index}`);
    const rotations = [-1.4, 1.2, -0.8, 1.5, -1.1, 0.9, -1.5, 1.3];
    const rot = isMobileOrTablet ? 0 : rotations[hash % rotations.length];
    const fontSizes = [1.12, 1.15, 1.18, 1.2];
    const fSize = fontSizes[hash % fontSizes.length];
    const decTypes = ["tape-corner", "paperclip", "pin", "tape-top"];
    const decType = decTypes[hash % decTypes.length];
    const tag = TAG_STYLES[note.label.toLowerCase()] || TAG_STYLES.note;

    return {
      rotation: rot,
      fontSizeRem: fSize,
      decorationType: decType,
      tagStyle: tag,
    };
  }, [note.id, note.label, index, isMobileOrTablet]);

  async function handleSaveEdit(data: { label: string; content: string; canvas_data?: string | null }) {
    setSaving(true);
    try {
      const updated = await updateNote(knowledgeId, note.id, data);
      onUpdated(updated);
      setIsEditing(false);
      sessionStorage.setItem(`recallhub_anim_note_${note.id}`, "1");
    } catch (err) {
      console.error("Failed to update note:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to tear out and delete this note?")) return;
    setIsTearing(true);
    setDeleting(true);

    setTimeout(async () => {
      try {
        await deleteNote(knowledgeId, note.id);
        onDeleted(note.id);
      } catch (err) {
        console.error("Failed to delete note:", err);
        setIsTearing(false);
        setDeleting(false);
      }
    }, 450);
  }

  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === "img") {
      const img = target as HTMLImageElement;
      onImageClick(img.src);
    }
  }

  if (isEditing) {
    return (
      <div className="py-2">
        <RichTextEditor
          initialContent={note.content}
          initialLabel={note.label}
          initialCanvasData={note.canvas_data}
          onSave={handleSaveEdit}
          onCancel={() => setIsEditing(false)}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={
          prefersReducedMotion
            ? { opacity: 0 }
            : { opacity: 0, y: -20, rotate: isMobileOrTablet ? 0 : rotation * 2, scale: 0.96 }
        }
        animate={
          isTearing
            ? {
                rotate: -18,
                y: 120,
                x: -50,
                opacity: 0,
                scale: 0.9,
                transition: { duration: 0.45, ease: "easeIn" },
              }
            : isFocused
            ? {
                rotate: 0,
                scale: isMobileOrTablet ? 1.0 : 1.015,
                y: isMobileOrTablet ? 0 : -6,
                zIndex: 30,
                opacity: 1,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              }
            : {
                rotate: isMobileOrTablet ? 0 : rotation,
                scale: 1,
                y: 0,
                zIndex: 10 + index,
                opacity: 1,
                transition: { type: "spring", stiffness: 260, damping: 20 },
              }
        }
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative my-3 sm:my-4 transition-shadow"
      >
        {/* Physical Sheet of Notebook Paper */}
        <div
          onClick={() => setIsFocused(!isFocused)}
          className={`notebook-paper notebook-binder-holes deckled-top rounded-sm p-2 sm:p-8 pl-7 sm:pl-20 pr-2.5 sm:pr-8 relative cursor-pointer select-text transition-transform duration-200 group w-full max-w-full box-border ${
            isFocused ? "ring-2 ring-amber-700/30" : "hover:brightness-[1.01]"
          }`}
          style={{
            minHeight: "150px",
          }}
        >
          {/* Top Edge Decorative Accessories */}
          {decorationType === "tape-top" && (
            <div
              className={`washi-tape-strip ${tagStyle.tapeClass} -top-3.5 left-1/2 -translate-x-1/2 w-28 h-6 rounded-xs`}
              style={{ transform: "rotate(-1deg)" }}
            />
          )}

          {decorationType === "tape-corner" && (
            <div
              className="washi-tape-strip washi-tape-pink -top-2.5 -right-3 w-20 h-5.5 rounded-xs"
              style={{ transform: "rotate(35deg)" }}
            />
          )}

          {decorationType === "paperclip" && <Paperclip />}
          {decorationType === "pin" && <PushPin />}

          {/* Top Meta Bar */}
          <div className="flex items-center justify-between gap-3 border-b border-amber-900/15 pb-2 mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Handwritten Sticky-Note Tag */}
              <span
                className="px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-handwriting font-bold tracking-wide rounded-sm shadow-xs border border-black/10 flex items-center gap-1"
                style={{
                  backgroundColor: tagStyle.bg,
                  color: tagStyle.text,
                  transform: `rotate(${rotation > 0 ? -1.5 : 1.5}deg)`,
                }}
              >
                <span>#{note.label}</span>
              </span>

              {/* Timestamp written in faint ink */}
              <span className="text-xs sm:text-sm font-handwriting text-slate-600 flex items-center gap-1">
                <Calendar size={13} className="text-slate-500" />
                <span>{getRelativeTime(note.created_at)}</span>
              </span>
            </div>

            {/* Action Buttons */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
            >
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md text-slate-700 hover:text-slate-950 hover:bg-black/5 transition-colors"
                title="Edit Note"
              >
                <Edit3 size={15} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-md text-red-600/80 hover:text-red-700 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                title="Tear Out Note (Delete)"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Writing Reveal Pen Nib Indicator */}
          {isWriting && !prefersReducedMotion && (
            <motion.div
              initial={{ opacity: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: [0, 60, 180, 300],
                y: [0, 10, 25, 40],
              }}
              transition={{ duration: 2.1, ease: "easeInOut" }}
              className="absolute top-20 left-20 z-30 pointer-events-none"
            >
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/80 text-white text-[10px] font-mono shadow-md backdrop-blur-xs">
                <Sparkles size={11} className="text-yellow-300 animate-spin" />
                <span>Writing in ink...</span>
              </div>
            </motion.div>
          )}

          {/* Note Body Area containing Text and Canvas Layer Overlay */}
          <div className="relative min-h-[80px]">
            {/* Rendered Handwritten Content */}
            <motion.div
              initial={
                isWriting && !prefersReducedMotion
                  ? { clipPath: "inset(0 100% 0 0)", opacity: 0.2 }
                  : { clipPath: "inset(0 0% 0 0)", opacity: 1 }
              }
              animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
              transition={{
                duration: isWriting ? 1.8 : 0.2,
                ease: "easeInOut",
              }}
              onClick={handleContentClick}
              className="font-handwriting leading-[32px] break-words select-text text-slate-900 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-950 [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-950 [&_h2]:mt-1.5 [&_h2]:mb-1 [&_p]:mb-2 [&_p]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2 [&_blockquote]:border-l-3 [&_blockquote]:border-rose-400 [&_blockquote]:pl-3.5 [&_blockquote]:italic [&_blockquote]:text-slate-800 [&_img]:taped-photo-frame [&_img]:max-w-full [&_img]:my-3 [&_img]:cursor-zoom-in hover:[&_img]:scale-[1.01] [&_img]:transition-transform relative z-10"
              style={{ fontSize: `${fontSizeRem}rem` }}
              dangerouslySetInnerHTML={{ __html: note.content }}
            />

            {/* Read-Only Canvas Layer Overlay (replays drawings, curves, boxes, movable photos) */}
            {note.canvas_data && (
              <NoteCanvasLayer
                initialCanvasData={note.canvas_data}
                activeTool="select"
                strokeColor="#4f46e5"
                strokeWidth={3}
                readOnly={true}
                className="z-20 pointer-events-none"
              />
            )}
          </div>

          {/* Page curl / dog-ear corner effect on bottom right */}
          <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none overflow-hidden">
            <div className="w-8 h-8 bg-amber-400/30 -rotate-45 transform origin-bottom-right border-t border-l border-amber-500/30 shadow-xs" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
