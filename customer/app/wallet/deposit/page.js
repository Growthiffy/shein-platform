"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Deposit() {
  const r = useRouter();
  const [addrs, setAddrs] = useState([]);
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState("");
  const [txHash, setTxHash] = useState("");
  const [slipUrl, setSlipUrl] = useState("");
  const [slip, setSlip] = useState(null);
  const [history, setHistory] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!getToken()) { r.push("/auth"); return; }
    api("/api/wallet/deposit-addresses").then(d => { setAddrs(d.items); if (d.items[0]) setChain(d.items[0].chain); });
    api("/api/wallet/history").then(d => setHistory(d.items.filter(x => x.type === "deposit")));
  }, []);

  async function submit() {
    setErr("");
    try {
      const picked = addrs.find(a => a.chain === chain);
      const d = await api("/api/wallet/deposit", { method: "POST", body: { amount: Number(amount), chain, address: picked?.address, txHash, slipUrl: slipUrl.trim() || undefined } });
      setSlip(d.tx); setAmount(""); setTxHash(""); setSlipUrl("");
      api("/api/wallet/history").then(d => setHistory(d.items.filter(x => x.type === "deposit")));
    } catch (e) { setErr(e.message); }
  }

  return (
    <main className="min-h-screen bg-ink text-cream">
      <header className="px-6 py-4 border-b border-gold/10"><Link href="/analyst" className="font-display text-xl text-gold">← Analyst</Link></header>
      <section className="max-w-3xl mx-auto px-6 py-8 grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-display text-2xl text-gold">Deposit</h2>
          <label className="block mt-4">
            <span className="text-xs tracking-widest text-cream/60">CHAIN</span>
            <select value={chain} onChange={e => setChain(e.target.value)} className="w-full mt-1 bg-black/40 border border-gold/20 rounded-lg px-3 py-2">
              {addrs.map(a => <option key={a._id} value={a.chain}>{a.chain}</option>)}
            </select>
          </label>
          <div className="mt-3 p-3 bg-black/40 rounded-lg border border-gold/10">
            <div className="text-xs tracking-widest text-cream/50">COMPANY ADDRESS</div>
            <div className="break-all text-sm text-gold">{addrs.find(a => a.chain === chain)?.address || "—"}</div>
          </div>
          <Input label="Amount (USD)" value={amount} onChange={setAmount} type="number" />
          <Input label="Your TX Hash" value={txHash} onChange={setTxHash} />
          <Input label="Payment Slip URL (optional)" value={slipUrl} onChange={setSlipUrl} />
          {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
          <button className="btn-gold mt-4 w-full" onClick={submit}>SUBMIT DEPOSIT</button>
        </div>

        <div className="card p-6">
          <h3 className="font-display text-xl text-gold">Receipt</h3>
          {slip ? <Slip tx={slip} /> : <p className="text-cream/60 text-sm mt-2">A professional slip will appear here after you submit.</p>}
          <h4 className="mt-6 text-cream/80 text-sm tracking-widest">HISTORY</h4>
          <div className="mt-2 divide-y divide-white/5">
            {history.map(h => (
              <div key={h._id} className="py-2 text-sm flex justify-between">
                <span>{new Date(h.createdAt).toLocaleDateString()} · {h.chain}</span>
                <span className={`font-semibold ${h.status === "approved" ? "text-gold" : "text-cream/60"}`}>${h.amount} · {h.status}</span>
              </div>
            ))}
            {!history.length && <div className="text-cream/50 text-sm py-2">No deposits yet.</div>}
          </div>
        </div>
      </section>
    </main>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block mt-3">
      <span className="text-xs tracking-widest text-cream/60">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full mt-1 bg-black/40 border border-gold/20 rounded-lg px-3 py-2 outline-none focus:border-gold" />
    </label>
  );
}

function Slip({ tx }) {
  return (
    <div className="mt-3 border border-gold/40 rounded-xl p-4 bg-gradient-to-br from-black to-gold/5">
      <div className="text-center font-display text-gold text-lg">SHEIN · DEPOSIT RECEIPT</div>
      <div className="text-center text-xs text-cream/50 tracking-widest">TX {String(tx._id).slice(-10).toUpperCase()}</div>
      <div className="mt-3 text-sm space-y-1">
        <Row k="Amount"   v={`$${tx.amount}`} />
        <Row k="Chain"    v={tx.chain} />
        <Row k="Status"   v={tx.status} />
        <Row k="Date"     v={new Date(tx.createdAt).toLocaleString()} />
      </div>
    </div>
  );
}
function Row({ k, v }) { return <div className="flex justify-between"><span className="text-cream/60">{k}</span><span className="text-cream">{v}</span></div>; }
