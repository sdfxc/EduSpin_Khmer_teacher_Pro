import { Point, ShapeType, ShapeElement, Stroke } from './types';

// Distance between 2 points
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Catmull-Rom to Cubic Bezier curve conversion for ultra-smooth strokes
export function getCatmullRomPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  if (points.length === 2) {
    path += ` L ${points[1].x} ${points[1].y}`;
    return path;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return path;
}

// Draw a smooth stroke onto a 2D canvas context with pressure dynamics
export function drawSmoothStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  baseWidth: number,
  color: string,
  opacity: number,
  tool: 'pen' | 'pencil' | 'highlighter',
  penType?: 'ballpoint' | 'fountain' | 'brush'
) {
  if (!points || points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'highlighter') {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(16, baseWidth * 4);
    ctx.globalCompositeOperation = 'multiply';
  } else if (tool === 'pencil') {
    ctx.globalAlpha = opacity * 0.75;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, baseWidth * 0.85);
  } else {
    // Pen
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = baseWidth;
  }

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    return;
  }

  if (points.length === 2) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Draw smooth spline
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
  ctx.stroke();

  ctx.restore();
}

// Recognize rough hand-drawn shapes (Circle, Rectangle, Line, Arrow, Triangle)
export function recognizeShape(points: Point[]): { type: ShapeType; x1: number; y1: number; x2: number; y2: number } | null {
  if (points.length < 8) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  let totalLength = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);

    if (i > 0) {
      totalLength += distance(points[i - 1], p);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  if (width < 10 && height < 10) return null;

  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const startEndDist = distance(startPoint, endPoint);
  const isClosed = startEndDist < Math.max(30, Math.min(width, height) * 0.35);

  const directDist = distance(startPoint, endPoint);

  // 1. Straight Line Check
  if (!isClosed && directDist > 40 && totalLength / directDist < 1.18) {
    return {
      type: 'line',
      x1: startPoint.x,
      y1: startPoint.y,
      x2: endPoint.x,
      y2: endPoint.y
    };
  }

  // 2. Closed Shapes
  if (isClosed) {
    // Check if Circle / Ellipse
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const radiusX = width / 2;
    const radiusY = height / 2;

    let circularityVariance = 0;
    for (const p of points) {
      const normalizedDist = Math.pow((p.x - centerX) / (radiusX || 1), 2) + Math.pow((p.y - centerY) / (radiusY || 1), 2);
      circularityVariance += Math.abs(normalizedDist - 1);
    }
    circularityVariance /= points.length;

    const aspectRatio = width / (height || 1);

    if (circularityVariance < 0.38) {
      // Circle or Ellipse
      if (aspectRatio > 0.8 && aspectRatio < 1.25) {
        const r = (width + height) / 4;
        return {
          type: 'circle',
          x1: centerX - r,
          y1: centerY - r,
          x2: centerX + r,
          y2: centerY + r
        };
      }
      return {
        type: 'ellipse',
        x1: minX,
        y1: minY,
        x2: maxX,
        y2: maxY
      };
    }

    // Check Rectangle
    return {
      type: 'rectangle',
      x1: minX,
      y1: minY,
      x2: maxX,
      y2: maxY
    };
  }

  return null;
}

// Point in polygon test for Lasso selection
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Check if stroke is inside or intersects lasso polygon
export function isStrokeInLasso(stroke: Stroke, lassoPoints: Point[]): boolean {
  if (stroke.points.length === 0) return false;
  // If majority of points are inside
  let countInside = 0;
  for (const pt of stroke.points) {
    if (isPointInPolygon(pt, lassoPoints)) {
      countInside++;
    }
  }
  return countInside > stroke.points.length * 0.4;
}

// Calculate bounding box for a group of strokes / shapes
export function getSelectionBounds(
  strokes: Stroke[],
  shapes: ShapeElement[],
  texts: any[],
  images: any[],
  equations: any[]
): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let found = false;

  for (const s of strokes) {
    for (const p of s.points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      found = true;
    }
  }

  for (const sh of shapes) {
    minX = Math.min(minX, sh.x1, sh.x2);
    maxX = Math.max(maxX, sh.x1, sh.x2);
    minY = Math.min(minY, sh.y1, sh.y2);
    maxY = Math.max(maxY, sh.y1, sh.y2);
    found = true;
  }

  for (const t of texts) {
    minX = Math.min(minX, t.x);
    maxX = Math.max(maxX, t.x + t.width);
    minY = Math.min(minY, t.y);
    maxY = Math.max(maxY, t.y + t.height);
    found = true;
  }

  for (const img of images) {
    minX = Math.min(minX, img.x);
    maxX = Math.max(maxX, img.x + img.width);
    minY = Math.min(minY, img.y);
    maxY = Math.max(maxY, img.y + img.height);
    found = true;
  }

  for (const eq of equations) {
    minX = Math.min(minX, eq.x);
    maxX = Math.max(maxX, eq.x + 200);
    minY = Math.min(minY, eq.y);
    maxY = Math.max(maxY, eq.y + 60);
    found = true;
  }

  if (!found) return null;
  const padding = 8;
  return {
    x: minX - padding,
    y: minY - padding,
    width: (maxX - minX) + padding * 2,
    height: (maxY - minY) + padding * 2
  };
}
