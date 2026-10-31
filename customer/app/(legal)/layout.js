import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata = { title: "Shein — Legal & Company" };

export default function LegalLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-ink text-cream">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto max-w-[88rem] px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="font-display text-2xl text-gold">SHEIN</Link>
          <Link href="/dashboard" className="btn-outline text-sm !py-2 !px-4">Back to app</Link>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 md:px-6 py-10 fadein">{children}</main>
      <Footer />
    </div>
  );
}
