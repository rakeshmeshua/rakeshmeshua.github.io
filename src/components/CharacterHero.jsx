import { useEffect, useRef } from "react";

// 128 pre-extracted transparent WebP frames (see tools/extract_frames.py), spaced evenly by head motion.
// Frame 0 = looking UP, then clockwise on screen.
const BASE = import.meta.env.BASE_URL;
const N = 128;
const STEP = (Math.PI * 2) / N;
const FACE = { x: 0.5, y: 0.4 };   // face centre as a fraction of the 1280x720 source frame
const SMOOTH = 0.26;               // per-frame (60fps) angular response
const DEAD_IN = 0.12, DEAD_OUT = 0.14; // centre-gaze radius, as a fraction of min(viewport w, h), with hysteresis

const lerpAngle = (a, b, t) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

const load = (src) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

// Draws the character on one full-viewport canvas. Exactly one frame is drawn, fully opaque, per update.
export default function CharacterHero() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let frames = new Array(N).fill(null), center = null;
    let raf = 0, last = 0, visible = true, dead = false;
    let angle = 0, target = 0, cur = -2;       // cur: frame index drawn last (-1 = centre)
    let hasPointer = false, inCentre = true, mx = 0, my = 0;
    let rect = { x: 0, y: 0, w: 1, h: 1 };

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bound = canvas.getBoundingClientRect();
      canvas.width = Math.round(bound.width * dpr);
      canvas.height = Math.round(bound.height * dpr);
      // object-fit: cover over the 16:9 source
      const iw = 1280, ih = 720, s = Math.max(canvas.width / iw, canvas.height / ih);
      rect = { x: (canvas.width - iw * s) / 2, y: (canvas.height - ih * s) / 2, w: iw * s, h: ih * s, dpr, bx: bound.left, by: bound.top };
      cur = -2; // force redraw
    };

    const draw = (img) => {
      if (!img) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
    };

    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;

      let want = -1;
      if (hasPointer) {
        const fx = rect.bx + (rect.x + rect.w * FACE.x) / rect.dpr;
        const fy = rect.by + (rect.y + rect.h * FACE.y) / rect.dpr;
        const dx = mx - fx, dy = my - fy;
        const r = Math.min(window.innerWidth, window.innerHeight);
        const dist = Math.hypot(dx, dy);
        inCentre = dist < r * (inCentre ? DEAD_OUT : DEAD_IN);
        // frame 0 is UP (-90deg); angles are screen-space, y down, so +angle = clockwise
        target = Math.atan2(dy, dx) + Math.PI / 2;
        angle = lerpAngle(angle, target, 1 - Math.pow(1 - SMOOTH, dt * 60));
        if (!inCentre) want = ((Math.round((((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / STEP)) % N);
      }
      if (want === cur) return;
      const img = want === -1 ? center : frames[want] || center;
      if (!img) return;
      cur = want;
      draw(img);
    };

    const onMove = (e) => { mx = e.clientX; my = e.clientY; hasPointer = true; };
    const onLeave = () => { hasPointer = false; };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) last = 0; }, { threshold: 0 });
    io.observe(canvas);

    layout();
    window.addEventListener("resize", layout);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    (async () => {
      center = await load(`${BASE}frames/center.webp`);
      if (dead) return;
      cur = -2; canvas.dataset.ready = "1";
      await Promise.all(Array.from({ length: N }, async (_, i) => {
        frames[i] = await load(`${BASE}frames/f${String(i).padStart(3, "0")}.webp`);
        if (!dead && i === cur) cur = -2;
      }));
      if (!dead) canvas.dataset.frames = "all";
    })();

    return () => {
      dead = true; cancelAnimationFrame(raf); io.disconnect();
      window.removeEventListener("resize", layout);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="character-canvas" aria-hidden="true" />;
}
