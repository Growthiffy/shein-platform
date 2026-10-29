"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Copy, Check } from "lucide-react";

export default function DepositPage() { return <AppShell><Body /></AppShell>; }

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { if (!text) return; navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="inline-flex items-center gap-1 text-xs text-gold2 hover:underline">
      {done ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}

function Body() {
  const [addrs, setAddrs] = useState([]);
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState("");
  const [txHash, setTxHash] = useState("");
  const [slipUrl, setSlipUrl] = useState("");
  const [slip, setSlip] = useState(null);
  const [history, setHistory] = useState([]);
  const [err, setErr] = useState("");

  function loadHistory() { api("/api/wallet/history").then(d => setHistory(d.items.filter(x => x.type === "deposit"))); }
  useEffect(() => {
    api("/api/wallet/deposit-addresses").then(d => { setAddrs(d.items); if (d.items[0]) setChain(d.items[0].chain); });
    loadHistory();
  }, []);

  async function submit() {
    setErr("");
    try {
      const picked = addrs.find(a => a.chain === chain);
      const d = await api("/api/wallet/deposit", { method: "POST", body: { amount: Number(amount), chain, address: picked?.address, txHash, slipUrl: slipUrl.trim() || undefined } });
      setSlip(d.tx); setAmount(""); setTxHash(""); setSlipUrl(""); loadHistory();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="page grid md:grid-cols-2 gap-6">
      <div className="card p-6">
        <h2 className="font-display text-2xl text-gold">Deposit</h2>
        <label className="block mt-4"><span className="label">Chain</span>
          <select value={chain} onChange={e => setChain(e.target.value)} className="field mt-1">
            {addrs.map(a => <option key={a._id} value={a.chain}>{a.chain}</option>)}
          </select>
        </label>
        <div className="mt-3 p-3 bg-ink2 rounded-lg border border-line">
          <div className="flex items-center justify-between">
            <div className="label">Company Address</div>
            <CopyBtn text={addrs.find(a => a.chain === chain)?.address || ""} />
          </div>
          <div className="break-all text-sm text-gold mt-1">{addrs.find(a => a.chain === chain)?.address || "—"}</div>
        </div>
        <Input label="Amount (USD)" value={amount} onChange={setAmount} type="number" />
        <div className="mt-2 flex flex-wrap gap-2">
          {[50, 100, 500, 1000].map(v => (
            <button key={v} onClick={() => setAmount(String(v))} className="btn-outline py-1 px-3 text-xs">${v}</button>
          ))}
        </div>
        <Input label="Your TX Hash" value={txHash} onChange={setTxHash} />
        <Input label="Payment Slip URL (optional)" value={slipUrl} onChange={setSlipUrl} />
        {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
        <button className="btn-gold mt-4 w-full" onClick={submit}>SUBMIT DEPOSIT</button>
      </div>

      <div className="card p-6">
        <h3 className="font-display text-xl text-gold">Receipt</h3>
        {slip ? <Slip tx={slip} /> : <p className="text-cream/60 text-sm mt-2">A professional slip appears here after you submit.</p>}
        <h4 className="label mt-6">History</h4>
        <div className="mt-2 divide-y divide-black/[0.06]">
          {history.map(h => (
            <div key={h._id} className="py-2 text-sm flex justify-between">
              <span>{new Date(h.createdAt).toLocaleDateString()} · {h.chain}</span>
              <span className={`font-semibold ${h.status === "approved" ? "text-gold" : "text-cream/60"}`}>${h.amount} · {h.status}</span>
            </div>
          ))}
          {!history.length && <div className="text-cream/50 text-sm py-2">No deposits yet.</div>}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return <label className="block mt-3"><span className="label">{label}</span>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} className="field mt-1" /></label>;
}
function Slip({ tx }) {
  return (
    <div className="mt-3 border border-gold/40 rounded-xl p-4 bg-gradient-to-br from-ink2 to-gold2/10">
      <div className="text-center font-display text-gold text-lg">SHEIN · DEPOSIT RECEIPT</div>
      <div className="text-center text-xs text-cream/50 tracking-widest">TX {String(tx._id).slice(-10).toUpperCase()}</div>
      <div className="mt-3 text-sm space-y-1">
        <Row k="Amount" v={`$${tx.amount}`} /><Row k="Chain" v={tx.chain} /><Row k="Status" v={tx.status} /><Row k="Date" v={new Date(tx.createdAt).toLocaleString()} />
      </div>
    </div>
  );
}
function Row({ k, v }) { return <div className="flex justify-between"><span className="text-cream/60">{k}</span><span className="text-cream">{v}</span></div>; }
