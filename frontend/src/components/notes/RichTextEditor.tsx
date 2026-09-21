import React, { useRef, useState, useEffect } from "react";
import { uploadImage, getFullImageUrl } from "../../api/notes";
import NoteCanvasLayer, { NoteCanvasLayerHandle } from "./NoteCanvasLayer";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  ImageIcon,
  Loader2,
  AlertTriangle,
  Check,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  MoreHorizontal,
  Highlighter,
  Square,
  Circle,
  Minus,
  MoveRight,
  CurvedArrow,
  MousePointer,
  BringToFront,
  SendToBack,
  TypeIcon,
} from "../icons";

interface RichTextEditorProps {
  initialContent?: string;
  initialLabel?: string;
  initialCanvasData?: string | null;
  onSave: (data: { label: string; content: string; canvas_data?: string | null }) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

const PRESET_LABELS = [
  { name: "note", bg: "#fef9c3", text: "#854d0e" },
  { name: "description", bg: "#f3e8ff", text: "#6b21a8" },
  { name: "example", bg: "#dcfce7", text: "#166534" },
  { name: "feynman", bg: "#fef3c7", text: "#92400e" },
  { name: "summary", bg: "#e0e7ff", text: "#3730a3" },
  { name: "takeaway", bg: "#ffedd5", text: "#9a3412" },
  { name: "deep-dive", bg: "#fce7f3", text: "#9d174d" },
  { name: "correction", bg: "#ffe4e6", text: "#9f1239" },
];

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fef08a", border: "#fde047", text: "#713f12" },
  { name: "Green", value: "#bbf7d0", border: "#86efac", text: "#14532d" },
  { name: "Pink", value: "#fbcfe8", border: "#f472b6", text: "#831843" },
  { name: "Blue", value: "#bae6fd", border: "#7dd3fc", text: "#0c4a6e" },
  { name: "Orange", value: "#fed7aa", border: "#fdba74", text: "#7c2d12" },
];

const SHAPE_COLORS = [
  { name: "Ink Black", value: "#1e293b", bg: "#1e293b" },
  { name: "Indigo", value: "#4f46e5", bg: "#4f46e5" },
  { name: "Crimson", value: "#e11d48", bg: "#e11d48" },
  { name: "Emerald", value: "#059669", bg: "#059669" },
  { name: "Amber", value: "#d97706", bg: "#d97706" },
  { name: "Violet", value: "#7c3aed", bg: "#7c3aed" },
  { name: "Sky Blue", value: "#2563eb", bg: "#2563eb" },
];

export default function RichTextEditor({
  initialContent = "",
  initialLabel = "note",
  initialCanvasData = null,
  onSave,
  onCancel,
  saving = false,
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasLayerRef = useRef<NoteCanvasLayerHandle>(null);

  const [label, setLabel] = useState(initialLabel);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [hasContent, setHasContent] = useState(!!initialContent);
  const [showSecondaryTools, setShowSecondaryTools] = useState(false);
  const [showHighlighterMenu, setShowHighlighterMenu] = useState(false);
  const [activeHighlightColor, setActiveHighlightColor] = useState("#fef08a");

  // ── DRAWING CANVAS TOOLBAR STATE ──
  const [activeDrawTool, setActiveDrawTool] = useState<
    "select" | "line" | "arrow" | "curved-arrow" | "box" | "circle"
  >("select");
  const [strokeColor, setStrokeColor] = useState("#4f46e5");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fillMode, setFillMode] = useState<"none" | "tint">("none");
  const [hasCanvasSelection, setHasCanvasSelection] = useState(false);
  const [canAddTextToShape, setCanAddTextToShape] = useState(false);

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
      setHasContent(true);
    }
  }, [initialContent]);

  // Click on blank canvas surface automatically switches into text editing mode and places caret
  function handleBlankCanvasClick(e: MouseEvent | TouchEvent) {
    if (!editorRef.current) return;

    const clientX = "clientX" in e ? e.clientX : (e as any).touches?.[0]?.clientX;
    const clientY = "clientY" in e ? e.clientY : (e as any).touches?.[0]?.clientY;

    if (typeof clientX === "number" && typeof clientY === "number") {
      let range: Range | null = null;
      if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(clientX, clientY);
        if (pos && pos.offsetNode) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      } else if ((document as any).caretRangeFromPoint) {
        range = (document as any).caretRangeFromPoint(clientX, clientY);
      }

      if (range && editorRef.current.contains(range.commonAncestorContainer)) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        editorRef.current.focus();
      } else {
        editorRef.current.focus();
        const sel = window.getSelection();
        if (sel) {
          const r = document.createRange();
          r.selectNodeContents(editorRef.current);
          r.collapse(false);
          sel.removeAllRanges();
          sel.addRange(r);
        }
      }
    } else {
      editorRef.current.focus();
    }

    checkContent();
  }

  // Click outside menus to close dropdowns
  useEffect(() => {
    function handleOutsideMenuClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".highlighter-dropdown-container")) {
        setShowHighlighterMenu(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideMenuClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideMenuClick);
    };
  }, []);

  function exec(command: string, value: string | undefined = undefined) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    checkContent();
  }

  function handleHeading(tag: "h1" | "h2" | "p") {
    document.execCommand("formatBlock", false, tag === "p" ? "<p>" : `<${tag}>`);
    editorRef.current?.focus();
    checkContent();
  }

  function checkContent() {
    const text = editorRef.current?.innerText?.trim() || "";
    const html = editorRef.current?.innerHTML?.trim() || "";
    const hasCanvas = canvasLayerRef.current?.hasObjects() || false;
    setHasContent(text.length > 0 || html.includes("<img") || hasCanvas);
  }

  function applyHighlight(color: string = activeHighlightColor) {
    setActiveHighlightColor(color);
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setShowHighlighterMenu(false);
      return;
    }

    const range = selection.getRangeAt(0);
    let parentEl = range.commonAncestorContainer as HTMLElement;
    if (parentEl.nodeType === Node.TEXT_NODE) {
      parentEl = parentEl.parentElement as HTMLElement;
    }
    const existingMark = parentEl?.closest("mark");
    if (existingMark && editorRef.current?.contains(existingMark)) {
      existingMark.style.backgroundColor = color;
      setShowHighlighterMenu(false);
      checkContent();
      return;
    }

    const mark = document.createElement("mark");
    mark.className = "handwritten-highlight";
    mark.style.backgroundColor = color;
    mark.style.color = "inherit";
    mark.style.borderRadius = "3px";
    mark.style.padding = "1px 4px";

    try {
      const extracted = range.extractContents();
      mark.appendChild(extracted);
      range.insertNode(mark);
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(mark);
      selection.addRange(newRange);
    } catch {
      document.execCommand("hiliteColor", false, color);
    }

    setShowHighlighterMenu(false);
    checkContent();
  }

  function removeHighlight() {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let parent = range.commonAncestorContainer as HTMLElement;
      if (parent.nodeType === Node.TEXT_NODE) parent = parent.parentElement as HTMLElement;
      const mark = parent?.closest("mark");
      if (mark && editorRef.current?.contains(mark)) {
        const parentNode = mark.parentNode;
        while (mark.firstChild) {
          parentNode?.insertBefore(mark.firstChild, mark);
        }
        parentNode?.removeChild(mark);
      } else {
        document.execCommand("removeFormat", false);
      }
    }
    setShowHighlighterMenu(false);
    checkContent();
  }

  // Handle image upload and place directly onto canvas layer
  async function processImageFile(file: File) {
    setUploadError(null);

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Only PNG, JPEG, WebP, and GIF images are supported (415).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image exceeds 5MB limit (413). Please choose a smaller image.");
      return;
    }

    setUploading(true);

    try {
      const res = await uploadImage(file);
      const fullUrl = getFullImageUrl(res.url);

      if (canvasLayerRef.current) {
        await canvasLayerRef.current.addImage(fullUrl, file.name);
        setActiveDrawTool("select");
      }
      checkContent();
    } catch (err: any) {
      console.error("Image upload failed:", err);
      const errMsg =
        err.response?.data?.detail || "Failed to upload image. Check file size (max 5MB) and format.";
      setUploadError(errMsg);
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
        }
        break;
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processImageFile(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const content = editorRef.current?.innerHTML || "";
    const cleanContent = content.trim();
    const canvasData = canvasLayerRef.current?.getCanvasData() || null;

    if (
      (!cleanContent || cleanContent === "<p><br></p>" || cleanContent === "<br>") &&
      !canvasData
    ) {
      setUploadError("Note content or drawing cannot be empty.");
      return;
    }

    setUploadError(null);
    await onSave({
      label: label.trim() || "note",
      content: cleanContent,
      canvas_data: canvasData,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="relative my-4 space-y-2">
      {/* ── DESK TRAY TOOLBAR (Ink, Highlight, Draw, & Movable Photo Tools) ── */}
      <div className="desk-tray rounded-xl p-2 sm:p-2.5 text-amber-100 flex flex-col gap-2 shadow-xl border border-amber-900/60 w-full max-w-full overflow-hidden">
        {/* ROW 1: Pen Formatting & Highlighter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-amber-800/40 pb-1.5 w-full">
          <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar max-w-full py-0.5 shrink-0">
            <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider mr-1 select-none shrink-0">
              Ink:
            </span>
            {/* Bold */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("bold")}
              className="p-1.5 rounded-lg text-amber-200/90 hover:text-amber-100 hover:bg-amber-800/40 transition-colors shrink-0"
              title="Bold Ink (Ctrl+B)"
            >
              <Bold size={14} />
            </button>
            {/* Italic */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("italic")}
              className="p-1.5 rounded-lg text-amber-200/90 hover:text-amber-100 hover:bg-amber-800/40 transition-colors shrink-0"
              title="Italic Script (Ctrl+I)"
            >
              <Italic size={14} />
            </button>
            {/* Underline */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("underline")}
              className="p-1.5 rounded-lg text-amber-200/90 hover:text-amber-100 hover:bg-amber-800/40 transition-colors shrink-0"
              title="Underline (Ctrl+U)"
            >
              <Underline size={14} />
            </button>

            <div className="w-px h-3.5 bg-amber-700/50 mx-0.5 shrink-0" />

            {/* Text Alignment */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("justifyLeft")}
              className="p-1.5 rounded-lg text-amber-200/90 hover:text-amber-100 hover:bg-amber-800/40 transition-colors shrink-0"
              title="Align Text Left"
            >
              <AlignLeft size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("justifyCenter")}
              className="p-1.5 rounded-lg text-amber-200/90 hover:text-amber-100 hover:bg-amber-800/40 transition-colors shrink-0"
              title="Align Text Center"
            >
              <AlignCenter size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("justifyRight")}
              className="p-1.5 rounded-lg text-amber-200/90 hover:text-amber-100 hover:bg-amber-800/40 transition-colors shrink-0"
              title="Align Text Right"
            >
              <AlignRight size={14} />
            </button>

            <div className="w-px h-3.5 bg-amber-700/50 mx-0.5 shrink-0" />

            {/* Text Highlighter Marker */}
            <div className="relative highlighter-dropdown-container shrink-0">
              <div className="flex items-center rounded-lg bg-amber-900/40 border border-amber-700/50 overflow-hidden">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHighlight(activeHighlightColor)}
                  className="p-1.5 text-amber-200/90 hover:text-amber-100 hover:bg-amber-800/50 flex flex-col items-center gap-0.5 transition-colors"
                  title="Highlight selected text"
                >
                  <Highlighter size={13} />
                  <span
                    className="w-3.5 h-1 rounded-full"
                    style={{ backgroundColor: activeHighlightColor }}
                  />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowHighlighterMenu(!showHighlighterMenu)}
                  className="px-1 py-1.5 text-amber-300 hover:bg-amber-800/60 text-[9px] flex items-center justify-center border-l border-amber-700/50"
                  title="Choose Highlighter Palette"
                >
                  ▼
                </button>
              </div>

              {/* Highlighter Palette Dropdown */}
              {showHighlighterMenu && (
                <div className="absolute left-0 top-full mt-1 z-50 p-2 rounded-xl bg-slate-900/95 dark:bg-black/95 text-white border border-amber-700/60 shadow-2xl backdrop-blur-md min-w-[170px] animate-[scaleUp_120ms_ease-out]">
                  <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider px-1 pb-1 mb-1 border-b border-white/10">
                    Highlighter Palette
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 p-1">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyHighlight(c.value)}
                        className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 flex items-center justify-center shadow-xs ${
                          activeHighlightColor === c.value
                            ? "ring-2 ring-white scale-105 border-white"
                            : "border-black/20"
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={`${c.name} Highlighter`}
                      >
                        {activeHighlightColor === c.value && (
                          <Check size={11} className="text-slate-900 stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={removeHighlight}
                    className="w-full mt-2 pt-1 border-t border-white/10 text-[11px] text-red-300 hover:text-red-200 hover:bg-white/10 rounded-md py-1 text-center font-sans"
                  >
                    Clear Highlight
                  </button>
                </div>
              )}
            </div>

            {/* Heading & Lists (Desktop) */}
            <div className="hidden sm:flex items-center gap-0.5 ml-1 shrink-0">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleHeading("h1")}
                className="p-1.5 rounded-lg text-amber-200/90 hover:text-amber-100 hover:bg-amber-800/40 transition-colors"
                title="Large Heading"
              >
                <Heading1 size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleHeading("h2")}
                className="p-1.5 rounded-lg text-amber-200/90 hover:text-amber-100 hover:bg-amber-800/40 transition-colors"
                title="Subheading"
              >
                <Heading2 size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec("insertUnorderedList")}
                className="p-1.5 rounded-lg text-amber-200/90 hover:text-amber-100 hover:bg-amber-800/40 transition-colors"
                title="Bullet List"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec("insertOrderedList")}
                className="p-1.5 rounded-lg text-amber-200/90 hover:text-amber-100 hover:bg-amber-800/40 transition-colors"
                title="Numbered List"
              >
                <ListOrdered size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec("formatBlock", "<blockquote>")}
                className="p-1.5 rounded-lg text-amber-200/90 hover:text-amber-100 hover:bg-amber-800/40 transition-colors"
                title="Feynman Quote Box"
              >
                <Quote size={14} />
              </button>
            </div>
          </div>

          {/* Right: Tag Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full py-0.5">
            {PRESET_LABELS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setLabel(p.name)}
                className={`px-2 py-0.5 rounded-xs text-[11px] font-handwriting font-bold tracking-wide transition-transform border shadow-xs whitespace-nowrap shrink-0 ${
                  label.toLowerCase() === p.name
                    ? "scale-105 ring-2 ring-amber-400 border-black/20"
                    : "opacity-80 hover:opacity-100 hover:scale-102 border-black/10"
                }`}
                style={{
                  backgroundColor: p.bg,
                  color: p.text,
                }}
              >
                #{p.name}
              </button>
            ))}
          </div>
        </div>

        {/* ROW 2: Paint-Tool Canvas Annotation Layer (Draw, Shapes, Freeform Movable Images) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-0.5 w-full">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full py-1">
            <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider mr-1 select-none flex items-center gap-1 shrink-0">
              <span>Draw:</span>
            </span>

            {/* Select & Move Pointer */}
            <button
              type="button"
              onClick={() => setActiveDrawTool("select")}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-xs transition-colors border shrink-0 ${
                activeDrawTool === "select"
                  ? "bg-indigo-600 text-white border-indigo-400 font-bold shadow-xs"
                  : "bg-amber-900/30 text-amber-200 hover:bg-amber-800/40 border-amber-700/40"
              }`}
              title="Select & Move Tool (Drag, resize from 8 handles, or rotate)"
            >
              <MousePointer size={13} />
              <span>Select</span>
            </button>

            {/* Straight Line */}
            <button
              type="button"
              onClick={() => setActiveDrawTool("line")}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-xs transition-colors border shrink-0 ${
                activeDrawTool === "line"
                  ? "bg-indigo-600 text-white border-indigo-400 font-bold shadow-xs"
                  : "bg-amber-900/30 text-amber-200 hover:bg-amber-800/40 border-amber-700/40"
              }`}
              title="Straight Line (Click and drag to draw)"
            >
              <Minus size={14} />
              <span className="hidden sm:inline">Line</span>
            </button>

            {/* Straight Arrow */}
            <button
              type="button"
              onClick={() => setActiveDrawTool("arrow")}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-xs transition-colors border shrink-0 ${
                activeDrawTool === "arrow"
                  ? "bg-indigo-600 text-white border-indigo-400 font-bold shadow-xs"
                  : "bg-amber-900/30 text-amber-200 hover:bg-amber-800/40 border-amber-700/40"
              }`}
              title="Straight Arrow (Click and drag to point)"
            >
              <MoveRight size={14} />
              <span className="hidden sm:inline">Arrow</span>
            </button>

            {/* Curved / Bezier Arrow */}
            <button
              type="button"
              onClick={() => setActiveDrawTool("curved-arrow")}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-xs transition-colors border shrink-0 ${
                activeDrawTool === "curved-arrow"
                  ? "bg-indigo-600 text-white border-indigo-400 font-bold shadow-xs"
                  : "bg-amber-900/30 text-amber-200 hover:bg-amber-800/40 border-amber-700/40"
              }`}
              title="Curved Arrow (Drag start/end, then bend using the middle curve handle)"
            >
              <CurvedArrow size={14} />
              <span className="hidden sm:inline">Curved</span>
            </button>

            {/* Box / Rectangle */}
            <button
              type="button"
              onClick={() => setActiveDrawTool("box")}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-xs transition-colors border shrink-0 ${
                activeDrawTool === "box"
                  ? "bg-indigo-600 text-white border-indigo-400 font-bold shadow-xs"
                  : "bg-amber-900/30 text-amber-200 hover:bg-amber-800/40 border-amber-700/40"
              }`}
              title="Box Frame (Click and drag to draw directly)"
            >
              <Square size={13} />
              <span className="hidden sm:inline">Box</span>
            </button>

            {/* Circle / Ellipse */}
            <button
              type="button"
              onClick={() => setActiveDrawTool("circle")}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-xs transition-colors border shrink-0 ${
                activeDrawTool === "circle"
                  ? "bg-indigo-600 text-white border-indigo-400 font-bold shadow-xs"
                  : "bg-amber-900/30 text-amber-200 hover:bg-amber-800/40 border-amber-700/40"
              }`}
              title="Circle / Oval (Click and drag to draw)"
            >
              <Circle size={13} />
              <span className="hidden sm:inline">Circle</span>
            </button>

            <div className="w-px h-3.5 bg-amber-700/50 mx-0.5 shrink-0" />

            {/* Color Palette Swatches */}
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-amber-800/50 shrink-0">
              {SHAPE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setStrokeColor(c.value);
                    canvasLayerRef.current?.setStrokeColor(c.value);
                  }}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    strokeColor === c.value
                      ? "ring-2 ring-white scale-125 border-white"
                      : "border-black/30 hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={`${c.name} Ink`}
                />
              ))}
            </div>

            {/* Stroke Width Selector */}
            <div className="flex items-center gap-0.5 bg-black/20 p-0.5 rounded-lg border border-amber-800/50 text-[10px] shrink-0">
              {[2, 3, 5].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setStrokeWidth(w);
                    canvasLayerRef.current?.setStrokeWidth(w);
                  }}
                  className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                    strokeWidth === w ? "bg-amber-600 text-white" : "text-amber-300 hover:bg-white/10"
                  }`}
                  title={`${w === 2 ? "Thin" : w === 3 ? "Medium" : "Thick"} line`}
                >
                  {w === 2 ? "S" : w === 3 ? "M" : "L"}
                </button>
              ))}
            </div>

            {/* Fill Mode Toggle */}
            <button
              type="button"
              onClick={() => setFillMode(fillMode === "none" ? "tint" : "none")}
              className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors shrink-0 ${
                fillMode === "tint"
                  ? "bg-amber-600 text-white border-amber-400 font-bold"
                  : "bg-amber-900/30 text-amber-300 border-amber-700/40 hover:bg-amber-800/40"
              }`}
              title="Toggle shape background tint"
            >
              {fillMode === "tint" ? "Tinted" : "No Fill"}
            </button>
          </div>

          {/* Layering & Movable Photo Button */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            {hasCanvasSelection && (
              <div className="flex items-center gap-0.5 animate-fade-in bg-black/30 p-0.5 rounded-lg border border-white/20">
                {canAddTextToShape && (
                  <button
                    type="button"
                    onClick={() => canvasLayerRef.current?.editSelectedShapeText()}
                    className="px-1.5 py-1 rounded hover:bg-white/20 text-indigo-200 hover:text-white flex items-center gap-1 text-[11px] font-bold transition-colors"
                    title="Add / Edit Text Inside Shape (or double-click the shape)"
                  >
                    <TypeIcon size={13} />
                    <span>Add Text</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => canvasLayerRef.current?.bringSelectedToFront()}
                  className="p-1 rounded hover:bg-white/20 text-amber-200"
                  title="Bring to Front"
                >
                  <BringToFront size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => canvasLayerRef.current?.sendSelectedToBack()}
                  className="p-1 rounded hover:bg-white/20 text-amber-200"
                  title="Send to Back"
                >
                  <SendToBack size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => canvasLayerRef.current?.deleteSelected()}
                  className="p-1 rounded hover:bg-red-500/30 text-red-300 hover:text-red-100"
                  title="Delete Selected Element (or press Delete key)"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}

            {/* Tape Movable Photo Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-200 bg-amber-900/50 hover:bg-amber-800/60 border border-amber-700/60 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
              title="Tape movable photo into note (Freely drag, rotate, & resize from 8 handles)"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
              <span>{uploading ? "Taping..." : "Tape Photo"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-2 animate-fade-in font-handwriting text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-red-400" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-red-200 hover:text-white p-1"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── PHYSICAL NOTEBOOK SHEET ── */}
      <div
        ref={containerRef}
        className={`notebook-paper notebook-binder-holes deckled-top rounded-sm p-2 sm:p-8 pl-7 sm:pl-20 pr-2.5 sm:pr-8 relative shadow-2xl transition-all w-full max-w-full box-border cursor-text ${
          isDragOver ? "ring-4 ring-amber-500/40" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ minHeight: "240px" }}
      >
        {/* Top washi tape accent */}
        <div
          className="washi-tape-strip washi-tape-mint -top-3 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-6 rounded-xs"
          style={{ transform: "rotate(0.5deg)" }}
        />

        {/* Note Tag Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/15 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-handwriting font-bold text-amber-950/70">Tag:</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="note, feynman, example..."
              className="bg-amber-100/80 border border-amber-300/80 rounded-xs px-2 py-0.5 text-xs sm:text-sm font-handwriting font-bold text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[140px] sm:max-w-none"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] font-handwriting text-amber-950/60 font-semibold">
            <span>Ink & Canvas Layer</span>
          </div>
        </div>

        {/* Content & Canvas Layer Container */}
        <div className="relative min-h-[160px] w-full max-w-full">
          {/* 1. Underlying Rich Text Editing Area */}
          <div
            ref={editorRef}
            contentEditable
            onInput={checkContent}
            onKeyUp={checkContent}
            onPaste={handlePaste}
            className="outline-none focus:outline-none cursor-text min-h-[140px] font-handwriting text-[1.12rem] sm:text-[1.18rem] leading-[32px] break-words select-text text-slate-900 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-950 [&_h1]:mb-1 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-950 [&_h2]:mb-1 [&_p]:mb-2 [&_p]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2 [&_blockquote]:border-l-3 [&_blockquote]:border-rose-400 [&_blockquote]:pl-3.5 [&_blockquote]:italic [&_blockquote]:text-slate-800"
          />

          {/* Placeholder hint when empty */}
          {!hasContent && (
            <div className="absolute top-0 left-0 pointer-events-none text-slate-500/70 font-handwriting text-[1.05rem] sm:text-[1.18rem] leading-[32px] select-none italic pr-2">
              Start writing ink notes here... Use the Draw tools above to sketch lines, arrows, curved connectors, boxes, or tape freely movable photos onto this page.
            </div>
          )}

          {/* 2. Fabric.js Canvas Annotation Layer (Overlays note for drawing shapes & movable photos) */}
          <NoteCanvasLayer
            ref={canvasLayerRef}
            initialCanvasData={initialCanvasData}
            activeTool={activeDrawTool}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            fillMode={fillMode}
            onToolChange={(t) => {
              setActiveDrawTool(t);
              checkContent();
            }}
            onSelectionChange={(hasSel, _type, canAddText) => {
              setHasCanvasSelection(hasSel);
              setCanAddTextToShape(!!canAddText);
            }}
            onBlankClick={handleBlankCanvasClick}
          />

          {isDragOver && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-amber-900/20 backdrop-blur-xs border-2 border-dashed border-amber-600 rounded-sm text-amber-950 font-handwriting text-lg font-bold pointer-events-none">
              Tape photo onto page
            </div>
          )}
        </div>

        {/* Page Footer Action Buttons (Cancel / Save) */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-amber-900/15 relative z-30">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || uploading}
            className="px-3.5 py-1.5 rounded-sm text-xs sm:text-sm font-handwriting font-bold text-amber-950/80 hover:text-amber-950 hover:bg-black/5 transition-colors cursor-pointer"
          >
            Discard Page
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="px-5 py-1.5 rounded-sm bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-amber-50 text-xs sm:text-sm font-handwriting font-bold flex items-center gap-1.5 shadow-md border border-amber-950 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            <span>{saving ? "Saving to Notebook..." : "Keep Note"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
