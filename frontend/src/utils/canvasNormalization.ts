/**
 * Canvas Coordinate Normalization Utility
 * 
 * Normalizes all Fabric.js shape and drawing coordinates to relative [0..1] fractions of container dimensions,
 * and denormalizes them back to exact pixel values for any target container width/height (mobile, desktop, print/PDF).
 */

export interface NormalizedLineData {
  customType: "line";
  normX1: number;
  normY1: number;
  normX2: number;
  normY2: number;
  stroke: string;
  normStrokeWidth: number;
  strokeLineCap?: string;
}

export interface NormalizedArrowData {
  customType: "arrow";
  normArrowStart: { x: number; y: number };
  normArrowEnd: { x: number; y: number };
  stroke: string;
  normStrokeWidth: number;
}

export interface NormalizedCurvedArrowData {
  customType: "curved-arrow";
  normArrowStart: { x: number; y: number };
  normArrowEnd: { x: number; y: number };
  normCurveControl: { x: number; y: number };
  stroke: string;
  normStrokeWidth: number;
}

export interface NormalizedBoxData {
  customType: "box";
  normLeft: number;
  normTop: number;
  normWidth: number;
  normHeight: number;
  stroke: string;
  fill: string;
  normStrokeWidth: number;
  angle: number;
  labelText?: string;
}

export interface NormalizedCircleData {
  customType: "circle";
  normLeft: number;
  normTop: number;
  normRx: number;
  normRy: number;
  stroke: string;
  fill: string;
  normStrokeWidth: number;
  angle: number;
  labelText?: string;
}

export interface NormalizedImageData {
  customType: "image";
  normLeft: number;
  normTop: number;
  normWidth: number;
  normHeight: number;
  angle: number;
  src: string;
  name?: string;
}

export interface NormalizedCanvasPayload {
  version: 2;
  normalized: true;
  canvasWidth: number;
  canvasHeight: number;
  objects: any[];
}

/**
 * Generate SVG path string for straight arrow
 */
export function createArrowPathString(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeWidth: number
): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.max(12, strokeWidth * 3.5);
  const leftX = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const leftY = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const rightX = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const rightY = y2 - headLen * Math.sin(angle + Math.PI / 6);

  return `M ${x1} ${y1} L ${x2} ${y2} M ${leftX} ${leftY} L ${x2} ${y2} L ${rightX} ${rightY}`;
}

/**
 * Generate SVG path string for quadratic Bezier curved arrow
 */
export function createCurvedArrowPathString(
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  strokeWidth: number
): string {
  const angle = Math.atan2(y2 - cy, x2 - cx);
  const headLen = Math.max(12, strokeWidth * 3.5);
  const leftX = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const leftY = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const rightX = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const rightY = y2 - headLen * Math.sin(angle + Math.PI / 6);

  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2} M ${leftX} ${leftY} L ${x2} ${y2} L ${rightX} ${rightY}`;
}

/**
 * Convert raw fabric canvas objects into normalized JSON payload
 */
export function extractNormalizedCanvasPayload(canvas: any): NormalizedCanvasPayload | null {
  if (!canvas) return null;

  const width = canvas.getWidth() || 800;
  const height = canvas.getHeight() || 260;
  const allObjects = canvas.getObjects();

  // Filter out internal control handles and companion text labels (companion labels are restored from shape.labelText)
  const serializableObjects = allObjects.filter(
    (o: any) => o.name !== "curve-control-handle" && o.name !== "shape-label"
  );

  if (serializableObjects.length === 0) {
    return null;
  }

  const normalizedObjects = serializableObjects.map((obj: any) => {
    const customType = obj.customType || obj.type;
    const strokeWidth = obj.strokeWidth || 3;
    const normStrokeWidth = strokeWidth / width;

    if (customType === "line") {
      const x1 = obj.x1 !== undefined ? obj.x1 : obj.left;
      const y1 = obj.y1 !== undefined ? obj.y1 : obj.top;
      const x2 = obj.x2 !== undefined ? obj.x2 : obj.left + (obj.width || 0);
      const y2 = obj.y2 !== undefined ? obj.y2 : obj.top + (obj.height || 0);

      return {
        type: "line",
        customType: "line",
        normX1: x1 / width,
        normY1: y1 / height,
        normX2: x2 / width,
        normY2: y2 / height,
        stroke: obj.stroke || "#4f46e5",
        strokeWidth,
        normStrokeWidth,
        strokeLineCap: obj.strokeLineCap || "round",
      };
    }

    if (customType === "arrow") {
      const p1 = obj.arrowStart || { x: obj.left, y: obj.top };
      const p2 = obj.arrowEnd || { x: obj.left + (obj.width || 100), y: obj.top };

      return {
        type: "path",
        customType: "arrow",
        normArrowStart: { x: p1.x / width, y: p1.y / height },
        normArrowEnd: { x: p2.x / width, y: p2.y / height },
        stroke: obj.stroke || "#4f46e5",
        strokeWidth,
        normStrokeWidth,
      };
    }

    if (customType === "curved-arrow") {
      const p1 = obj.arrowStart || { x: obj.left, y: obj.top };
      const p2 = obj.arrowEnd || { x: obj.left + (obj.width || 120), y: obj.top + 20 };
      const cp = obj.curveControl || { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 - 40 };

      return {
        type: "path",
        customType: "curved-arrow",
        normArrowStart: { x: p1.x / width, y: p1.y / height },
        normArrowEnd: { x: p2.x / width, y: p2.y / height },
        normCurveControl: { x: cp.x / width, y: cp.y / height },
        stroke: obj.stroke || "#4f46e5",
        strokeWidth,
        normStrokeWidth,
      };
    }

    if (customType === "box" || obj.type === "rect") {
      const scaleX = obj.scaleX !== undefined ? obj.scaleX : 1;
      const scaleY = obj.scaleY !== undefined ? obj.scaleY : 1;
      const rawW = obj.width || 100;
      const rawH = obj.height || 60;
      const actualW = rawW * scaleX;
      const actualH = rawH * scaleY;

      return {
        type: "rect",
        customType: "box",
        normLeft: obj.left / width,
        normTop: obj.top / height,
        normWidth: actualW / width,
        normHeight: actualH / height,
        angle: obj.angle || 0,
        stroke: obj.stroke || "#4f46e5",
        fill: obj.fill || "transparent",
        strokeWidth,
        normStrokeWidth,
        labelText: obj.labelText || "",
      };
    }

    if (customType === "circle" || obj.type === "ellipse") {
      const scaleX = obj.scaleX !== undefined ? obj.scaleX : 1;
      const scaleY = obj.scaleY !== undefined ? obj.scaleY : 1;
      const rawRx = obj.rx || (obj.width ? obj.width / 2 : 40);
      const rawRy = obj.ry || (obj.height ? obj.height / 2 : 30);
      const actualRx = rawRx * scaleX;
      const actualRy = rawRy * scaleY;

      return {
        type: "ellipse",
        customType: "circle",
        normLeft: obj.left / width,
        normTop: obj.top / height,
        normRx: actualRx / width,
        normRy: actualRy / height,
        angle: obj.angle || 0,
        stroke: obj.stroke || "#4f46e5",
        fill: obj.fill || "transparent",
        strokeWidth,
        normStrokeWidth,
        labelText: obj.labelText || "",
      };
    }

    if (customType === "image" || obj.type === "image") {
      const scaleX = obj.scaleX !== undefined ? obj.scaleX : 1;
      const scaleY = obj.scaleY !== undefined ? obj.scaleY : 1;
      const rawW = obj.width || 100;
      const rawH = obj.height || 100;
      const actualW = rawW * scaleX;
      const actualH = rawH * scaleY;
      const src = obj.getSrc ? obj.getSrc() : obj._element?.src || obj.src || "";

      return {
        type: "image",
        customType: "image",
        normLeft: obj.left / width,
        normTop: obj.top / height,
        normWidth: actualW / width,
        normHeight: actualH / height,
        angle: obj.angle || 0,
        src,
        name: obj.name || "uploaded-image",
      };
    }

    // Default fallback for generic fabric objects
    return {
      ...obj.toObject(),
      customType,
      normLeft: (obj.left || 0) / width,
      normTop: (obj.top || 0) / height,
    };
  });

  return {
    version: 2,
    normalized: true,
    canvasWidth: width,
    canvasHeight: height,
    objects: normalizedObjects,
  };
}

/**
 * Reconstructs / denormalizes Fabric objects for a target width and height
 */
export function denormalizeObjectForTarget(
  rawObj: any,
  targetWidth: number,
  targetHeight: number,
  referenceWidth: number = 800,
  referenceHeight: number = 260
): any {
  const isAlreadyNormalized = rawObj.normLeft !== undefined || rawObj.normArrowStart !== undefined || rawObj.normX1 !== undefined;

  // Normalized coordinate ratios
  let normLeft = 0;
  let normTop = 0;
  let normWidth = 0;
  let normHeight = 0;
  let normRx = 0;
  let normRy = 0;
  let normStrokeWidth = 3 / referenceWidth;

  const customType = rawObj.customType || rawObj.type;

  if (isAlreadyNormalized) {
    normLeft = rawObj.normLeft ?? 0;
    normTop = rawObj.normTop ?? 0;
    normWidth = rawObj.normWidth ?? 0;
    normHeight = rawObj.normHeight ?? 0;
    normRx = rawObj.normRx ?? 0;
    normRy = rawObj.normRy ?? 0;
    normStrokeWidth = rawObj.normStrokeWidth ?? 3 / referenceWidth;
  } else {
    // Migration: derive normalized coordinates from old raw pixel values
    const refW = referenceWidth > 0 ? referenceWidth : 800;
    const refH = referenceHeight > 0 ? referenceHeight : 260;
    const scaleX = rawObj.scaleX !== undefined ? rawObj.scaleX : 1;
    const scaleY = rawObj.scaleY !== undefined ? rawObj.scaleY : 1;

    normLeft = (rawObj.left || 0) / refW;
    normTop = (rawObj.top || 0) / refH;
    normWidth = ((rawObj.width || 0) * scaleX) / refW;
    normHeight = ((rawObj.height || 0) * scaleY) / refH;
    normRx = ((rawObj.rx || (rawObj.width ? rawObj.width / 2 : 0)) * scaleX) / refW;
    normRy = ((rawObj.ry || (rawObj.height ? rawObj.height / 2 : 0)) * scaleY) / refH;
    normStrokeWidth = (rawObj.strokeWidth || 3) / refW;
  }

  const strokeWidth = Math.max(1.5, Math.min(8, Math.round(normStrokeWidth * targetWidth)));

  if (customType === "line") {
    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    let nX1 = 0, nY1 = 0, nX2 = 0, nY2 = 0;
    if (isAlreadyNormalized && rawObj.normX1 !== undefined) {
      nX1 = rawObj.normX1;
      nY1 = rawObj.normY1;
      nX2 = rawObj.normX2;
      nY2 = rawObj.normY2;
      x1 = nX1 * targetWidth;
      y1 = nY1 * targetHeight;
      x2 = nX2 * targetWidth;
      y2 = nY2 * targetHeight;
    } else {
      const refW = referenceWidth || 800;
      const refH = referenceHeight || 260;
      nX1 = (rawObj.x1 ?? rawObj.left ?? 0) / refW;
      nY1 = (rawObj.y1 ?? rawObj.top ?? 0) / refH;
      nX2 = (rawObj.x2 ?? (rawObj.left + (rawObj.width || 0))) / refW;
      nY2 = (rawObj.y2 ?? (rawObj.top + (rawObj.height || 0))) / refH;
      x1 = nX1 * targetWidth;
      y1 = nY1 * targetHeight;
      x2 = nX2 * targetWidth;
      y2 = nY2 * targetHeight;
    }

    return {
      ...rawObj,
      type: "line",
      customType: "line",
      normX1: nX1,
      normY1: nY1,
      normX2: nX2,
      normY2: nY2,
      normStrokeWidth,
      x1,
      y1,
      x2,
      y2,
      left: Math.min(x1, x2),
      top: Math.min(y1, y2),
      stroke: rawObj.stroke || "#4f46e5",
      strokeWidth,
      strokeLineCap: "round",
      strokeUniform: true,
      uniformScaling: false,
    };
  }

  if (customType === "arrow") {
    let p1 = { x: 0, y: 0 };
    let p2 = { x: 0, y: 0 };
    let normStart = { x: 0, y: 0 };
    let normEnd = { x: 0, y: 0 };

    if (isAlreadyNormalized && rawObj.normArrowStart) {
      normStart = rawObj.normArrowStart;
      normEnd = rawObj.normArrowEnd;
      p1 = { x: normStart.x * targetWidth, y: normStart.y * targetHeight };
      p2 = { x: normEnd.x * targetWidth, y: normEnd.y * targetHeight };
    } else {
      const refW = referenceWidth || 800;
      const refH = referenceHeight || 260;
      const rawP1 = rawObj.arrowStart || { x: rawObj.left || 0, y: rawObj.top || 0 };
      const rawP2 = rawObj.arrowEnd || { x: (rawObj.left || 0) + (rawObj.width || 100), y: rawObj.top || 0 };
      normStart = { x: rawP1.x / refW, y: rawP1.y / refH };
      normEnd = { x: rawP2.x / refW, y: rawP2.y / refH };
      p1 = { x: normStart.x * targetWidth, y: normStart.y * targetHeight };
      p2 = { x: normEnd.x * targetWidth, y: normEnd.y * targetHeight };
    }

    const pathStr = createArrowPathString(p1.x, p1.y, p2.x, p2.y, strokeWidth);

    return {
      type: "path",
      customType: "arrow",
      path: pathStr,
      normArrowStart: normStart,
      normArrowEnd: normEnd,
      normStrokeWidth,
      arrowStart: p1,
      arrowEnd: p2,
      stroke: rawObj.stroke || "#4f46e5",
      strokeWidth,
      fill: "transparent",
      strokeLineCap: "round",
      strokeLineJoin: "round",
      strokeUniform: true,
      uniformScaling: false,
    };
  }

  if (customType === "curved-arrow") {
    let p1 = { x: 0, y: 0 };
    let p2 = { x: 0, y: 0 };
    let cp = { x: 0, y: 0 };
    let normStart = { x: 0, y: 0 };
    let normEnd = { x: 0, y: 0 };
    let normCp = { x: 0, y: 0 };

    if (isAlreadyNormalized && rawObj.normArrowStart) {
      normStart = rawObj.normArrowStart;
      normEnd = rawObj.normArrowEnd;
      normCp = rawObj.normCurveControl;
      p1 = { x: normStart.x * targetWidth, y: normStart.y * targetHeight };
      p2 = { x: normEnd.x * targetWidth, y: normEnd.y * targetHeight };
      cp = { x: normCp.x * targetWidth, y: normCp.y * targetHeight };
    } else {
      const refW = referenceWidth || 800;
      const refH = referenceHeight || 260;
      const rawP1 = rawObj.arrowStart || { x: rawObj.left || 0, y: rawObj.top || 0 };
      const rawP2 = rawObj.arrowEnd || { x: (rawObj.left || 0) + (rawObj.width || 120), y: (rawObj.top || 0) + 20 };
      const rawCp = rawObj.curveControl || { x: (rawP1.x + rawP2.x) / 2, y: (rawP1.y + rawP2.y) / 2 - 40 };
      normStart = { x: rawP1.x / refW, y: rawP1.y / refH };
      normEnd = { x: rawP2.x / refW, y: rawP2.y / refH };
      normCp = { x: rawCp.x / refW, y: rawCp.y / refH };
      p1 = { x: normStart.x * targetWidth, y: normStart.y * targetHeight };
      p2 = { x: normEnd.x * targetWidth, y: normEnd.y * targetHeight };
      cp = { x: normCp.x * targetWidth, y: normCp.y * targetHeight };
    }

    const pathStr = createCurvedArrowPathString(p1.x, p1.y, cp.x, cp.y, p2.x, p2.y, strokeWidth);

    return {
      type: "path",
      customType: "curved-arrow",
      path: pathStr,
      normArrowStart: normStart,
      normArrowEnd: normEnd,
      normCurveControl: normCp,
      normStrokeWidth,
      arrowStart: p1,
      arrowEnd: p2,
      curveControl: cp,
      stroke: rawObj.stroke || "#4f46e5",
      strokeWidth,
      fill: "transparent",
      strokeLineCap: "round",
      strokeLineJoin: "round",
      strokeUniform: true,
      uniformScaling: false,
    };
  }

  if (customType === "box" || rawObj.type === "rect") {
    return {
      type: "rect",
      customType: "box",
      normLeft,
      normTop,
      normWidth,
      normHeight,
      normStrokeWidth,
      left: normLeft * targetWidth,
      top: normTop * targetHeight,
      width: Math.max(10, normWidth * targetWidth),
      height: Math.max(10, normHeight * targetHeight),
      scaleX: 1,
      scaleY: 1,
      angle: rawObj.angle || 0,
      stroke: rawObj.stroke || "#4f46e5",
      fill: rawObj.fill || "transparent",
      strokeWidth,
      rx: 6,
      ry: 6,
      labelText: rawObj.labelText || "",
      strokeUniform: true,
      uniformScaling: false,
    };
  }

  if (customType === "circle" || rawObj.type === "ellipse") {
    return {
      type: "ellipse",
      customType: "circle",
      normLeft,
      normTop,
      normRx,
      normRy,
      normStrokeWidth,
      left: normLeft * targetWidth,
      top: normTop * targetHeight,
      rx: Math.max(6, normRx * targetWidth),
      ry: Math.max(6, normRy * targetHeight),
      scaleX: 1,
      scaleY: 1,
      angle: rawObj.angle || 0,
      stroke: rawObj.stroke || "#4f46e5",
      fill: rawObj.fill || "transparent",
      strokeWidth,
      labelText: rawObj.labelText || "",
      strokeUniform: true,
      uniformScaling: false,
    };
  }

  if (customType === "image" || rawObj.type === "image") {
    return {
      type: "image",
      customType: "image",
      normLeft,
      normTop,
      normWidth,
      normHeight,
      left: normLeft * targetWidth,
      top: normTop * targetHeight,
      width: Math.max(20, normWidth * targetWidth),
      height: Math.max(20, normHeight * targetHeight),
      angle: rawObj.angle || 0,
      src: rawObj.src || rawObj.getSrc?.() || "",
      name: rawObj.name || "uploaded-image",
    };
  }

  return {
    ...rawObj,
    normLeft,
    normTop,
    left: normLeft * targetWidth,
    top: normTop * targetHeight,
  };
}

/**
 * Rescales all existing live objects on a Fabric canvas when the container dimensions change
 */
export function rescaleFabricCanvasObjects(
  canvas: any,
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number
): void {
  if (!canvas || newWidth <= 0 || newHeight <= 0) return;
  const oldW = oldWidth > 0 ? oldWidth : newWidth;
  const oldH = oldHeight > 0 ? oldHeight : newHeight;
  if (oldW === newWidth && oldH === newHeight) return;

  const fabric = (window as any).fabric;

  canvas.getObjects().forEach((obj: any) => {
    if (obj.name === "curve-control-handle") {
      const normX = obj.normLeft ?? (obj.left / oldW);
      const normY = obj.normTop ?? (obj.top / oldH);
      obj.normLeft = normX;
      obj.normTop = normY;
      obj.set({
        left: normX * newWidth,
        top: normY * newHeight,
      });
      obj.setCoords();
      return;
    }

    if (obj.name === "shape-label") {
      // Companion text label will be repositioned by parent shape
      return;
    }

    const customType = obj.customType || obj.type;

    if (customType === "line") {
      const normX1 = obj.normX1 ?? ((obj.x1 ?? obj.left) / oldW);
      const normY1 = obj.normY1 ?? ((obj.y1 ?? obj.top) / oldH);
      const normX2 = obj.normX2 ?? ((obj.x2 ?? (obj.left + (obj.width || 0))) / oldW);
      const normY2 = obj.normY2 ?? ((obj.y2 ?? (obj.top + (obj.height || 0))) / oldH);
      const normSW = obj.normStrokeWidth ?? ((obj.strokeWidth || 3) / oldW);
      obj.normX1 = normX1;
      obj.normY1 = normY1;
      obj.normX2 = normX2;
      obj.normY2 = normY2;
      obj.normStrokeWidth = normSW;

      const x1 = normX1 * newWidth;
      const y1 = normY1 * newHeight;
      const x2 = normX2 * newWidth;
      const y2 = normY2 * newHeight;
      const sWidth = Math.max(1.5, Math.min(8, Math.round(normSW * newWidth)));

      obj.set({
        x1,
        y1,
        x2,
        y2,
        left: Math.min(x1, x2),
        top: Math.min(y1, y2),
        strokeWidth: sWidth,
      });
      obj.setCoords();
      return;
    }

    if (customType === "arrow") {
      const rawP1 = obj.arrowStart || { x: obj.left, y: obj.top };
      const rawP2 = obj.arrowEnd || { x: obj.left + (obj.width || 100), y: obj.top };
      const normStart = obj.normArrowStart ?? { x: rawP1.x / oldW, y: rawP1.y / oldH };
      const normEnd = obj.normArrowEnd ?? { x: rawP2.x / oldW, y: rawP2.y / oldH };
      const normSW = obj.normStrokeWidth ?? ((obj.strokeWidth || 3) / oldW);
      obj.normArrowStart = normStart;
      obj.normArrowEnd = normEnd;
      obj.normStrokeWidth = normSW;

      const p1 = { x: normStart.x * newWidth, y: normStart.y * newHeight };
      const p2 = { x: normEnd.x * newWidth, y: normEnd.y * newHeight };
      const sWidth = Math.max(1.5, Math.min(8, Math.round(normSW * newWidth)));
      const pathStr = createArrowPathString(p1.x, p1.y, p2.x, p2.y, sWidth);

      if (fabric) {
        const temp = new fabric.Path(pathStr);
        obj.set({
          path: temp.path,
          width: temp.width,
          height: temp.height,
          pathOffset: temp.pathOffset,
          left: temp.left,
          top: temp.top,
          arrowStart: p1,
          arrowEnd: p2,
          strokeWidth: sWidth,
        });
        obj.setCoords();
      }
      return;
    }

    if (customType === "curved-arrow") {
      const rawP1 = obj.arrowStart || { x: obj.left, y: obj.top };
      const rawP2 = obj.arrowEnd || { x: obj.left + (obj.width || 120), y: obj.top + 20 };
      const rawCp = obj.curveControl || { x: (rawP1.x + rawP2.x) / 2, y: (rawP1.y + rawP2.y) / 2 - 40 };
      const normStart = obj.normArrowStart ?? { x: rawP1.x / oldW, y: rawP1.y / oldH };
      const normEnd = obj.normArrowEnd ?? { x: rawP2.x / oldW, y: rawP2.y / oldH };
      const normCp = obj.normCurveControl ?? { x: rawCp.x / oldW, y: rawCp.y / oldH };
      const normSW = obj.normStrokeWidth ?? ((obj.strokeWidth || 3) / oldW);
      obj.normArrowStart = normStart;
      obj.normArrowEnd = normEnd;
      obj.normCurveControl = normCp;
      obj.normStrokeWidth = normSW;

      const p1 = { x: normStart.x * newWidth, y: normStart.y * newHeight };
      const p2 = { x: normEnd.x * newWidth, y: normEnd.y * newHeight };
      const cp = { x: normCp.x * newWidth, y: normCp.y * newHeight };
      const sWidth = Math.max(1.5, Math.min(8, Math.round(normSW * newWidth)));
      const pathStr = createCurvedArrowPathString(p1.x, p1.y, cp.x, cp.y, p2.x, p2.y, sWidth);

      if (fabric) {
        const temp = new fabric.Path(pathStr);
        obj.set({
          path: temp.path,
          width: temp.width,
          height: temp.height,
          pathOffset: temp.pathOffset,
          left: temp.left,
          top: temp.top,
          arrowStart: p1,
          arrowEnd: p2,
          curveControl: cp,
          strokeWidth: sWidth,
        });
        obj.setCoords();
      }
      return;
    }

    if (customType === "box" || obj.type === "rect") {
      const normL = obj.normLeft ?? (obj.left / oldW);
      const normT = obj.normTop ?? (obj.top / oldH);
      const normW = obj.normWidth ?? (((obj.width || 100) * (obj.scaleX || 1)) / oldW);
      const normH = obj.normHeight ?? (((obj.height || 60) * (obj.scaleY || 1)) / oldH);
      const normSW = obj.normStrokeWidth ?? ((obj.strokeWidth || 3) / oldW);
      obj.normLeft = normL;
      obj.normTop = normT;
      obj.normWidth = normW;
      obj.normHeight = normH;
      obj.normStrokeWidth = normSW;

      const sWidth = Math.max(1.5, Math.min(8, Math.round(normSW * newWidth)));
      obj.set({
        left: normL * newWidth,
        top: normT * newHeight,
        width: Math.max(10, normW * newWidth),
        height: Math.max(10, normH * newHeight),
        scaleX: 1,
        scaleY: 1,
        strokeWidth: sWidth,
      });
      obj.setCoords();

      if (obj.labelObj) {
        const bounds = {
          centerX: obj.left + obj.width / 2,
          centerY: obj.top + obj.height / 2,
          width: obj.width,
          height: obj.height,
        };
        const fontSize = Math.max(13, Math.min(22, Math.floor(bounds.height * 0.32)));
        obj.labelObj.set({
          left: bounds.centerX,
          top: bounds.centerY,
          width: Math.max(20, bounds.width - 16),
          fontSize,
          angle: obj.angle || 0,
        });
        obj.labelObj.setCoords();
      }
      return;
    }

    if (customType === "circle" || obj.type === "ellipse") {
      const normL = obj.normLeft ?? (obj.left / oldW);
      const normT = obj.normTop ?? (obj.top / oldH);
      const normRx = obj.normRx ?? (((obj.rx || 40) * (obj.scaleX || 1)) / oldW);
      const normRy = obj.normRy ?? (((obj.ry || 30) * (obj.scaleY || 1)) / oldH);
      const normSW = obj.normStrokeWidth ?? ((obj.strokeWidth || 3) / oldW);
      obj.normLeft = normL;
      obj.normTop = normT;
      obj.normRx = normRx;
      obj.normRy = normRy;
      obj.normStrokeWidth = normSW;

      const sWidth = Math.max(1.5, Math.min(8, Math.round(normSW * newWidth)));
      obj.set({
        left: normL * newWidth,
        top: normT * newHeight,
        rx: Math.max(6, normRx * newWidth),
        ry: Math.max(6, normRy * newHeight),
        scaleX: 1,
        scaleY: 1,
        strokeWidth: sWidth,
      });
      obj.setCoords();

      if (obj.labelObj) {
        const bounds = {
          centerX: obj.left,
          centerY: obj.top,
          width: obj.rx * 2,
          height: obj.ry * 2,
        };
        const fontSize = Math.max(13, Math.min(22, Math.floor(bounds.height * 0.32)));
        obj.labelObj.set({
          left: bounds.centerX,
          top: bounds.centerY,
          width: Math.max(20, bounds.width - 16),
          fontSize,
          angle: obj.angle || 0,
        });
        obj.labelObj.setCoords();
      }
      return;
    }

    if (customType === "image" || obj.type === "image") {
      const normL = obj.normLeft ?? (obj.left / oldW);
      const normT = obj.normTop ?? (obj.top / oldH);
      const normW = obj.normWidth ?? (((obj.width || 100) * (obj.scaleX || 1)) / oldW);
      const normH = obj.normHeight ?? (((obj.height || 100) * (obj.scaleY || 1)) / oldH);
      obj.normLeft = normL;
      obj.normTop = normT;
      obj.normWidth = normW;
      obj.normHeight = normH;

      obj.set({
        left: normL * newWidth,
        top: normT * newHeight,
        scaleX: (normW * newWidth) / (obj.width || 1),
        scaleY: (normH * newHeight) / (obj.height || 1),
      });
      obj.setCoords();
      return;
    }

    // Default object scaling
    const normL = obj.normLeft ?? (obj.left / oldW);
    const normT = obj.normTop ?? (obj.top / oldH);
    const sx = newWidth / oldW;
    const sy = newHeight / oldH;
    obj.normLeft = normL;
    obj.normTop = normT;
    obj.set({
      left: normL * newWidth,
      top: normT * newHeight,
      scaleX: (obj.scaleX || 1) * sx,
      scaleY: (obj.scaleY || 1) * sy,
    });
    obj.setCoords();
  });
}

/**
 * Updates the persistent normalized coordinate properties directly on a live Fabric object
 * relative to the current canvas dimensions (width, height).
 */
export function updateObjectNormalizedCoordinates(obj: any, width: number, height: number): void {
  if (!obj || width <= 0 || height <= 0) return;
  if (obj.name === "curve-control-handle" || obj.name === "shape-label") return;

  const customType = obj.customType || obj.type;

  if (customType === "line") {
    const x1 = obj.x1 !== undefined ? obj.x1 : obj.left;
    const y1 = obj.y1 !== undefined ? obj.y1 : obj.top;
    const x2 = obj.x2 !== undefined ? obj.x2 : obj.left + (obj.width || 0);
    const y2 = obj.y2 !== undefined ? obj.y2 : obj.top + (obj.height || 0);
    obj.normX1 = x1 / width;
    obj.normY1 = y1 / height;
    obj.normX2 = x2 / width;
    obj.normY2 = y2 / height;
    obj.normStrokeWidth = (obj.strokeWidth || 3) / width;
    return;
  }

  if (customType === "arrow") {
    if (obj._prevLeft !== undefined && obj._prevTop !== undefined) {
      const dx = obj.left - obj._prevLeft;
      const dy = obj.top - obj._prevTop;
      if (obj.arrowStart) {
        obj.arrowStart.x += dx;
        obj.arrowStart.y += dy;
      }
      if (obj.arrowEnd) {
        obj.arrowEnd.x += dx;
        obj.arrowEnd.y += dy;
      }
    }
    obj._prevLeft = obj.left;
    obj._prevTop = obj.top;

    const p1 = obj.arrowStart || { x: obj.left, y: obj.top };
    const p2 = obj.arrowEnd || { x: obj.left + (obj.width || 100), y: obj.top };
    obj.normArrowStart = { x: p1.x / width, y: p1.y / height };
    obj.normArrowEnd = { x: p2.x / width, y: p2.y / height };
    obj.normStrokeWidth = (obj.strokeWidth || 3) / width;
    return;
  }

  if (customType === "curved-arrow") {
    if (obj._prevLeft !== undefined && obj._prevTop !== undefined) {
      const dx = obj.left - obj._prevLeft;
      const dy = obj.top - obj._prevTop;
      if (obj.arrowStart) {
        obj.arrowStart.x += dx;
        obj.arrowStart.y += dy;
      }
      if (obj.arrowEnd) {
        obj.arrowEnd.x += dx;
        obj.arrowEnd.y += dy;
      }
      if (obj.curveControl) {
        obj.curveControl.x += dx;
        obj.curveControl.y += dy;
      }
    }
    obj._prevLeft = obj.left;
    obj._prevTop = obj.top;

    const p1 = obj.arrowStart || { x: obj.left, y: obj.top };
    const p2 = obj.arrowEnd || { x: obj.left + (obj.width || 120), y: obj.top + 20 };
    const cp = obj.curveControl || { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 - 40 };
    obj.normArrowStart = { x: p1.x / width, y: p1.y / height };
    obj.normArrowEnd = { x: p2.x / width, y: p2.y / height };
    obj.normCurveControl = { x: cp.x / width, y: cp.y / height };
    obj.normStrokeWidth = (obj.strokeWidth || 3) / width;
    return;
  }

  if (customType === "box" || obj.type === "rect") {
    const scaleX = obj.scaleX !== undefined ? obj.scaleX : 1;
    const scaleY = obj.scaleY !== undefined ? obj.scaleY : 1;
    const actualW = (obj.width || 100) * scaleX;
    const actualH = (obj.height || 60) * scaleY;
    obj.normLeft = obj.left / width;
    obj.normTop = obj.top / height;
    obj.normWidth = actualW / width;
    obj.normHeight = actualH / height;
    obj.normStrokeWidth = (obj.strokeWidth || 3) / width;
    return;
  }

  if (customType === "circle" || obj.type === "ellipse") {
    const scaleX = obj.scaleX !== undefined ? obj.scaleX : 1;
    const scaleY = obj.scaleY !== undefined ? obj.scaleY : 1;
    const actualRx = (obj.rx || 40) * scaleX;
    const actualRy = (obj.ry || 30) * scaleY;
    obj.normLeft = obj.left / width;
    obj.normTop = obj.top / height;
    obj.normRx = actualRx / width;
    obj.normRy = actualRy / height;
    obj.normStrokeWidth = (obj.strokeWidth || 3) / width;
    return;
  }

  if (customType === "image" || obj.type === "image") {
    const scaleX = obj.scaleX !== undefined ? obj.scaleX : 1;
    const scaleY = obj.scaleY !== undefined ? obj.scaleY : 1;
    const actualW = (obj.width || 100) * scaleX;
    const actualH = (obj.height || 100) * scaleY;
    obj.normLeft = obj.left / width;
    obj.normTop = obj.top / height;
    obj.normWidth = actualW / width;
    obj.normHeight = actualH / height;
    return;
  }

  obj.normLeft = (obj.left || 0) / width;
  obj.normTop = (obj.top || 0) / height;
}
