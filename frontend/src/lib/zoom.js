// How scrolling zooms, shared by the 3D district and the flat map so the two
// feel the same.

// A wheel event's scroll in pixels whatever the device reports in, capped so
// one notch of a coarse mouse wheel does not jump.
export function wheelPixels(e) {
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
  return Math.max(-120, Math.min(120, e.deltaY * unit));
}

// The zoom a wheel event asks for, as a factor on the view: 100 px of scroll
// is about 16%, and a trackpad's many small events add up to a mouse wheel's few.
export const WHEEL_RATE = 0.003;
export function wheelZoom(e) { return Math.exp(wheelPixels(e) * WHEEL_RATE); }

// How much of the remaining distance to the target each frame closes: 0.22
// settles in about 200 ms.
export const EASE = 0.22;
