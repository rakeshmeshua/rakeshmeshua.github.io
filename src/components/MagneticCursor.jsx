import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, [role='button'], input, textarea, select, summary";

// Glowing dot (follows the pointer exactly) + trailing aura ring that grows over interactive elements.
export default function MagneticCursor() {
  const dot = useRef(null), ring = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.documentElement.classList.add("has-custom-cursor");
    let x = -100, y = -100, rx = -100, ry = -100, raf = 0, shown = false;

    const onMove = (e) => {
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; rx = x; ry = y; dot.current.style.opacity = ring.current.style.opacity = "1"; }
      const hot = e.target instanceof Element && e.target.closest(INTERACTIVE);
      ring.current.classList.toggle("is-hot", !!hot);
    };
    const onLeave = () => { shown = false; dot.current.style.opacity = ring.current.style.opacity = "0"; };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      dot.current.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
      ring.current.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
