import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { getFabric } from "../../utils/fabricLoader";
import {
  extractNormalizedCanvasPayload,
  denormalizeObjectForTarget,
  rescaleFabricCanvasObjects,
  updateObjectNormalizedCoordinates,
} from "../../utils/canvasNormalization";

export interface NoteCanvasLayerHandle {
  getCanvasData: () => string | null;
  exportCanvasPNG: () => Promise<string>;
  addImage: (url: string, name?: string) => Promise<void>;
  bringSelectedToFront: () => void;
  sendSelectedToBack: () => void;
  bringSelectedForward: () => void;
  sendSelectedBackward: () => void;
  deleteSelected: () => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  clearCanvas: () => void;
  hasObjects: () => boolean;
  editSelectedShapeText: () => void;
}

export interface NoteCanvasLayerProps {
  initialCanvasData?: string | null;
  activeTool: "select" | "line" | "arrow" | "curved-arrow" | "box" | "circle";
  strokeColor: string;
  strokeWidth: number;
  fillMode?: "none" | "tint";
  onToolChange?: (tool: "select" | "line" | "arrow" | "curved-arrow" | "box" | "circle") => void;
  onSelectionChange?: (hasSelection: boolean, selectionType?: string, canAddText?: boolean) => void;
  onBlankClick?: (e: MouseEvent | TouchEvent) => void;
  readOnly?: boolean;
  className?: string;
}

// Compute straight arrow path string
function createArrowPathString(x1: number, y1: number, x2: number, y2: number, strokeWidth: number): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.max(14, strokeWidth * 3.5);
  const leftX = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const leftY = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const rightX = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const rightY = y2 - headLen * Math.sin(angle + Math.PI / 6);

  return `M ${x1} ${y1} L ${x2} ${y2} M ${leftX} ${leftY} L ${x2} ${y2} L ${rightX} ${rightY}`;
}

// Compute curved arrow path string
function createCurvedArrowPathString(
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  strokeWidth: number
): string {
  const angle = Math.atan2(y2 - cy, x2 - cx);
  const headLen = Math.max(14, strokeWidth * 3.5);
  const leftX = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const leftY = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const rightX = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const rightY = y2 - headLen * Math.sin(angle + Math.PI / 6);

  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2} M ${leftX} ${leftY} L ${x2} ${y2} L ${rightX} ${rightY}`;
}

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c.split("").map((x) => x + x).join("");
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(99, 102, 241, ${alpha})`;
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

/**
 * Exact coordinate conversion relative to canvas bounding box.
 */
function getCanvasPointer(canvas: any, e: MouseEvent | TouchEvent | PointerEvent | any): { x: number; y: number } {
  const canvasEl = canvas?.upperCanvasEl || canvas?.lowerCanvasEl;
  if (!canvasEl) return { x: 0, y: 0 };

  const rect = canvasEl.getBoundingClientRect();
  let clientX = 0;
  let clientY = 0;

  if (e && "touches" in e && e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if (e && "changedTouches" in e && e.changedTouches && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  } else if (e && typeof e.clientX === "number") {
    clientX = e.clientX;
    clientY = e.clientY;
  } else if (e && e.e) {
    return getCanvasPointer(canvas, e.e);
  }

  const scaleX = rect.width > 0 ? canvas.getWidth() / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.getHeight() / rect.height : 1;

  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;

  return { x, y };
}

function getShapeBounds(shape: any): { centerX: number; centerY: number; width: number; height: number } {
  if (!shape) return { centerX: 0, centerY: 0, width: 0, height: 0 };
  const center = shape.getCenterPoint ? shape.getCenterPoint() : {
    x: shape.left + (shape.getScaledWidth ? shape.getScaledWidth() / 2 : (shape.width || 0) / 2),
    y: shape.top + (shape.getScaledHeight ? shape.getScaledHeight() / 2 : (shape.height || 0) / 2),
  };
  const width = shape.getScaledWidth ? shape.getScaledWidth() : (shape.width || 0);
  const height = shape.getScaledHeight ? shape.getScaledHeight() : (shape.height || 0);
  return { centerX: center.x, centerY: center.y, width, height };
}

function updateShapeLabel(canvas: any, shape: any, text: string) {
  const fabric = (window as any).fabric;
  if (!fabric || !canvas || !shape) return;

  shape.labelText = text;

  if (!text || !text.trim()) {
    if (shape.labelObj) {
      canvas.remove(shape.labelObj);
      shape.labelObj = null;
      canvas.requestRenderAll();
    }
    return;
  }

  const bounds = getShapeBounds(shape);
  const fontSize = Math.max(13, Math.min(22, Math.floor(bounds.height * 0.32)));

  if (!shape.labelObj) {
    const labelObj = new fabric.Textbox(text, {
      left: bounds.centerX,
      top: bounds.centerY,
      width: Math.max(20, bounds.width - 16),
      fontSize,
      fontFamily: "'Kalam', 'Patrick Hand', 'Caveat', cursive",
      fontWeight: "bold",
      fill: shape.stroke || "#1e293b",
      textAlign: "center",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
      editable: false,
      name: "shape-label",
      splitByGrapheme: true,
      angle: shape.angle || 0,
    });

    shape.labelObj = labelObj;
    labelObj.parentShape = shape;
    canvas.add(labelObj);
    canvas.bringToFront(labelObj);
  } else {
    shape.labelObj.set({
      text,
      left: bounds.centerX,
      top: bounds.centerY,
      width: Math.max(20, bounds.width - 16),
      fontSize,
      fill: shape.stroke || "#1e293b",
      angle: shape.angle || 0,
    });
    shape.labelObj.setCoords();
    canvas.bringToFront(shape.labelObj);
  }
  canvas.requestRenderAll();
}

function attachShapeListeners(canvas: any, shape: any) {
  if (!shape || shape._hasCustomListeners) return;
  shape._hasCustomListeners = true;

  const syncLabel = () => {
    if (shape.labelObj) {
      const bounds = getShapeBounds(shape);
      const fontSize = Math.max(13, Math.min(22, Math.floor(bounds.height * 0.32)));
      shape.labelObj.set({
        left: bounds.centerX,
        top: bounds.centerY,
        width: Math.max(20, bounds.width - 16),
        fontSize,
        angle: shape.angle || 0,
      });
      shape.labelObj.setCoords();
      canvas.bringToFront(shape.labelObj);
    }
  };

  shape.on("moving", syncLabel);
  shape.on("scaling", syncLabel);
  shape.on("rotating", syncLabel);
}

const NoteCanvasLayer = forwardRef<NoteCanvasLayerHandle, NoteCanvasLayerProps>(
  (
    {
      initialCanvasData,
      activeTool,
      strokeColor,
      strokeWidth,
      fillMode = "none",
      onToolChange,
      onSelectionChange,
      onBlankClick,
      readOnly = false,
      className = "",
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<any>(null);
    const isDrawingRef = useRef(false);
    const startPointRef = useRef<{ x: number; y: number } | null>(null);
    const activeDrawingObjRef = useRef<any>(null);
    const curveNodeRef = useRef<any>(null);
    const activeCurveObjRef = useRef<any>(null);
    const loadedDataRef = useRef<string | null>(null);
    const currentDimensionsRef = useRef<{ width: number; height: number }>({ width: 800, height: 260 });

    // Shape label inline editing state
    const [editingShape, setEditingShape] = useState<any | null>(null);
    const [editingText, setEditingText] = useState<string>("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Keep latest props & callbacks in refs for stable listeners
    const activeToolRef = useRef(activeTool);
    activeToolRef.current = activeTool;
    const strokeColorRef = useRef(strokeColor);
    strokeColorRef.current = strokeColor;
    const strokeWidthRef = useRef(strokeWidth);
    strokeWidthRef.current = strokeWidth;
    const fillModeRef = useRef(fillMode);
    fillModeRef.current = fillMode;
    const onToolChangeRef = useRef(onToolChange);
    onToolChangeRef.current = onToolChange;
    const onSelectionChangeRef = useRef(onSelectionChange);
    onSelectionChangeRef.current = onSelectionChange;
    const onBlankClickRef = useRef(onBlankClick);
    onBlankClickRef.current = onBlankClick;
    const readOnlyRef = useRef(readOnly);
    readOnlyRef.current = readOnly;

    // Remove active curve control node
    const removeCurveControlNode = useCallback(() => {
      if (curveNodeRef.current && fabricCanvasRef.current) {
        fabricCanvasRef.current.remove(curveNodeRef.current);
        curveNodeRef.current = null;
        activeCurveObjRef.current = null;
        fabricCanvasRef.current.requestRenderAll();
      }
    }, []);

    // Setup custom controls & resize handles on Fabric objects
    const configureObjectControls = useCallback((obj: any) => {
      if (!obj) return;
      const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
      obj.set({
        transparentCorners: false,
        cornerColor: "#6366f1",
        cornerStrokeColor: "#ffffff",
        cornerSize: isTouch ? 13 : 9,
        touchCornerSize: 26,
        cornerStyle: "circle",
        padding: 6,
        borderColor: "#818cf8",
        borderDashArray: [4, 4],
        borderScaleFactor: 1.5,
        uniformScaling: false,
        strokeUniform: true,
      });
      // Enable all 8 resize handles + rotation handle
      obj.setControlsVisibility({
        tl: true,
        tr: true,
        br: true,
        bl: true,
        ml: true,
        mt: true,
        mr: true,
        mb: true,
        mtr: true,
      });
    }, []);

    // Start inline editing of a shape's text label
    const startEditingShapeText = useCallback((shape: any) => {
      if (!shape || readOnlyRef.current) return;
      const isContainer =
        shape.customType === "box" ||
        shape.customType === "circle" ||
        shape.type === "rect" ||
        shape.type === "ellipse";

      if (!isContainer) return;

      setEditingShape(shape);
      setEditingText(shape.labelText || "");
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 50);
    }, []);

    // Finish inline editing
    const finishEditingShapeText = useCallback(() => {
      if (!editingShape) return;
      const canvas = fabricCanvasRef.current;
      const targetShape = editingShape;
      const newText = editingText.trim();

      setEditingShape(null);
      setEditingText("");

      if (canvas) {
        updateShapeLabel(canvas, targetShape, newText);
        attachShapeListeners(canvas, targetShape);
        canvas.setActiveObject(targetShape);
        canvas.requestRenderAll();
      }
    }, [editingShape, editingText]);

    // Show curve control node for a selected curved arrow
    const showCurveControlNode = useCallback((curvedArrowObj: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !curvedArrowObj || curvedArrowObj.customType !== "curved-arrow" || readOnlyRef.current) return;

      removeCurveControlNode();
      const fabric = (window as any).fabric;
      if (!fabric) return;

      const p1 = curvedArrowObj.arrowStart || { x: 50, y: 50 };
      const p2 = curvedArrowObj.arrowEnd || { x: 200, y: 150 };
      const cp = curvedArrowObj.curveControl || {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2 - 40,
      };

      const handleNode = new fabric.Circle({
        left: cp.x,
        top: cp.y,
        radius: 7,
        fill: "#4f46e5",
        stroke: "#ffffff",
        strokeWidth: 2,
        originX: "center",
        originY: "center",
        hasControls: false,
        hasBorders: false,
        selectable: true,
        hoverCursor: "grab",
        moveCursor: "grabbing",
        name: "curve-control-handle",
      });

      handleNode.on("moving", () => {
        const newCp = { x: handleNode.left, y: handleNode.top };
        curvedArrowObj.curveControl = newCp;

        const updatedPathStr = createCurvedArrowPathString(
          curvedArrowObj.arrowStart.x,
          curvedArrowObj.arrowStart.y,
          newCp.x,
          newCp.y,
          curvedArrowObj.arrowEnd.x,
          curvedArrowObj.arrowEnd.y,
          curvedArrowObj.strokeWidth || 3
        );

        const temp = new fabric.Path(updatedPathStr);
        curvedArrowObj.set({
          path: temp.path,
          width: temp.width,
          height: temp.height,
          pathOffset: temp.pathOffset,
          left: temp.left,
          top: temp.top,
        });
        curvedArrowObj.setCoords();
        canvas.requestRenderAll();
      });

      canvas.add(handleNode);
      canvas.bringToFront(handleNode);
      curveNodeRef.current = handleNode;
      activeCurveObjRef.current = curvedArrowObj;
      canvas.requestRenderAll();
    }, [removeCurveControlNode]);

    // Initialize Fabric Canvas - ONCE on mount
    useEffect(() => {
      let isMounted = true;

      getFabric().then((fabric) => {
        if (!isMounted || !canvasElRef.current || !containerRef.current) return;
        if (fabricCanvasRef.current) return;

        const parent = containerRef.current.parentElement;
        const width = containerRef.current.clientWidth || parent?.clientWidth || 800;
        const height = Math.max(200, containerRef.current.clientHeight || parent?.clientHeight || 260);
        currentDimensionsRef.current = { width, height };

        const canvas = new fabric.Canvas(canvasElRef.current, {
          width,
          height,
          defaultCursor: "text",
          selection: !readOnlyRef.current && activeToolRef.current === "select",
          preserveObjectStacking: true,
          renderOnAddRemove: true,
          stopContextMenu: true,
          fireRightClick: true,
          allowTouchScrolling: false,
        });

        fabricCanvasRef.current = canvas;

        canvas.getPointer = function (e: any, ignoreZoom?: boolean) {
          const coords = getCanvasPointer(this, e);
          if (!ignoreZoom && this.viewportTransform) {
            return fabric.util.transformPoint(coords, fabric.util.invertTransform(this.viewportTransform));
          }
          return coords;
        };

        // Custom Delete Control on active selection
        try {
          if (fabric.Object.prototype.controls && !readOnlyRef.current) {
            const deleteIcon =
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='%23ffffff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10' fill='%23ef4444'/><line x1='15' y1='9' x2='9' y2='15'/><line x1='9' y1='9' x2='15' y2='15'/></svg>";
            const deleteImg = document.createElement("img");
            deleteImg.src = deleteIcon;

            fabric.Object.prototype.controls.deleteControl = new fabric.Control({
              x: 0.5,
              y: -0.5,
              offsetY: -12,
              offsetX: 12,
              cursorStyle: "pointer",
              mouseUpHandler: (_eventData: any, transformData: any) => {
                const target = transformData.target;
                if (target && canvas) {
                  if (target.labelObj) {
                    canvas.remove(target.labelObj);
                    target.labelObj = null;
                  }
                  canvas.remove(target);
                  canvas.discardActiveObject();
                  canvas.requestRenderAll();
                  removeCurveControlNode();
                }
                return true;
              },
              render: (ctx: CanvasRenderingContext2D, left: number, top: number) => {
                const size = 20;
                ctx.save();
                ctx.translate(left, top);
                ctx.drawImage(deleteImg, -size / 2, -size / 2, size, size);
                ctx.restore();
              },
            });
          }
        } catch (e) {
          console.warn("Could not attach custom delete control:", e);
        }

        const handleSelectionUpdate = (e: any) => {
          const selected = e.selected?.[0];
          if (selected) {
            configureObjectControls(selected);
            if (selected.customType === "curved-arrow") {
              showCurveControlNode(selected);
            } else {
              removeCurveControlNode();
            }
            const isContainer =
              selected.customType === "box" ||
              selected.customType === "circle" ||
              selected.type === "rect" ||
              selected.type === "ellipse";
            onSelectionChangeRef.current?.(true, selected?.type || selected?.customType, isContainer);
          }
        };

        canvas.on("selection:created", handleSelectionUpdate);
        canvas.on("selection:updated", handleSelectionUpdate);

        canvas.on("selection:cleared", () => {
          removeCurveControlNode();
          onSelectionChangeRef.current?.(false, undefined, false);
        });

        // Track object modifications to maintain fresh normalized coordinates
        canvas.on("object:modified", (opt: any) => {
          const target = opt.target;
          if (!target) return;
          const w = canvas.getWidth() || currentDimensionsRef.current.width || 800;
          const h = canvas.getHeight() || currentDimensionsRef.current.height || 260;
          updateObjectNormalizedCoordinates(target, w, h);
        });

        // Double-click to edit shape text label
        canvas.on("mouse:dblclick", (opt: any) => {
          if (readOnlyRef.current) return;
          const target = opt.target;
          if (!target) return;
          const actualTarget = target.parentShape || target;
          if (
            actualTarget.customType === "box" ||
            actualTarget.customType === "circle" ||
            actualTarget.type === "rect" ||
            actualTarget.type === "ellipse"
          ) {
            startEditingShapeText(actualTarget);
          }
        });

        // ── POINTER & DRAWING EVENT HANDLERS ──
        canvas.on("mouse:down", (opt: any) => {
          if (readOnlyRef.current) return;
          const currentTool = activeToolRef.current;

          // If Select tool is active:
          if (currentTool === "select") {
            // Clicked on a shape or control handle -> Fabric manages it
            if (opt.target && (opt.target.name === "curve-control-handle" || opt.target.selectable)) {
              return;
            }

            // Clicked on blank note surface with Select active
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            onBlankClickRef.current?.(opt.e);
            return;
          }

          // A drawing tool is active: start drawing shape
          const pointer = getCanvasPointer(canvas, opt.e);
          isDrawingRef.current = true;
          startPointRef.current = { x: pointer.x, y: pointer.y };

          const sColor = strokeColorRef.current;
          const sWidth = strokeWidthRef.current;
          const fMode = fillModeRef.current;
          const fColor = fMode === "tint" ? hexToRgba(sColor, 0.14) : "transparent";

          if (currentTool === "line") {
            const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
              stroke: sColor,
              strokeWidth: sWidth,
              strokeLineCap: "round",
              selectable: false,
              evented: false,
              strokeUniform: true,
              uniformScaling: false,
              customType: "line",
            });
            activeDrawingObjRef.current = line;
            canvas.add(line);
          } else if (currentTool === "arrow") {
            const pathStr = createArrowPathString(pointer.x, pointer.y, pointer.x + 1, pointer.y + 1, sWidth);
            const arrow = new fabric.Path(pathStr, {
              stroke: sColor,
              strokeWidth: sWidth,
              fill: "transparent",
              strokeLineCap: "round",
              strokeLineJoin: "round",
              selectable: false,
              evented: false,
              strokeUniform: true,
              uniformScaling: false,
              customType: "arrow",
              arrowStart: { x: pointer.x, y: pointer.y },
              arrowEnd: { x: pointer.x + 1, y: pointer.y + 1 },
            });
            activeDrawingObjRef.current = arrow;
            canvas.add(arrow);
          } else if (currentTool === "curved-arrow") {
            const cp = { x: pointer.x + 20, y: pointer.y - 30 };
            const pathStr = createCurvedArrowPathString(
              pointer.x,
              pointer.y,
              cp.x,
              cp.y,
              pointer.x + 1,
              pointer.y + 1,
              sWidth
            );
            const curvedArrow = new fabric.Path(pathStr, {
              stroke: sColor,
              strokeWidth: sWidth,
              fill: "transparent",
              strokeLineCap: "round",
              strokeLineJoin: "round",
              selectable: false,
              evented: false,
              strokeUniform: true,
              uniformScaling: false,
              customType: "curved-arrow",
              arrowStart: { x: pointer.x, y: pointer.y },
              arrowEnd: { x: pointer.x + 1, y: pointer.y + 1 },
              curveControl: cp,
            });
            activeDrawingObjRef.current = curvedArrow;
            canvas.add(curvedArrow);
          } else if (currentTool === "box") {
            const rect = new fabric.Rect({
              left: pointer.x,
              top: pointer.y,
              width: 1,
              height: 1,
              stroke: sColor,
              strokeWidth: sWidth,
              fill: fColor,
              rx: 6,
              ry: 6,
              selectable: false,
              evented: false,
              strokeUniform: true,
              uniformScaling: false,
              customType: "box",
            });
            activeDrawingObjRef.current = rect;
            canvas.add(rect);
          } else if (currentTool === "circle") {
            const ellipse = new fabric.Ellipse({
              left: pointer.x,
              top: pointer.y,
              rx: 1,
              ry: 1,
              stroke: sColor,
              strokeWidth: sWidth,
              fill: fColor,
              selectable: false,
              evented: false,
              strokeUniform: true,
              uniformScaling: false,
              customType: "circle",
            });
            activeDrawingObjRef.current = ellipse;
            canvas.add(ellipse);
          }
          canvas.requestRenderAll();
        });

        canvas.on("mouse:move", (opt: any) => {
          if (!isDrawingRef.current || !startPointRef.current || !activeDrawingObjRef.current) return;

          const pointer = getCanvasPointer(canvas, opt.e);
          const start = startPointRef.current;
          const currentTool = activeToolRef.current;
          const sWidth = strokeWidthRef.current;

          if (currentTool === "line") {
            const line = activeDrawingObjRef.current;
            line.set({ x2: pointer.x, y2: pointer.y });
            line.setCoords();
            canvas.requestRenderAll();
          } else if (currentTool === "arrow") {
            const arrow = activeDrawingObjRef.current;
            const updatedPathStr = createArrowPathString(start.x, start.y, pointer.x, pointer.y, sWidth);
            const temp = new fabric.Path(updatedPathStr);
            arrow.set({
              path: temp.path,
              width: temp.width,
              height: temp.height,
              pathOffset: temp.pathOffset,
              left: temp.left,
              top: temp.top,
              arrowStart: { x: start.x, y: start.y },
              arrowEnd: { x: pointer.x, y: pointer.y },
            });
            arrow.setCoords();
            canvas.requestRenderAll();
          } else if (currentTool === "curved-arrow") {
            const curvedArrow = activeDrawingObjRef.current;
            const midX = (start.x + pointer.x) / 2;
            const midY = (start.y + pointer.y) / 2;
            const dx = pointer.x - start.x;
            const dy = pointer.y - start.y;
            const dist = Math.hypot(dx, dy);
            const normalX = -dy / (dist || 1);
            const normalY = dx / (dist || 1);
            const bendOffset = Math.min(60, Math.max(25, dist * 0.25));
            const cp = {
              x: midX + normalX * bendOffset,
              y: midY + normalY * bendOffset,
            };

            const updatedPathStr = createCurvedArrowPathString(
              start.x,
              start.y,
              cp.x,
              cp.y,
              pointer.x,
              pointer.y,
              sWidth
            );
            const temp = new fabric.Path(updatedPathStr);
            curvedArrow.set({
              path: temp.path,
              width: temp.width,
              height: temp.height,
              pathOffset: temp.pathOffset,
              left: temp.left,
              top: temp.top,
              arrowStart: { x: start.x, y: start.y },
              arrowEnd: { x: pointer.x, y: pointer.y },
              curveControl: cp,
            });
            curvedArrow.setCoords();
            canvas.requestRenderAll();
          } else if (currentTool === "box") {
            const rect = activeDrawingObjRef.current;
            const left = Math.min(start.x, pointer.x);
            const top = Math.min(start.y, pointer.y);
            const width = Math.max(1, Math.abs(pointer.x - start.x));
            const height = Math.max(1, Math.abs(pointer.y - start.y));
            rect.set({ left, top, width, height });
            rect.setCoords();
            canvas.requestRenderAll();
          } else if (currentTool === "circle") {
            const ellipse = activeDrawingObjRef.current;
            const rx = Math.max(1, Math.abs(pointer.x - start.x) / 2);
            const ry = Math.max(1, Math.abs(pointer.y - start.y) / 2);
            const left = Math.min(start.x, pointer.x);
            const top = Math.min(start.y, pointer.y);
            ellipse.set({
              left,
              top,
              rx,
              ry,
            });
            ellipse.setCoords();
            canvas.requestRenderAll();
          }
        });

        canvas.on("mouse:up", (opt: any) => {
          if (!isDrawingRef.current) return;
          isDrawingRef.current = false;

          const drawingObj = activeDrawingObjRef.current;
          activeDrawingObjRef.current = null;
          startPointRef.current = null;

          if (drawingObj) {
            const sWidth = strokeWidthRef.current;
            const pointer = getCanvasPointer(canvas, opt.e);

            if (drawingObj.customType === "box") {
              if (drawingObj.width < 5 && drawingObj.height < 5) {
                drawingObj.set({
                  left: pointer.x - 70,
                  top: pointer.y - 45,
                  width: 140,
                  height: 90,
                });
              }
              attachShapeListeners(canvas, drawingObj);
            } else if (drawingObj.customType === "circle") {
              if (drawingObj.rx < 3 && drawingObj.ry < 3) {
                drawingObj.set({
                  left: pointer.x - 50,
                  top: pointer.y - 40,
                  rx: 50,
                  ry: 40,
                });
              }
              attachShapeListeners(canvas, drawingObj);
            } else if (drawingObj.customType === "line") {
              const x1 = drawingObj.x1 ?? drawingObj.left;
              const y1 = drawingObj.y1 ?? drawingObj.top;
              const x2 = drawingObj.x2 ?? (drawingObj.left + drawingObj.width);
              const y2 = drawingObj.y2 ?? (drawingObj.top + drawingObj.height);
              if (Math.hypot(x2 - x1, y2 - y1) < 5) {
                drawingObj.set({ x2: x1 + 120, y2: y1 });
              }
            } else if (drawingObj.customType === "arrow") {
              const p1 = drawingObj.arrowStart || { x: drawingObj.left, y: drawingObj.top };
              const p2 = drawingObj.arrowEnd || { x: drawingObj.left + 1, y: drawingObj.top + 1 };
              if (Math.hypot(p2.x - p1.x, p2.y - p1.y) < 5) {
                const endX = p1.x + 120;
                const endY = p1.y;
                const updatedPathStr = createArrowPathString(p1.x, p1.y, endX, endY, sWidth);
                const temp = new fabric.Path(updatedPathStr);
                drawingObj.set({
                  path: temp.path,
                  width: temp.width,
                  height: temp.height,
                  pathOffset: temp.pathOffset,
                  left: temp.left,
                  top: temp.top,
                  arrowStart: p1,
                  arrowEnd: { x: endX, y: endY },
                });
              }
            } else if (drawingObj.customType === "curved-arrow") {
              const p1 = drawingObj.arrowStart || { x: drawingObj.left, y: drawingObj.top };
              const p2 = drawingObj.arrowEnd || { x: drawingObj.left + 1, y: drawingObj.top + 1 };
              if (Math.hypot(p2.x - p1.x, p2.y - p1.y) < 5) {
                const endX = p1.x + 140;
                const endY = p1.y + 20;
                const cp = {
                  x: (p1.x + endX) / 2,
                  y: (p1.y + endY) / 2 - 40,
                };
                const updatedPathStr = createCurvedArrowPathString(
                  p1.x,
                  p1.y,
                  cp.x,
                  cp.y,
                  endX,
                  endY,
                  sWidth
                );
                const temp = new fabric.Path(updatedPathStr);
                drawingObj.set({
                  path: temp.path,
                  width: temp.width,
                  height: temp.height,
                  pathOffset: temp.pathOffset,
                  left: temp.left,
                  top: temp.top,
                  arrowStart: p1,
                  arrowEnd: { x: endX, y: endY },
                  curveControl: cp,
                });
              }
            }

            drawingObj.set({ selectable: true, evented: true });
            configureObjectControls(drawingObj);
            drawingObj._prevLeft = drawingObj.left;
            drawingObj._prevTop = drawingObj.top;
            updateObjectNormalizedCoordinates(drawingObj, canvas.getWidth(), canvas.getHeight());
            drawingObj.setCoords();

            // Re-enable selection on all objects
            canvas.forEachObject((obj: any) => {
              if (obj.name !== "curve-control-handle" && obj.name !== "shape-label") {
                obj.selectable = true;
                obj.evented = true;
              }
            });

            // Select newly drawn shape immediately
            canvas.setActiveObject(drawingObj);
            canvas.requestRenderAll();

            if (drawingObj.customType === "curved-arrow") {
              showCurveControlNode(drawingObj);
            }

            // Automatically switch back to Select tool so the very next click goes to text mode
            onToolChangeRef.current?.("select");
          }
        });

        // Load initial canvas data if present on mount
        if (initialCanvasData) {
          try {
            const parsed = typeof initialCanvasData === "string" ? JSON.parse(initialCanvasData) : initialCanvasData;
            loadedDataRef.current = typeof initialCanvasData === "string" ? initialCanvasData : JSON.stringify(initialCanvasData);
            if (parsed && Array.isArray(parsed.objects)) {
              const refW = parsed.canvasWidth || width;
              const refH = parsed.canvasHeight || height;
              const denormalizedObjects = parsed.objects.map((obj: any) =>
                denormalizeObjectForTarget(obj, width, height, refW, refH)
              );
              const payload = {
                ...parsed,
                canvasWidth: width,
                canvasHeight: height,
                objects: denormalizedObjects,
              };
              canvas.loadFromJSON(payload, () => {
                canvas.getObjects().forEach((obj: any) => {
                  configureObjectControls(obj);
                  if (obj.customType === "box" || obj.customType === "circle" || obj.type === "rect" || obj.type === "ellipse") {
                    attachShapeListeners(canvas, obj);
                    if (obj.labelText) {
                      updateShapeLabel(canvas, obj, obj.labelText);
                    }
                  }
                  if (readOnlyRef.current) {
                    obj.set({ selectable: false, evented: false });
                  }
                });
                canvas.requestRenderAll();
              });
            }
          } catch (err) {
            console.error("Failed to parse initial canvas data:", err);
          }
        }
      });

      return () => {
        isMounted = false;
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }
      };
    }, []);

    // Handle external updates to initialCanvasData
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !initialCanvasData) return;
      const dataStr = typeof initialCanvasData === "string" ? initialCanvasData : JSON.stringify(initialCanvasData);
      if (loadedDataRef.current === dataStr) return;
      loadedDataRef.current = dataStr;

      try {
        const parsed = JSON.parse(dataStr);
        if (parsed && Array.isArray(parsed.objects)) {
          const width = canvas.getWidth() || currentDimensionsRef.current.width || 800;
          const height = canvas.getHeight() || currentDimensionsRef.current.height || 260;
          const refW = parsed.canvasWidth || width;
          const refH = parsed.canvasHeight || height;
          const denormalizedObjects = parsed.objects.map((obj: any) =>
            denormalizeObjectForTarget(obj, width, height, refW, refH)
          );
          const payload = {
            ...parsed,
            canvasWidth: width,
            canvasHeight: height,
            objects: denormalizedObjects,
          };
          canvas.loadFromJSON(payload, () => {
            canvas.getObjects().forEach((obj: any) => {
              configureObjectControls(obj);
              if (obj.customType === "box" || obj.customType === "circle" || obj.type === "rect" || obj.type === "ellipse") {
                attachShapeListeners(canvas, obj);
                if (obj.labelText) {
                  updateShapeLabel(canvas, obj, obj.labelText);
                }
              }
              if (readOnlyRef.current) {
                obj.set({ selectable: false, evented: false });
              }
            });
            canvas.requestRenderAll();
          });
        }
      } catch (err) {
        console.error("Failed to load updated canvas data:", err);
      }
    }, [initialCanvasData, configureObjectControls]);

    // Update canvas selection & interactive state whenever activeTool changes
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      if (activeTool === "select") {
        canvas.selection = !readOnly;
        canvas.defaultCursor = "text";
        canvas.hoverCursor = "move";
        canvas.forEachObject((obj: any) => {
          if (obj.name !== "curve-control-handle" && obj.name !== "shape-label") {
            obj.selectable = !readOnly;
            obj.evented = !readOnly;
          }
        });
      } else {
        canvas.selection = false;
        canvas.discardActiveObject();
        canvas.defaultCursor = "crosshair";
        canvas.hoverCursor = "crosshair";
        canvas.forEachObject((obj: any) => {
          obj.selectable = false;
          obj.evented = false;
        });
        removeCurveControlNode();
      }
      canvas.requestRenderAll();
    }, [activeTool, readOnly, removeCurveControlNode]);

    // Update container / canvas size on window resize or DOM container change
    useEffect(() => {
      function updateCanvasSize() {
        if (!containerRef.current || !fabricCanvasRef.current) return;
        const parent = containerRef.current.parentElement;
        const width = containerRef.current.clientWidth || parent?.clientWidth || 800;
        const height = Math.max(200, containerRef.current.clientHeight || parent?.clientHeight || 260);
        if (width > 0 && height > 0) {
          const oldW = currentDimensionsRef.current.width || width;
          const oldH = currentDimensionsRef.current.height || height;
          if (oldW !== width || oldH !== height) {
            fabricCanvasRef.current.setDimensions({ width, height });
            rescaleFabricCanvasObjects(fabricCanvasRef.current, oldW, oldH, width, height);
            currentDimensionsRef.current = { width, height };
            fabricCanvasRef.current.requestRenderAll();
          }
        }
      }

      window.addEventListener("resize", updateCanvasSize);
      const resizeObserver = new ResizeObserver(updateCanvasSize);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
        if (containerRef.current.parentElement) {
          resizeObserver.observe(containerRef.current.parentElement);
        }
      }

      // Initial check in case layout completed after mount
      const raf = requestAnimationFrame(updateCanvasSize);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", updateCanvasSize);
        resizeObserver.disconnect();
      };
    }, []);

    // Keyboard listener for Delete / Backspace keys to delete active selection
    useEffect(() => {
      function handleKeyDown(e: KeyboardEvent) {
        if (readOnly) return;
        const target = e.target as HTMLElement;
        const isInputField =
          target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

        if (!isInputField && (e.key === "Delete" || e.key === "Backspace")) {
          const canvas = fabricCanvasRef.current;
          if (!canvas) return;
          const activeObjs = canvas.getActiveObjects();
          if (activeObjs && activeObjs.length > 0) {
            e.preventDefault();
            activeObjs.forEach((obj: any) => {
              if (obj.labelObj) {
                canvas.remove(obj.labelObj);
                obj.labelObj = null;
              }
              canvas.remove(obj);
            });
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            removeCurveControlNode();
          }
        }
      }

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [readOnly, removeCurveControlNode]);

    // Live update selection stroke/fill when strokeColor / strokeWidth / fillMode changes
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || readOnly) return;

      const activeObjs = canvas.getActiveObjects();
      if (activeObjs && activeObjs.length > 0) {
        const sColor = strokeColor;
        const sWidth = strokeWidth;
        const fColor = fillMode === "tint" ? hexToRgba(sColor, 0.14) : "transparent";

        activeObjs.forEach((obj: any) => {
          obj.set({ stroke: sColor, strokeWidth: sWidth });
          if (obj.type === "rect" || obj.type === "ellipse" || obj.customType === "box" || obj.customType === "circle") {
            obj.set({ fill: fColor });
            if (obj.labelObj) {
              obj.labelObj.set({ fill: sColor });
            }
          }
        });
        canvas.requestRenderAll();
      }
    }, [strokeColor, strokeWidth, fillMode, readOnly]);

    // Expose methods via Imperative Handle
    useImperativeHandle(ref, () => ({
      getCanvasData: () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return null;

        const handleNode = curveNodeRef.current;
        if (handleNode) {
          canvas.remove(handleNode);
        }

        // Temporarily remove companion label objects from canvas so they don't duplicate when JSON reloads
        const allObjects = canvas.getObjects();
        const labelObjs = allObjects.filter((o: any) => o.name === "shape-label");
        labelObjs.forEach((lo: any) => canvas.remove(lo));

        const payload = extractNormalizedCanvasPayload(canvas);

        // Restore companion label objects & handle node
        labelObjs.forEach((lo: any) => {
          canvas.add(lo);
          canvas.bringToFront(lo);
        });
        if (handleNode) {
          canvas.add(handleNode);
        }

        if (!payload || !payload.objects || payload.objects.length === 0) {
          return null;
        }

        return JSON.stringify(payload);
      },

      exportCanvasPNG: async () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return "";
        const handleNode = curveNodeRef.current;
        if (handleNode) canvas.remove(handleNode);

        const dataUrl = canvas.toDataURL({
          format: "png",
          multiplier: 2,
        });

        if (handleNode) canvas.add(handleNode);
        return dataUrl;
      },

      addImage: async (url: string, name?: string) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const fabric = (window as any).fabric;
        if (!fabric) return;

        return new Promise<void>((resolve, reject) => {
          fabric.Image.fromURL(
            url,
            (img: any) => {
              if (!img) {
                reject(new Error("Failed to load image into canvas"));
                return;
              }

              const maxInitWidth = Math.min(360, (canvas.width || 600) * 0.7);
              const maxInitHeight = 300;
              const scale = Math.min(maxInitWidth / (img.width || 1), maxInitHeight / (img.height || 1), 1);

              img.set({
                left: Math.max(20, ((canvas.width || 600) - (img.width || 1) * scale) / 2),
                top: Math.max(20, ((canvas.height || 400) - (img.height || 1) * scale) / 2),
                scaleX: scale,
                scaleY: scale,
                stroke: "#cbd5e1",
                strokeWidth: 1,
                padding: 4,
                customType: "image",
                name: name || "uploaded-image",
                strokeUniform: true,
                uniformScaling: false,
              });

              configureObjectControls(img);
              updateObjectNormalizedCoordinates(img, canvas.getWidth(), canvas.getHeight());
              canvas.add(img);
              canvas.setActiveObject(img);
              canvas.requestRenderAll();
              resolve();
            },
            { crossOrigin: "anonymous" }
          );
        });
      },

      bringSelectedToFront: () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
          canvas.bringToFront(activeObj);
          if (activeObj.labelObj) canvas.bringToFront(activeObj.labelObj);
          if (curveNodeRef.current) canvas.bringToFront(curveNodeRef.current);
          canvas.requestRenderAll();
        }
      },

      sendSelectedToBack: () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
          canvas.sendToBack(activeObj);
          if (activeObj.labelObj) {
            canvas.sendToBack(activeObj.labelObj);
            canvas.bringForward(activeObj.labelObj);
          }
          canvas.requestRenderAll();
        }
      },

      bringSelectedForward: () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
          canvas.bringForward(activeObj);
          if (activeObj.labelObj) canvas.bringToFront(activeObj.labelObj);
          if (curveNodeRef.current) canvas.bringToFront(curveNodeRef.current);
          canvas.requestRenderAll();
        }
      },

      sendSelectedBackward: () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
          canvas.sendBackwards(activeObj);
          if (activeObj.labelObj) {
            canvas.sendBackwards(activeObj.labelObj);
          }
          canvas.requestRenderAll();
        }
      },

      deleteSelected: () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const activeObjs = canvas.getActiveObjects();
        if (activeObjs && activeObjs.length > 0) {
          activeObjs.forEach((obj: any) => {
            if (obj.labelObj) {
              canvas.remove(obj.labelObj);
              obj.labelObj = null;
            }
            canvas.remove(obj);
          });
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          removeCurveControlNode();
        }
      },

      setStrokeColor: (color: string) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const activeObjs = canvas.getActiveObjects();
        if (activeObjs && activeObjs.length > 0) {
          activeObjs.forEach((obj: any) => {
            obj.set({ stroke: color });
            if (obj.labelObj) {
              obj.labelObj.set({ fill: color });
            }
            if (obj.fill && obj.fill !== "transparent" && obj.fill !== "none") {
              obj.set({ fill: hexToRgba(color, 0.14) });
            }
          });
          canvas.requestRenderAll();
        }
      },

      setStrokeWidth: (width: number) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const activeObjs = canvas.getActiveObjects();
        if (activeObjs && activeObjs.length > 0) {
          activeObjs.forEach((obj: any) => {
            obj.set({ strokeWidth: width });
          });
          canvas.requestRenderAll();
        }
      },

      clearCanvas: () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        canvas.clear();
        removeCurveControlNode();
        canvas.requestRenderAll();
      },

      hasObjects: () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return false;
        return canvas.getObjects().length > 0;
      },

      editSelectedShapeText: () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
          startEditingShapeText(activeObj);
        }
      },
    }));

    const isDrawingMode = activeTool !== "select";
    const editingBounds = editingShape ? getShapeBounds(editingShape) : null;

    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 z-20 ${className} ${readOnly ? "pointer-events-none" : "pointer-events-auto"
          } ${isDrawingMode ? "cursor-crosshair" : "cursor-text"}`}
        style={{ touchAction: "none" }}
      >
        <canvas ref={canvasElRef} />

        {/* Inline shape text editing overlay */}
        {editingShape && editingBounds && (
          <div
            className="absolute z-50 flex items-center justify-center pointer-events-auto"
            style={{
              left: `${editingBounds.centerX}px`,
              top: `${editingBounds.centerY}px`,
              transform: `translate(-50%, -50%) rotate(${editingShape.angle || 0}deg)`,
              width: `${Math.max(70, editingBounds.width - 12)}px`,
              height: `${Math.max(40, editingBounds.height - 12)}px`,
            }}
          >
            <textarea
              ref={textareaRef}
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={finishEditingShapeText}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  finishEditingShapeText();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditingShape(null);
                }
              }}
              placeholder="Add label..."
              className="w-full h-full text-center bg-white/95 rounded-md border-2 border-indigo-500 shadow-xl px-2 py-1 outline-none resize-none font-handwriting leading-tight text-slate-900 placeholder:text-slate-400 select-text"
              style={{
                fontSize: `${Math.max(13, Math.min(22, Math.floor(editingBounds.height * 0.32)))}px`,
              }}
            />
          </div>
        )}
      </div>
    );
  }
);

export default NoteCanvasLayer;
