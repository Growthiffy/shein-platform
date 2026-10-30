"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";
import StageTracker, { DEPOSIT_STEPS, StageBadge } from "@/components/wallet/StageTracker";

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
  const [qr, setQr] = useState("");
  const [limits, setLimits] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const address = addrs.find(a => a.chain === chain)?.address || "";

  function loadHistory() { api("/api/wallet/history").then(d => setHistory(d.items.filter(x => x.type === "deposit"))); }
  useEffect(() => {
    api("/api/wallet/deposit-addresses").then(d => { setAddrs(d.items); if (d.items[0]) setChain(d.items[0].chain); });
    api("/api/wallet/limits").then(setLimits).catch(() => {});
    loadHistory();
  }, []);

  // Generate a QR data URL for the selected deposit address.
  useEffect(() => {
    if (!address) { setQr(""); return; }
    QRCode.toDataURL(address, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(""));
  }, [address]);

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const d = await api("/api/wallet/deposit", { method: "POST", body: { amount: Number(amount), chain, address, txHash, slipUrl: slipUrl.trim() || undefined } });
      setSlip(d.tx); setAmount(""); setTxHash(""); setSlipUrl(""); loadHistory();
      toast({ text: "Deposit submitted — pending review", type: "info" });
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="page grid md:grid-cols-2 gap-6">
      <div className="card p-6">
        <h2 className="font-display text-2xl text-gold">Deposit</h2>
        {limits && (
          <div className="text-xs text-cream/50 mt-1">
            Daily limit: ${Number(limits.depositDailyLimit).toLocaleString()} / Monthly limit: ${Number(limits.depositMonthlyLimit).toLocaleString()}
          </div>
        )}
        <label className="block mt-4"><span className="label">Chain</span>
          <select value={chain} onChange={e => setChain(e.target.value)} className="field mt-1">
            {addrs.map(a => <option key={a._id} value={a.chain}>{a.chain}</option>)}
          </select>
        </label>

        <div className="mt-3 flex flex-col items-center gap-3">
          {qr && <img src={qr} alt="Deposit address QR" className="rounded-lg border border-line bg-white p-1" width={180} height={180} />}
          <div className="w-full p-3 bg-ink2 rounded-lg border border-line">
            <div className="flex items-center justify-between">
              <div className="label">Company Address</div>
              <CopyBtn text={address} />
            </div>
            <div className="break-all text-sm text-gold mt-1">{address || "—"}</div>
          </div>
        </div>

        <Input label="Amount (USD)" value={amount} onChange={setAmount} type="number" />
        <div className="mt-2 flex flex-wrap gap-2">
          {[50, 100, 500, 1000].map(v => (
            <button key={v} onClick={() => setAmount(String(v))} className="btn-outline py-1 px-3 text-xs">${v}</button>
          ))}
        </div>
        <Input label="Your TX Hash" value={txHash} onChange={setTxHash} />
        <Input label="Payment Slip URL (optional)" value={slipUrl} onChange={setSlipUrl} />
        {err && <div className="text-red-500 text-sm mt-2">{err}</div>}
        <button className="btn-gold mt-4 w-full" onClick={submit} disabled={busy || !amount}>{busy ? "SUBMITTING…" : "SUBMIT DEPOSIT"}</button>
      </div>

      <div className="card p-6">
        <h3 className="font-display text-xl text-gold">Receipt</h3>
        {slip ? <Slip tx={slip} /> : <p className="text-cream/60 text-sm mt-2">A professional slip + tracker appears here after you submit.</p>}
        <h4 className="label mt-6">History</h4>
        <div className="mt-2 divide-y divide-black/[0.06]">
          {history.map(h => (
            <div key={h._id} className="py-2 text-sm flex items-center justify-between gap-2">
              <span className="text-cream/70">{new Date(h.createdAt).toLocaleDateString()} · {h.chain}</span>
              <span className="flex items-center gap-2"><b>${h.amount}</b><StageBadge stage={h.processingStage} /></span>
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
        <Row k="Amount" v={`$${tx.amount}`} /><Row k="Chain" v={tx.chain} /><Row k="Date" v={new Date(tx.createdAt).toLocaleString()} />
      </div>
      <StageTracker steps={DEPOSIT_STEPS} current={tx.processingStage} history={tx.stageHistory} />
    </div>
  );
}
function Row({ k, v }) { return <div className="flex justify-between"><span className="text-cream/60">{k}</span><span className="text-cream">{v}</span></div>; }
