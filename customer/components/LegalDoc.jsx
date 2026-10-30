// Shared renderer for the text-heavy legal pages. `sections` is an ordered list
// of { h, body } where body is a string or an array of paragraph strings.
export default function LegalDoc({ title, updated, intro, sections }) {
  return (
    <article className="space-y-6">
      <header className="space-y-2 border-b border-line pb-6">
        <h1 className="font-display text-3xl md:text-4xl text-gold">{title}</h1>
        {updated && <div className="label">Last updated {updated}</div>}
        {intro && <p className="text-cream/70 leading-relaxed">{intro}</p>}
      </header>

      <div className="space-y-7">
        {sections.map((s, i) => (
          <section key={i} className="space-y-2">
            <h2 className="font-display text-lg text-cream">{i + 1}. {s.h}</h2>
            {(Array.isArray(s.body) ? s.body : [s.body]).map((p, j) => (
              <p key={j} className="text-sm text-cream/65 leading-relaxed">{p}</p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
