// phone — one answer, shared, to "is this a phone held upright?"
//
// The owner, 2026-09-23, after trying landscape and turning it down ("things get too small"): a
// phone stays PORTRAIT, and on a phone the evening is watched differently — the conversation is a
// run of drawn bubbles over the room (dialogue-phone.js), the room is looked round with a drag or by
// tilting the phone (camera.js, THE TILT), and the two controls for those sit in the bottom corners.
// A laptop and a tablet are untouched by all of it.
//
// WHAT COUNTS: no fine pointer anywhere (walk-marks.js explains why `pointer: coarse` alone is the
// wrong test — a touchscreen laptop reports it) AND a short side of at most PHONE_SHORT CSS px.
export const PHONE_SHORT = 500;

const touchOnly = () => {
  try {
    return !matchMedia('(any-pointer: fine)').matches && (navigator.maxTouchPoints ?? 0) > 0;
  } catch {
    return false;
  }
};

export const isPhone = (w = innerWidth, h = innerHeight) => touchOnly() && Math.min(w, h) <= PHONE_SHORT;

// the tools force it with ?phone=1 (or refuse it with ?phone=0), so a desktop Playwright can see it
export function phoneMode() {
  try {
    const q = new URLSearchParams(location.search).get('phone');
    if (q === '1') return true;
    if (q === '0') return false;
  } catch {}
  return isPhone();
}
