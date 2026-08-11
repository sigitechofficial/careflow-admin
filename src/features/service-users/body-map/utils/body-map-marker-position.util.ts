/**
 * Align stored pin coordinates with admin BodyMapAnatomy.markerPosition (dual canvas).
 *
 * Dual standing canvas stores x/y as 0–100 within ONE figure (front or back), not the full widget.
 * Mobile often sends recordView "face" or full-widget x — this normalizes for display + API read-back.
 */
export function normalizeBodyMapPinCoordinates(input: {
  recordView?: string | null;
  canvasView?: string | null;
  view?: string | null;
  x: number;
  y: number;
}): { recordView: string; canvasView: string; x: number; y: number } {
  const viewHint = (input.view ?? '').trim().toLowerCase();
  let canvasView = (input.canvasView ?? viewHint ?? 'dual').trim().toLowerCase();
  let recordView = (input.recordView ?? '').trim().toLowerCase();
  let x = input.x;
  const y = input.y;

  if (!recordView) {
    if (viewHint === 'front' || viewHint === 'back') recordView = viewHint;
    else if (viewHint === 'dual' || viewHint === '') recordView = x <= 50 ? 'front' : 'back';
    else recordView = viewHint;
  }

  // Face/head zoom → render on front/back silhouette when canvas is dual (visit workspace).
  if (canvasView === 'dual') {
    if (recordView === 'face' || recordView === 'head' || recordView === 'forehead') {
      recordView = 'front';
    } else if (recordView === 'head_back' || recordView === 'occiput') {
      recordView = 'back';
    }
  }

  // Full-widget dual coords (0–100 across both figures) stored without front/back split.
  if (canvasView === 'dual' && recordView === 'dual') {
    if (x <= 50) {
      recordView = 'front';
      x = Math.round((x / 50) * 1000) / 10;
    } else {
      recordView = 'back';
      x = Math.round(((x - 50) / 50) * 1000) / 10;
    }
  }

  if ((recordView === 'front' || recordView === 'back') && canvasView !== 'dual') {
    canvasView = 'dual';
  }

  return { recordView, canvasView, x, y };
}

/** Args for BodyMapAnatomy.markerPosition after normalization. */
export function markerPositionInput(
  recordView: string,
  canvasView: string | undefined,
  x: number,
  y: number,
  targetCanvasView: string,
) {
  const normalized = normalizeBodyMapPinCoordinates({
    recordView,
    canvasView,
    x,
    y,
  });
  const target = targetCanvasView === 'dual' ? 'dual' : targetCanvasView;
  return {
    view: normalized.recordView,
    x: normalized.x,
    y: normalized.y,
    canvasView: target,
  };
}
