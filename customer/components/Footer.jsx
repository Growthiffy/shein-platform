"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Send, Twitter, Instagram } from "lucide-react";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/risk-disclosure", label: "Risk Disclosure" },
  { href: "/aml", label: "AML Policy" },
];

const FALLBACK = {
  companyName: "Shein Global Ltd",
  companyRegistration: "SG-2021-48271",
  socialTelegram: "", socialTwitter: "", socialInstagram: "",
};

export default function Footer() {
  const [s, setS] = useState(FALLBACK);
  useEffect(() => {
    let alive = true;
    api("/api/public/settings")
      .then(d => { if (alive && d?.settings) setS({ ...FALLBACK, ...d.settings }); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const socials = [
    { url: s.socialTelegram, icon: Send, label: "Telegram" },
    { url: s.socialTwitter, icon: Twitter, label: "Twitter" },
    { url: s.socialInstagram, icon: Instagram, label: "Instagram" },
  ];

  return (
    <footer className="mt-10 border-t border-line bg-ink2">
      <div className="mx-auto max-w-[88rem] px-4 md:px-6 py-7 grid gap-5 md:grid-cols-3 md:items-center text-sm">
        <div className="text-cream/60 leading-relaxed">
          <div>© {new Date().getFullYear()} {s.companyName}. All rights reserved.</div>
          <div className="text-cream/45">Company Registration No. {s.companyRegistration}</div>
        </div>

        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} className="text-cream/70 hover:text-gold transition">{l.label}</Link>
          ))}
        </nav>

        <div className="flex md:justify-end gap-2">
          {socials.map(({ url, icon: Icon, label }) => (
            <a key={label} href={url || "#"} target={url ? "_blank" : undefined} rel="noreferrer"
              aria-label={label}
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-cream/60 hover:text-gold hover:border-gold/40 transition">
              <Icon size={16} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
