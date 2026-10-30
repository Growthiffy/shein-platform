"use client";
import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";

// Pulsing gray placeholder. Compose with width/height utility classes.
export function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

// Animate a number from its previous value to `value` over `duration` ms.
export function CountUp({ value, duration = 1000, prefix = "", decimals = 2, className = "" }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current, to = value, start = performance.now();
    cancelAnimationFrame(rafRef.current);
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  return <span className={className}>{prefix}{display.toFixed(decimals)}</span>;
}

const COLORS = ["#ff3e6d", "#ff6a8b", "#111111", "#f6c453", "#4ade80", "#60a5fa"];
// Fixed-position confetti burst. Renders `count` pieces that fall once.
export function Confetti({ count = 80, onDone }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => { setOn(false); onDone?.(); }, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  if (!on) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const dur = 2.2 + Math.random() * 1.2;
        const color = COLORS[i % COLORS.length];
        return <span key={i} className="confetti-piece"
          style={{ left: `${left}vw`, background: color, animationDelay: `${delay}s`, animationDuration: `${dur}s` }} />;
      })}
    </div>
  );
}

// Clickable 1-5 star rating.
export function StarRating({ value = 0, onChange, size = 26 }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = (hover || value) >= n;
        return (
          <button key={n} type="button" aria-label={`${n} star`}
            onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}
            className="transition-transform hover:scale-110">
            <Star size={size} className={filled ? "text-gold2" : "text-cream/25"}
              fill={filled ? "#ff3e6d" : "none"} />
          </button>
        );
      })}
    </div>
  );
}
