import { Knowledge } from "../api/knowledge";
import { KnowledgeNote } from "../api/notes";
import { getFabric } from "./fabricLoader";
import { denormalizeObjectForTarget } from "./canvasNormalization";

export interface PrintNoteData {
  note: KnowledgeNote;
  index: number;
  canvasImageOverlayUrl: string | null;
  svgOverlayHtml?: string | null;
  canvasWidth: number;
  canvasHeight: number;
  minCanvasHeight: number;
  scaleFactor: number;
  tagStyle: { bg: string; text: string; tapeBg: string; border: string };
  formattedDate: string;
}

export const PRINT_TAG_STYLES: Record<string, { bg: string; text: string; tapeBg: string; border: string }> = {
  feynman: { bg: "#fef3c7", text: "#92400e", tapeBg: "rgba(254, 205, 211, 0.95)", border: "#fde68a" },
  example: { bg: "#dcfce7", text: "#166534", tapeBg: "rgba(167, 243, 208, 0.95)", border: "#bbf7d0" },
  takeaway: { bg: "#ffedd5", text: "#9a3412", tapeBg: "rgba(252, 231, 175, 0.95)", border: "#fed7aa" },
  summary: { bg: "#e0e7ff", text: "#3730a3", tapeBg: "rgba(221, 214, 254, 0.95)", border: "#c7d2fe" },
  "deep-dive": { bg: "#fce7f3", text: "#9d174d", tapeBg: "rgba(254, 205, 211, 0.95)", border: "#fbcfe8" },
  correction: { bg: "#ffe4e6", text: "#9f1239", tapeBg: "rgba(254, 205, 211, 0.95)", border: "#fecdd3" },
  description: { bg: "#f3e8ff", text: "#6b21a8", tapeBg: "rgba(221, 214, 254, 0.95)", border: "#e9d5ff" },
  note: { bg: "#fef9c3", text: "#854d0e", tapeBg: "rgba(252, 231, 175, 0.95)", border: "#fef08a" },
};

export function formatPrintDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Compute the maximum coordinate bounds of all Fabric objects.
 */
function computeBounds(parsed: any): { width: number; height: number } {
  const origW = parsed.canvasWidth || 700;
  const origH = parsed.canvasHeight || 260;
  let maxX = origW;
  let maxY = origH;

  if (Array.isArray(parsed.objects)) {
    parsed.objects.forEach((obj: any) => {
      const strokePad = (obj.strokeWidth || 4) * 2;
      const left = obj.left || 0;
      const top = obj.top || 0;
      const scaleX = obj.scaleX !== undefined ? obj.scaleX : 1;
      const scaleY = obj.scaleY !== undefined ? obj.scaleY : 1;

      if (obj.arrowStart) {
        if (obj.arrowStart.x > maxX) maxX = obj.arrowStart.x + strokePad;
        if (obj.arrowStart.y > maxY) maxY = obj.arrowStart.y + strokePad;
      }
      if (obj.arrowEnd) {
        if (obj.arrowEnd.x > maxX) maxX = obj.arrowEnd.x + strokePad;
        if (obj.arrowEnd.y > maxY) maxY = obj.arrowEnd.y + strokePad;
      }
      if (obj.curveControl) {
        if (obj.curveControl.x > maxX) maxX = obj.curveControl.x + strokePad;
        if (obj.curveControl.y > maxY) maxY = obj.curveControl.y + strokePad;
      }

      if (obj.type === "line" || obj.customType === "line") {
        const x1 = obj.x1 !== undefined ? obj.x1 : left;
        const y1 = obj.y1 !== undefined ? obj.y1 : top;
        const x2 = obj.x2 !== undefined ? obj.x2 : left + (obj.width || 0);
        const y2 = obj.y2 !== undefined ? obj.y2 : top + (obj.height || 0);
        if (x1 > maxX) maxX = x1 + strokePad;
        if (x2 > maxX) maxX = x2 + strokePad;
        if (y1 > maxY) maxY = y1 + strokePad;
        if (y2 > maxY) maxY = y2 + strokePad;
      }

      const rawW = obj.width !== undefined ? obj.width : (obj.rx ? obj.rx * 2 : 0);
      const rawH = obj.height !== undefined ? obj.height : (obj.ry ? obj.ry * 2 : 0);
      const scaledW = rawW * scaleX;
      const scaledH = rawH * scaleY;

      const angle = (obj.angle || 0) * (Math.PI / 180);
      let boundW = scaledW;
      let boundH = scaledH;
      if (angle !== 0) {
        boundW = Math.abs(scaledW * Math.cos(angle)) + Math.abs(scaledH * Math.sin(angle));
        boundH = Math.abs(scaledW * Math.sin(angle)) + Math.abs(scaledH * Math.cos(angle));
      }

      const right = left + boundW + strokePad;
      const bottom = top + boundH + strokePad;

      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    });
  }

  return {
    width: Math.max(origW, Math.ceil(maxX)),
    height: Math.max(origH, Math.ceil(maxY)),
  };
}

/**
 * Convert canvas_data JSON into a full-resolution static PNG data URL.
 * Renders all shapes, custom arrows, curved arrows, textboxes, and embedded images
 * with native 1:1 pixel fidelity, eliminating live canvas print artifacts and SVG CORS issues.
 */
export async function convertCanvasDataToPng(
  canvasDataStr: string,
  targetWidth?: number,
  targetHeight?: number
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!canvasDataStr) return null;

  try {
    const parsed = typeof canvasDataStr === "string" ? JSON.parse(canvasDataStr) : canvasDataStr;
    if (!parsed || !parsed.objects || parsed.objects.length === 0) {
      return null;
    }

    const fabric = await getFabric();
    if (!fabric) return null;

    const refW = parsed.canvasWidth || targetWidth || 800;
    const refH = parsed.canvasHeight || targetHeight || 260;
    const targetW = targetWidth || refW;
    const targetH = targetHeight || refH;

    const denormalizedObjects = parsed.objects.map((obj: any) =>
      denormalizeObjectForTarget(obj, targetW, targetH, refW, refH)
    );

    const denormalizedPayload = {
      ...parsed,
      canvasWidth: targetW,
      canvasHeight: targetH,
      objects: denormalizedObjects,
    };

    const { width, height } = computeBounds(denormalizedPayload);
    const canvasW = Math.max(targetW, width);
    const canvasH = Math.max(targetH, height);

    // Create an off-screen canvas element
    const canvasEl = document.createElement("canvas");
    canvasEl.width = canvasW;
    canvasEl.height = canvasH;

    const staticCanvas = new fabric.StaticCanvas(canvasEl, {
      width: canvasW,
      height: canvasH,
      backgroundColor: "transparent",
      enableRetinaScaling: true,
    });

    return await new Promise<{ dataUrl: string; width: number; height: number } | null>((resolve) => {
      staticCanvas.loadFromJSON(denormalizedPayload, async () => {
        try {
          // 1. Wait for any embedded fabric.Image instances to finish loading/decoding
          const objects = staticCanvas.getObjects();
          const imagePromises: Promise<void>[] = [];

          objects.forEach((obj: any) => {
            if (obj.type === "image" || obj.customType === "image") {
              const el = obj._element;
              if (el && (!el.complete || el.naturalWidth === 0)) {
                imagePromises.push(
                  new Promise<void>((imgResolve) => {
                    el.onload = () => imgResolve();
                    el.onerror = () => imgResolve();
                    setTimeout(imgResolve, 3000);
                  })
                );
              }
            }

            // 2. Reconstruct shape text labels (boxes / circles)
            if (
              obj.labelText &&
              (obj.customType === "box" ||
                obj.customType === "circle" ||
                obj.type === "rect" ||
                obj.type === "ellipse")
            ) {
              const center = obj.getCenterPoint ? obj.getCenterPoint() : {
                x: obj.left + (obj.getScaledWidth ? obj.getScaledWidth() / 2 : (obj.width || 0) / 2),
                y: obj.top + (obj.getScaledHeight ? obj.getScaledHeight() / 2 : (obj.height || 0) / 2),
              };
              const w = obj.getScaledWidth ? obj.getScaledWidth() : (obj.width || 0);
              const h = obj.getScaledHeight ? obj.getScaledHeight() : (obj.height || 0);
              const fontSize = Math.max(13, Math.min(22, Math.floor(h * 0.32)));

              const labelObj = new fabric.Textbox(obj.labelText, {
                left: center.x,
                top: center.y,
                width: Math.max(20, w - 16),
                fontSize,
                fontFamily: "'Kalam', 'Patrick Hand', 'Caveat', cursive",
                fontWeight: "bold",
                fill: obj.stroke || "#1e293b",
                textAlign: "center",
                originX: "center",
                originY: "center",
                angle: obj.angle || 0,
                splitByGrapheme: true,
              });

              staticCanvas.add(labelObj);
              staticCanvas.bringToFront(labelObj);
            }
          });

          if (imagePromises.length > 0) {
            await Promise.all(imagePromises);
          }

          staticCanvas.renderAll();

          // 3. Export high-res PNG (2x resolution for sharp print quality)
          const dataUrl = staticCanvas.toDataURL({
            format: "png",
            multiplier: 2,
            quality: 1,
          });

          staticCanvas.dispose();
          resolve({ dataUrl, width: canvasW, height: canvasH });
        } catch (e) {
          console.error("Error generating PNG from canvas for print:", e);
          staticCanvas.dispose();
          resolve(null);
        }
      });
    });
  } catch (err) {
    console.error("Failed to parse canvas data for print:", err);
    return null;
  }
}

/**
 * Prepares note data for print layout and returns an array of printable note items.
 */
export async function prepareNotesForPrint(
  notes: KnowledgeNote[],
  measuredTargetWidth?: number
): Promise<PrintNoteData[]> {
  const printNotes: PrintNoteData[] = [];
  const DEFAULT_TARGET_PRINT_WIDTH = 640;

  for (let idx = 0; idx < notes.length; idx++) {
    const note = notes[idx];
    const tagStyle = PRINT_TAG_STYLES[note.label?.toLowerCase()] || PRINT_TAG_STYLES["note"];
    const formattedDate = formatPrintDate(note.created_at);
    let canvasImageOverlayUrl: string | null = null;
    let canvasWidth = measuredTargetWidth || DEFAULT_TARGET_PRINT_WIDTH;
    let canvasHeight = 120;
    let minCanvasHeight = 0;

    if (note.canvas_data) {
      let authoredW = DEFAULT_TARGET_PRINT_WIDTH;
      let authoredH = 260;
      try {
        const parsed = typeof note.canvas_data === "string" ? JSON.parse(note.canvas_data) : note.canvas_data;
        if (parsed.canvasWidth) authoredW = parsed.canvasWidth;
        if (parsed.canvasHeight) authoredH = parsed.canvasHeight;
      } catch {
        // ignore
      }

      const effectiveTargetW = measuredTargetWidth || authoredW || DEFAULT_TARGET_PRINT_WIDTH;
      const res = await convertCanvasDataToPng(note.canvas_data, effectiveTargetW, authoredH);
      if (res) {
        canvasImageOverlayUrl = res.dataUrl;
        canvasWidth = res.width;
        canvasHeight = res.height;
        minCanvasHeight = res.height;
      }
    }

    const scaleFactor = canvasWidth > (measuredTargetWidth || DEFAULT_TARGET_PRINT_WIDTH)
      ? (measuredTargetWidth || DEFAULT_TARGET_PRINT_WIDTH) / canvasWidth
      : 1;

    printNotes.push({
      note,
      index: idx,
      canvasImageOverlayUrl,
      canvasWidth,
      canvasHeight,
      minCanvasHeight,
      scaleFactor,
      tagStyle,
      formattedDate,
    });
  }

  return printNotes;
}

/**
 * Ensure all fonts and images in the document are fully loaded before opening the print dialog.
 */
export async function waitForPrintReadiness(): Promise<void> {
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  const imgs = Array.from(document.querySelectorAll("img"));
  if (imgs.length > 0) {
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && (img.naturalWidth > 0 || img.src.startsWith("data:"))) {
              resolve();
            } else {
              const onDone = () => resolve();
              img.addEventListener("load", onDone, { once: true });
              img.addEventListener("error", onDone, { once: true });
              setTimeout(onDone, 3000);
            }
          })
      )
    );
  }

  // Wait 1 animation frame for CSS & DOM layout rendering to settle
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 120)));
}
