import React from "react";
import { Knowledge } from "../../api/knowledge";
import { PrintNoteData } from "../../utils/printExport";

interface PrintNotebookViewProps {
  knowledge: Knowledge;
  printNotes: PrintNoteData[];
}

function renderStars(rating: number): string {
  const r = Math.max(1, Math.min(5, rating || 1));
  let starsHtml = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= r) {
      starsHtml += "★ ";
    } else {
      starsHtml += "☆ ";
    }
  }
  return starsHtml.trim();
}

export default function PrintNotebookView({ knowledge, printNotes }: PrintNotebookViewProps) {
  const nowFormatted = new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="recallhub-print-root">
      {/* ── 1. CONCEPT COVER HEADER ── */}
      <div className="print-concept-cover">
        <div className="print-concept-badges">
          <span className="print-badge-type">{knowledge.type || "Core Concept"}</span>
          <span className="print-badge-diff">
            <span className="print-stars">{renderStars(knowledge.difficulty)}</span>
            <span>Difficulty {knowledge.difficulty}/5</span>
          </span>
        </div>
        <h1 className="print-concept-title">{knowledge.title}</h1>
        {knowledge.description && (
          <p className="print-concept-desc">{knowledge.description}</p>
        )}
        <div className="print-meta-bar">
          <span>
            RecallHub Notebook Export &bull; {printNotes.length} {printNotes.length === 1 ? "page" : "pages"}
          </span>
          <span>{nowFormatted}</span>
        </div>
      </div>

      {/* ── 2. NOTEBOOK PAGES ── */}
      {printNotes.length === 0 ? (
        <div className="print-empty-card">
          This knowledge notebook page is currently blank.
        </div>
      ) : (
        printNotes.map((item) => {
          const {
            note,
            index,
            tagStyle,
            formattedDate,
            canvasImageOverlayUrl,
            canvasWidth,
            canvasHeight,
            minCanvasHeight,
            scaleFactor,
          } = item;

          const effectiveWidth = canvasWidth || 640;
          const effectiveScale = scaleFactor || 1;

          return (
            <div key={note.id || `print-note-${index}`} className="print-notebook-page">
              {/* Left Binder Holes */}
              <div className="print-binder-holes" />

              {/* Top Washi Tape Accent */}
              <div
                className="print-washi-tape"
                style={{ backgroundColor: tagStyle.tapeBg }}
              />

              {/* Note Header */}
              <div className="print-note-header">
                <div className="print-note-header-left">
                  <span
                    className="print-note-tag-badge"
                    style={{
                      backgroundColor: tagStyle.bg,
                      color: tagStyle.text,
                      border: `1px solid ${tagStyle.border}`,
                    }}
                  >
                    #{note.label || "note"}
                  </span>
                  <span className="print-note-date-time">{formattedDate}</span>
                </div>
                <span className="print-page-index-label">
                  Page {index + 1} of {printNotes.length}
                </span>
              </div>

              {/* Note Body Outer Scale Wrapper: Prevents layout overflow while keeping 100% exact text wrapping */}
              <div
                className="print-note-body-wrapper"
                style={{
                  minHeight: `${Math.ceil((Math.max(minCanvasHeight || 0, canvasHeight || 0) || 80) * effectiveScale)}px`,
                }}
              >
                {/* Fixed-Width Note Container: Locked to the exact authored canvasWidth */}
                <div
                  className="print-note-fixed-container"
                  style={{
                    width: `${effectiveWidth}px`,
                    minHeight: `${canvasHeight || minCanvasHeight || 80}px`,
                    transform: effectiveScale < 1 ? `scale(${effectiveScale})` : undefined,
                    transformOrigin: "top left",
                  }}
                >
                  {/* Handwritten HTML Content: Lines break identically to the live screen editor */}
                  <div
                    className="print-note-handwritten-body"
                    dangerouslySetInnerHTML={{ __html: note.content || "" }}
                  />

                  {/* Real <img> Tag for Canvas Drawings, Arrows, Curves, Boxes, and Embedded Photos */}
                  {canvasImageOverlayUrl && (
                    <img
                      src={canvasImageOverlayUrl}
                      alt="Drawing and Canvas Layer"
                      className="print-canvas-overlay-img"
                      style={{
                        width: `${effectiveWidth}px`,
                        height: `${canvasHeight || minCanvasHeight || 260}px`,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Dog-ear fold */}
              <div className="print-dog-ear">
                <div className="print-dog-ear-inner" />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
