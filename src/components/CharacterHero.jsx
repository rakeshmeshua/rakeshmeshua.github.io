import { useEffect, useRef } from "react";

// 128 pre-extracted transparent WebP frames (see tools/extract_frames.py), spaced evenly by head motion.
// Frame 0 = looking UP, then clockwise on screen.
const BASE = import.meta.env.BASE_URL;
const N = 128;
const TAU = Math.PI * 2;
const STEP = TAU / N;
const FACE = { x: 0.5, y: 0.4 };       // face centre as a fraction of the 1280x720 source frame
const SMOOTH = 0.26;                   // per-frame (60fps) angular response
const DEAD_IN = 0.12, DEAD_OUT = 0.14; // centre-gaze radius, as a fraction of min(viewport w, h), with hysteresis
const IDLE_AFTER = 2500;               // touch screens: ms without a touch before she starts glancing around on her own

const lerpAngle = (a, b, t) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
  return a + d * t;
};

const load = (src) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => (img.decode ? img.decode().catch(() => {}).then(() => resolve(img)) : resolve(img));
  img.onerror = () => resolve(null);
  img.src = src;
});

const SMALL_SCREEN = window.matchMedia("(pointer: coarse), (max-width: 700px)").matches;

// Frame order: a coarse spread first so the head can already move everywhere, then fill in the gaps.
const LOAD_ORDER = [...new Set([8, 4, 2, 1].flatMap((s) => Array.from({ length: N }, (_, i) => i).filter((i) => i % s === 0)))];

// Draws the character on one canvas. Exactly one frame is drawn, fully opaque, per update.
export default function CharacterHero() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frames = new Array(N).fill(null);
    let center = null;
    let raf = 0, last = 0, visible = true, dead = false;
    let angle = 0, cur = -2;                    // cur: frame index drawn last (-1 = centre, -2 = nothing yet)
    let hasPointer = false, snap = false, inCentre = true, mx = 0, my = 0, lastInput = -1e9;
    let idle = { angle: 0, centre: true, next: 0 };
    let rect = { x: 0, y: 0, w: 1, h: 1, dpr: 1 };

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const b = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(b.width * dpr));
      canvas.height = Math.max(1, Math.round(b.height * dpr));
      const iw = 1280, ih = 720, s = Math.max(canvas.width / iw, canvas.height / ih); // object-fit: cover
      rect = { x: (canvas.width - iw * s) / 2, y: (canvas.height - ih * s) / 2, w: iw * s, h: ih * s, dpr };
      cur = -2; // canvas was cleared by the resize: force a redraw
    };

    // nearest frame that has actually loaded (never fall back to the centre pose mid-turn)
    const nearest = (i) => {
      for (let d = 0; d <= N / 2; d++) {
        const a = frames[(i + d) % N]; if (a) return [a, (i + d) % N];
        const b = frames[(i - d + N) % N]; if (b) return [b, (i - d + N) % N];
      }
      return [null, -1];
    };

    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      const k = 1 - Math.pow(1 - SMOOTH, dt * 60);

      let want = -1, target = null;
      const idling = coarse && !reduceMotion && t - lastInput > IDLE_AFTER;
      if (hasPointer && !idling) {
        // measured every frame, so scrolling or a layout shift never leaves her aiming at the wrong spot
        const b = canvas.getBoundingClientRect();
        const dx = mx - (b.left + (rect.x + rect.w * FACE.x) / rect.dpr), dy = my - (b.top + (rect.y + rect.h * FACE.y) / rect.dpr);
        inCentre = Math.hypot(dx, dy) < Math.min(window.innerWidth, window.innerHeight) * (inCentre ? DEAD_OUT : DEAD_IN);
        target = Math.atan2(dy, dx) + Math.PI / 2;      // frame 0 is UP; screen angles are y-down, so +angle = clockwise
      } else if (idling) {
        if (t > idle.next) {                             // touch screens have no hover: glance around now and then
          idle = { angle: Math.random() * TAU, centre: Math.random() < 0.35, next: t + 1700 + Math.random() * 1500 };
        }
        inCentre = idle.centre; target = idle.angle;
      }
      if (target !== null) {
        angle = snap ? target : lerpAngle(angle, target, k); snap = false;
        if (!inCentre) want = Math.round((((angle % TAU) + TAU) % TAU) / STEP) % N;
      }

      let img, idx;
      if (want === -1) { img = center; idx = -1; } else [img, idx] = nearest(want);
      if (!img || idx === cur) return;
      cur = idx;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
    };

    const point = (x, y) => { if (!hasPointer) snap = true; mx = x; my = y; hasPointer = true; lastInput = performance.now(); };
    const onPointer = (e) => point(e.clientX, e.clientY);
    const onTouch = (e) => { const p = e.touches[0]; if (p) point(p.clientX, p.clientY); };
    // a finger lifting is not "the pointer left": keep looking where it last was, then drift into idle glances
    const onTouchEnd = () => { lastInput = performance.now(); };
    const onMouseOut = (e) => { if (!e.relatedTarget) hasPointer = false; };   // mouse left the browser window
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) last = 0; }, { threshold: 0 });
    io.observe(canvas);
    const ro = new ResizeObserver(layout);
    ro.observe(canvas);

    layout();
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });   // fires while the page scrolls, unlike pointermove
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("mouseout", onMouseOut);
    raf = requestAnimationFrame(tick);

    (async () => {
      center = await load(`${BASE}frames/center.webp`);
      if (dead) return;
      cur = -2; canvas.dataset.ready = "1";
      let next = 0;
      // phones: every 4th frame (32 instead of 128) -> ~4x less to download and keep decoded in memory; nearest() covers the gaps
      const order = SMALL_SCREEN ? LOAD_ORDER.filter((i) => i % 4 === 0) : LOAD_ORDER;
      const worker = async () => {                       // a few at a time so the first frames are not starved by the rest
        while (!dead && next < order.length) {
          const i = order[next++];
          frames[i] = await load(`${BASE}frames/f${String(i).padStart(3, "0")}.webp`);
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      if (!dead) canvas.dataset.frames = "all";
    })();

    return () => {
      dead = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, []);

  return <canvas ref={canvasRef} className="character-canvas" aria-hidden="true" />;
}
