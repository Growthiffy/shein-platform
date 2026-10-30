export const metadata = { title: "About — Shein Global Ltd" };

const TEAM = [
  { name: "Elena Marchetti", title: "Chief Executive Officer", bio: "20 years in retail analytics and consumer markets." },
  { name: "David Osei", title: "Chief Technology Officer", bio: "Built trading and data platforms at global scale." },
  { name: "Priya Raman", title: "Head of Analytics", bio: "Leads the product-scoring and demand models." },
  { name: "Thomas Brandt", title: "Chief Compliance Officer", bio: "Former regulator; owns KYC and AML programs." },
  { name: "Sofia Lindqvist", title: "Head of Community", bio: "Runs the analyst network and mentorship." },
];

const STATS = [
  ["12,000+", "Active analysts"],
  ["180+", "Countries served"],
  ["$48M+", "Paid out to members"],
];

function initials(n) { return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3 border-b border-line pb-8">
        <div className="label">About Us</div>
        <h1 className="font-display text-3xl md:text-4xl text-gold">Shein Global Ltd</h1>
        <p className="text-cream/70 leading-relaxed max-w-2xl">
          Founded in 2021, Shein Global Ltd provides market analysis tools and investment
          services to a growing network of independent product analysts worldwide.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {STATS.map(([v, l]) => (
          <div key={l} className="stat text-center">
            <div className="font-display text-3xl text-gold">{v}</div>
            <div className="label mt-1">{l}</div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-cream">Our Mission</h2>
        <p className="text-cream/65 leading-relaxed max-w-2xl">
          We believe sound market insight should not be locked inside institutions. Our mission
          is to put professional-grade product analysis, transparent earnings, and disciplined
          investment options in the hands of independent analysts everywhere — and to reward the
          work they put in.
        </p>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-2xl text-cream">Leadership Team</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TEAM.map(m => (
            <div key={m.name} className="card p-5 flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full gold-grad text-white font-display font-bold">
                {initials(m.name)}
              </div>
              <div>
                <div className="font-semibold text-cream">{m.name}</div>
                <div className="text-xs text-gold2">{m.title}</div>
                <p className="text-sm text-cream/60 mt-1">{m.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
