"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const SLIDES = [
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&q=80",
  "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1920&q=80",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1920&q=80",
  "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=1920&q=80",
];

export default function Landing() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <main className="relative min-h-screen overflow-hidden">
      {SLIDES.map((src, idx) => (
        <div key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ${idx === i ? "opacity-100" : "opacity-0"}`}
          aria-hidden={idx !== i}>
          <img src={src} alt="" className="w-full h-full object-cover kb" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/85" />
        </div>
      ))}

      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="font-display text-3xl tracking-widest text-gold">SHEIN</div>
        <div className="text-xs tracking-[0.3em] text-cream/70">LUXURY · ANALYSIS · GROWTH</div>
      </nav>

      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6" style={{minHeight:"72vh"}}>
        <h1 className="font-display text-6xl md:text-8xl text-cream fadein" style={{textShadow:"0 10px 40px rgba(0,0,0,.6)"}}>
          Curated. <span className="text-gold">Analyzed.</span> Rewarded.
        </h1>
        <p className="mt-6 max-w-xl text-cream/80 fadein">
          A members-only platform for product analysts and investors in the world of modern fashion.
        </p>
        <Link href="/auth" className="btn-gold mt-10 fadein">BEGIN YOUR JOURNEY</Link>
      </section>

      <footer className="relative z-10 text-center text-xs tracking-widest text-cream/50 py-6">
        © Shein Members · Private Portfolio Platform
      </footer>
    </main>
  );
}
