"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { CHAINS } from "@/lib/constants";

export default function Withdraw() {
  const r = useRouter();
  const [me, setMe] = useState(null);
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState(CHAINS[0]);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [history, setHistory] = useState([]);
  const [err, setErr] = useState("");
  const [receipt, setReceipt] = useState(null);

  async function load() {
    const u = await api("/api/me"); setMe(u.user);
    const h = await api("/api/wallet/history"); setHistory(h.items.filter(x => x.type === "withdrawal"));
  }
  useEffect(() => {
    if (!getToken()) { r.push("/auth"); return; }
    load();
  }, []);

  async function saveWallet() {
    setErr("");
    try { await api("/api/me/payout-wallet", { method: "POST", body: { chain, address, label } }); await load(); }
    catch (e) { setErr(e.message); }
  }
  async function withdraw() {
    setErr("");
    try {
      const d = await api("/api/wallet/withdraw", { method: "POST", body: { amount: Number(amount), chain, address } });
      setReceipt(d.tx); setAmount(""); await load();
    } catch (e) { setErr(e.message); }
  }

  if (!me) return <div className="min-h-screen flex items-center justify-center bg-ink text-cream">Loading…</div>;
  return (
    <main className="min-h-screen bg-ink text-cream">
      <header className="px-6 py-4 border-b border-gold/10"><Link href="/analyst" className="font-display text-xl text-gold">← Analyst</Link></header>
      <section className="max-w-3xl mx-auto px-6 py-8 grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-display text-2xl text-gold">Withdraw</h2>
          <div className="text-sm text-cream/60 mt-1">Available: <span className="text-gold font-semibold">${me.balance.toFixed(2)}</span></div>

          <h4 className="mt-5 text-cream/80 text-xs tracking-widest">YOUR WALLETS</h4>
          <div className="mt-2 space-y-2">
            {me.payoutWallets?.map((w, i) => (
              <button key={i} onClick={() => { setChain(w.chain); setAddress(w.address); }}
                className="w-full text-left p-2 rounded border border-white/10 hover:border-gold/40">
                <div className="text-xs text-cream/50">{w.chain} · {w.label || "wallet"}</div>
                <div className="text-sm text-cream break-all">{w.address}</div>
              </button>
            ))}
            {!me.payoutWallets?.length && <div className="text-cream/50 text-sm">Add a wallet below.</div>}
          </div>

          <h4 className="mt-5 text-cream/80 text-xs tracking-widest">ADD / UPDATE WALLET</h4>
          <label className="block mt-3">
            <span className="text-xs tracking-widest text-cream/60">CHAIN</span>
            <select value={chain} onChange={e => setChain(e.target.value)} className="w-full mt-1 bg-black/40 border border-gold/20 rounded-lg px-3 py-2 outline-none focus:border-gold">
              {CHAINS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <Input label="Address" value={address} onChange={setAddress} />
          <Input label="Label (optional)" value={label} onChange={setLabel} />
          <button className="mt-3 px-4 py-2 rounded-full border border-gold/40" onClick={saveWallet}>SAVE WALLET</button>

          <Input label="Amount (USD)" value={amount} onChange={setAmount} type="number" />
          {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
          <button className="btn-gold mt-3 w-full" onClick={withdraw}>REQUEST WITHDRAWAL</button>
        </div>

        <div className="card p-6">
          <h3 className="font-display text-xl text-gold">Receipt</h3>
          {receipt ? (
            <div className="mt-3 border border-gold/40 rounded-xl p-4 bg-gradient-to-br from-black to-gold/5 text-sm">
              <div className="text-center font-display text-gold">SHEIN · WITHDRAWAL</div>
              <div className="text-center text-xs text-cream/50 tracking-widest">TX {String(receipt._id).slice(-10).toUpperCase()}</div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between"><span>Amount</span><b>${receipt.amount}</b></div>
                <div className="flex justify-between"><span>Chain</span><b>{receipt.chain}</b></div>
                <div className="flex justify-between"><span>Address</span><b className="text-xs break-all max-w-[50%]">{receipt.address}</b></div>
                <div className="flex justify-between"><span>Status</span><b>{receipt.status}</b></div>
              </div>
            </div>
          ) : <p className="text-cream/60 text-sm mt-2">Submit a withdrawal to see a receipt.</p>}

          <h4 className="mt-6 text-cream/80 text-sm tracking-widest">HISTORY</h4>
          <div className="mt-2 divide-y divide-white/5">
            {history.map(h => (
              <div key={h._id} className="py-2 text-sm flex justify-between">
                <span>{new Date(h.createdAt).toLocaleDateString()} · {h.chain}</span>
                <span className={`font-semibold ${h.status === "approved" ? "text-gold" : "text-cream/60"}`}>${h.amount} · {h.status}</span>
              </div>
            ))}
            {!history.length && <div className="text-cream/50 text-sm py-2">No withdrawals yet.</div>}
          </div>
        </div>
      </section>
    </main>
  );
}
function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block mt-2">
      <span className="text-xs tracking-widest text-cream/60">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full mt-1 bg-black/40 border border-gold/20 rounded-lg px-3 py-2 outline-none focus:border-gold" />
    </label>
  );
}
