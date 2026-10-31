"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

// Public CMS page rendered from admin-editable content (by slug).
export default function CmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    api(`/api/public/page/${slug}`).then(d => setPage(d.page)).catch(() => setPage(null));
  }, [slug]);

  return (
    <main className="min-h-screen bg-ink text-cream">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/" className="font-display text-2xl text-gold">SHEIN</Link>
        {page === undefined && <div className="mt-8 skeleton h-64 w-full rounded-xl" />}
        {page === null && <div className="mt-10 text-cream/60">Page not found.</div>}
        {page && (
          <article className="mt-8">
            <h1 className="font-display text-3xl md:text-4xl text-gold">{page.title}</h1>
            <div className="prose-cms mt-5 text-cream/80 leading-relaxed [&_h2]:text-gold [&_h2]:font-display [&_h2]:text-xl [&_h2]:mt-6 [&_a]:text-gold2 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_p]:mb-3"
              dangerouslySetInnerHTML={{ __html: page.content || "" }} />
          </article>
        )}
      </div>
    </main>
  );
}
