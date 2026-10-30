"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { CHAINS } from "@/lib/constants";
import { useToast } from "@/components/Toast";
import StageTracker, { WITHDRAW_STEPS, StageBadge } from "@/components/wallet/StageTracker";
import { ShareProof } from "@/components/ui";

export default function WithdrawPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { me, refresh } = useMe();
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState(CHAINS[0]);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [history, setHistory] = useState([]);
  const [err, setErr] = useState("");
  const [needsVerify, setNeedsVerify] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [limits, setLimits] = useState(null);
  const [bal, setBal] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function load() {
    const h = await api("/api/wallet/history"); setHistory(h.items.filter(x => x.type === "withdrawal"));
    try { setLimits(await api("/api/wallet/limits")); } catch {}
    try { setBal(await api("/api/wallet/balance")); } catch {}
  }
  useEffect(() => { load(); }, []);

  async function saveWallet() {
    setErr("");
    try { await api("/api/me/payout-wallet", { method: "POST", body: { chain, address, label } }); await refresh(); }
    catch (e) { setErr(e.message); }
  }
  async function withdraw() {
    setErr(""); setNeedsVerify(false); setBusy(true);
    try {
      const d = await api("/api/wallet/withdraw", { method: "POST", body: { amount: Number(amount), chain, address } });
      setReceipt(d.tx); setAmount(""); toast({ text: "Withdrawal request submitted", type: "info" }); await Promise.all([load(), refresh()]);
    } catch (e) { setErr(e.message); if (/verification/i.test(e.message)) setNeedsVerify(true); }
    finally { setBusy(false); }
  }

  const fee = limits?.withdrawalFeeUsd ?? 0;
  const amt = Number(amount) || 0;
  const youReceive = Math.max(0, amt - fee);

  return (
    <div className="page grid md:grid-cols-2 gap-6">
      <div className="card p-6">
        <h2 className="font-display text-2xl text-gold">Withdraw</h2>
        <div className="text-sm text-cream/60 mt-1">
          Available: <span className="text-gold font-semibold">${(bal?.available ?? me.balance).toFixed(2)}</span>
          {bal?.pending ? <> &nbsp;/&nbsp; Pending: <span className="text-cream/80">${bal.pending.toFixed(2)}</span></> : null}
        </div>

        <h4 className="label mt-5">Your Wallets</h4>
        <div className="mt-2 space-y-2">
          {me.payoutWallets?.map((w, i) => {
            const held = w.active === false;
            return (
              <button key={i} onClick={() => { setChain(w.chain); setAddress(w.address); }}
                className="w-full text-left p-2 rounded border border-line hover:border-gold/40">
                <div className="text-xs text-cream/50 flex items-center gap-2">
                  {w.chain} · {w.label || "wallet"}
                  {held && <span className="text-amber-600">· 24h hold</span>}
                </div>
                <div className="text-sm text-cream break-all">{w.address}</div>
              </button>
            );
          })}
          {!me.payoutWallets?.length && <div className="text-cream/50 text-sm">Add a wallet below.</div>}
        </div>

        <h4 className="label mt-5">Add / Update Wallet</h4>
        <label className="block mt-2"><span className="label">Chain</span>
          <select value={chain} onChange={e => setChain(e.target.value)} className="field mt-1">
            {CHAINS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <Input label="Address" value={address} onChange={setAddress} />
        <Input label="Label (optional)" value={label} onChange={setLabel} />
        <button className="btn-outline mt-3 py-2 px-4 text-sm" onClick={saveWallet}>SAVE WALLET</button>

        <Input label="Amount (USD)" value={amount} onChange={setAmount} type="number" />
        <div className="mt-2 flex flex-wrap gap-2">
          {[["25%", me.balance * 0.25], ["50%", me.balance * 0.5], ["Max", me.balance]].map(([lbl, v]) => (
            <button key={lbl} onClick={() => setAmount(String(Math.floor(v * 100) / 100))} className="btn-outline py-1 px-3 text-xs">{lbl}</button>
          ))}
        </div>
        {limits?.minWithdrawalUsd != null && <div className="text-xs text-cream/50 mt-1">Minimum: ${limits.minWithdrawalUsd}</div>}

        {amt > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-ink2 border border-line text-sm space-y-1">
            <Row k="Withdrawal amount" v={`$${amt.toFixed(2)}`} />
            <Row k="Network fee" v={`-$${fee.toFixed(2)}`} />
            <div className="flex justify-between border-t border-line pt-1 mt-1"><span className="text-cream/70">You receive</span><b className="text-gold">${youReceive.toFixed(2)}</b></div>
            <Row k="Est. processing" v="1-3 business days" />
          </div>
        )}

        {err && <div className="text-red-500 text-sm mt-2">{err}</div>}
        {needsVerify && <Link href="/verification" className="block text-sm text-gold2 underline mt-1">Complete identity verification →</Link>}
        <button className="btn-gold mt-3 w-full" onClick={withdraw} disabled={busy || !amt || !address}>{busy ? "SUBMITTING…" : "REQUEST WITHDRAWAL"}</button>
      </div>

      <div className="card p-6">
        <h3 className="font-display text-xl text-gold">Receipt</h3>
        {receipt ? (
          <div className="mt-3 border border-gold/40 rounded-xl p-4 bg-gradient-to-br from-ink2 to-gold2/10 text-sm">
            <div className="text-center font-display text-gold">SHEIN · WITHDRAWAL</div>
            <div className="text-center text-xs text-cream/50 tracking-widest">TX {String(receipt._id).slice(-10).toUpperCase()}</div>
            <div className="mt-3 space-y-1">
              <Row k="Amount" v={`$${receipt.amount}`} />
              {receipt.networkFee ? <Row k="Network fee" v={`-$${receipt.networkFee}`} /> : null}
              <Row k="Chain" v={receipt.chain} />
              <div className="flex justify-between"><span className="text-cream/60">Address</span><b className="text-xs break-all max-w-[50%]">{receipt.address}</b></div>
              {receipt.estimatedCompletionAt && <Row k="Est. completion" v={new Date(receipt.estimatedCompletionAt).toLocaleDateString()} />}
            </div>
            <StageTracker steps={WITHDRAW_STEPS} current={receipt.processingStage} history={receipt.stageHistory} />
            <ShareProof txId={receipt._id} kind="withdrawal" />
          </div>
        ) : <p className="text-cream/60 text-sm mt-2">Submit a withdrawal to see a receipt and tracker.</p>}

        <h4 className="label mt-6">History</h4>
        <div className="mt-2 divide-y divide-black/[0.06]">
          {history.map(h => (
            <div key={h._id} className="py-2 text-sm flex items-center justify-between gap-2">
              <span className="text-cream/70">{new Date(h.createdAt).toLocaleDateString()} · {h.chain}</span>
              <span className="flex items-center gap-2"><b>${h.amount}</b><StageBadge stage={h.processingStage} /></span>
            </div>
          ))}
          {!history.length && <div className="text-cream/50 text-sm py-2">No withdrawals yet.</div>}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return <label className="block mt-2"><span className="label">{label}</span>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} className="field mt-1" /></label>;
}
function Row({ k, v }) { return <div className="flex justify-between"><span className="text-cream/60">{k}</span><b>{v}</b></div>; }
