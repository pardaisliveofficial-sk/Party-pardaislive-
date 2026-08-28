import React, { useEffect, useMemo, useState } from "react";
import { authenticatedFetch, resolveApiUrl } from "../lib/apiClient";
import { ArrowLeft, Banknote, CalendarDays, CheckCircle2, Clock3, Coins, DollarSign, History, LockKeyhole, TrendingUp, Wallet, XCircle } from "lucide-react";

type Plan = {
  id: string; name: string; minDeposit: number; maxDeposit?: number | null;
  revenueSharePercent: number; payoutCycle: string; coinConversionRate: number; status: "Active" | "Inactive";
};

type Dashboard = {
  totalDeposit: number; activeBalance: number; thisMonthEarnings: number; totalEarnings: number;
  availableEarnings: number; pendingEarnings: number;
};

type Investment = {
  id: string; planId: string; planName: string; principal: number; status: string;
  startDate?: string; monthlyEarnings?: number; totalEarnings?: number; availableEarnings?: number;
  pendingEarnings?: number; coinConversionRate?: number; paymentMethod?: string; createdAt?: string;
};

type Withdrawal = { id: string; investmentId: string; amount: number; type: string; payoutFormat: string; status: string; createdAt: string };

const money = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusClass = (status: string) => status === "Active" || status === "Completed" ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" : status === "Rejected" || status === "Cancelled" ? "text-red-300 bg-red-400/10 border-red-400/20" : "text-amber-300 bg-amber-400/10 border-amber-400/20";

export function RevenueShareModule({ onBack }: { onBack: () => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard>({ totalDeposit: 0, activeBalance: 0, thisMonthEarnings: 0, totalEarnings: 0, availableEarnings: 0, pendingEarnings: 0 });
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tab, setTab] = useState<"dashboard" | "plans" | "history">("dashboard");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank");
  const [payoutFormat, setPayoutFormat] = useState<"cash" | "coins">("cash");
  const [withdrawType, setWithdrawType] = useState<"earnings" | "principal">("earnings");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, d, i, w] = await Promise.all([
        fetch(resolveApiUrl("/api/v1/revenue-share/plans"), { cache: "no-store" }),
        authenticatedFetch("/api/v1/revenue-share/dashboard"),
        authenticatedFetch("/api/v1/revenue-share/investments"),
        authenticatedFetch("/api/v1/revenue-share/withdrawals")
      ]);
      if (p.ok) setPlans(await p.json());
      if (d.ok) setDashboard(await d.json());
      if (i.ok) setInvestments(await i.json());
      if (w.ok) setWithdrawals(await w.json());
    } catch (e: any) {
      setNotice(e?.message || "Revenue Share could not be loaded.");
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const activePlans = useMemo(() => plans.filter(p => p.status === "Active"), [plans]);
  const submitInvestment = async () => {
    if (!selectedPlan) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value < selectedPlan.minDeposit || (selectedPlan.maxDeposit && value > selectedPlan.maxDeposit)) {
      setNotice(`Enter an amount between ${money(selectedPlan.minDeposit)} and ${selectedPlan.maxDeposit ? money(selectedPlan.maxDeposit) : "no maximum"}.`); return;
    }
    setSaving(true);
    try {
      const res = await authenticatedFetch("/api/v1/revenue-share/investments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: selectedPlan.id, amount: value, paymentMethod }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Investment request failed.");
      setNotice(`Investment ${data.investment.id} submitted for payment verification.`);
      setSelectedPlan(null); setAmount(""); await load();
    } catch (e: any) { setNotice(e?.message || "Investment request failed."); }
    finally { setSaving(false); }
  };

  const submitWithdrawal = async () => {
    const value = Number(withdrawAmount);
    if (!Number.isFinite(value) || value <= 0) { setNotice("Enter a valid withdrawal amount."); return; }
    setSaving(true);
    try {
      const res = await authenticatedFetch("/api/v1/revenue-share/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: value, type: withdrawType, payoutFormat }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Withdrawal request failed.");
      setNotice(`Withdrawal ${data.withdrawal.id} submitted.`); setWithdrawAmount(""); await load();
    } catch (e: any) { setNotice(e?.message || "Withdrawal request failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-cyan-300 font-mono text-xs">Loading Revenue Share…</div>;

  return <div className="flex-1 overflow-y-auto p-3 md:p-5 pb-24 space-y-4">
    <div className="flex items-center gap-2">
      <button onClick={onBack} className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 text-white flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></button>
      <div className="min-w-0"><div className="text-[9px] uppercase tracking-[0.2em] text-pink-400 font-black">Pardais Shop</div><h1 className="text-xl font-black text-white">Gifter Revenue Share</h1><p className="text-[9px] text-gray-400">Grow with Pardais Party</p></div>
    </div>

    {notice && <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-100 px-3 py-2 text-[9px] flex justify-between gap-2"><span>{notice}</span><button onClick={() => setNotice(null)}><XCircle className="w-4 h-4" /></button></div>}

    <div className="grid grid-cols-2 gap-2">
      {[['Total Deposit', dashboard.totalDeposit, DollarSign], ['Active Balance', dashboard.activeBalance, LockKeyhole], ["This Month's Earnings", dashboard.thisMonthEarnings, TrendingUp], ['Total Earnings', dashboard.totalEarnings, Banknote], ['Available Earnings', dashboard.availableEarnings, Wallet], ['Pending Earnings', dashboard.pendingEarnings, Clock3]].map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border border-white/10 bg-[#11111c]/90 p-3"><div className="flex items-center gap-1.5 text-gray-400 text-[8px] font-black uppercase"><Icon className="w-3.5 h-3.5 text-pink-400" />{label}</div><div className="text-lg font-black text-white mt-2">{money(Number(value))}</div></div>)}
    </div>

    <div className="grid grid-cols-3 gap-1 bg-[#11111c] border border-white/10 rounded-xl p-1">
      {[["dashboard", "Dashboard"], ["plans", "Invest"], ["history", "History"]].map(([key, label]) => <button key={key} onClick={() => setTab(key as any)} className={`py-2 rounded-lg text-[9px] font-black uppercase ${tab === key ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white" : "text-gray-400"}`}>{label}</button>)}
    </div>

    {tab === "dashboard" && <div className="space-y-3">
      <div className="rounded-2xl border border-yellow-400/20 bg-gradient-to-br from-[#241535] to-[#0e1922] p-4"><div className="flex items-center gap-2"><TrendingUp className="text-yellow-300 w-5 h-5"/><h2 className="text-sm font-black text-white">Revenue participation</h2></div><p className="text-[9px] text-gray-400 mt-2">Your principal and revenue-share earnings are tracked separately. Monthly distributions are recorded permanently.</p><button onClick={() => setTab("plans")} className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-black uppercase">Explore Plans</button></div>
      <div className="rounded-2xl border border-white/10 bg-[#101019] p-3"><h3 className="text-xs font-black text-white">Active Investments</h3>{investments.length === 0 ? <p className="text-[9px] text-gray-500 mt-3">No investments yet.</p> : investments.map(inv => <div key={inv.id} className="mt-2 p-2.5 rounded-xl bg-white/5 flex items-center justify-between"><div><p className="text-[10px] text-white font-black">{inv.planName}</p><p className="text-[8px] text-gray-500">{inv.id} · Principal {money(inv.principal)}</p></div><span className={`text-[7px] font-black border rounded-full px-2 py-1 ${statusClass(inv.status)}`}>{inv.status}</span></div>)}</div>
    </div>}

    {tab === "plans" && <div className="space-y-3">
      {activePlans.length === 0 ? <div className="text-center py-10 text-gray-500 text-xs">No active plans available.</div> : activePlans.map(plan => <div key={plan.id} className="rounded-2xl border border-white/10 bg-[#11111c] p-4"><div className="flex justify-between items-start"><div><h3 className="text-base font-black text-white">{plan.name}</h3><p className="text-[8px] text-gray-500 mt-1">Payout cycle: {plan.payoutCycle}</p></div><span className="text-emerald-300 text-[8px] font-black border border-emerald-400/20 bg-emerald-400/10 rounded-full px-2 py-1">{plan.revenueSharePercent}% SHARE</span></div><div className="grid grid-cols-2 gap-2 mt-3"><div className="bg-white/5 rounded-xl p-2"><span className="text-[7px] text-gray-500">MINIMUM</span><p className="text-sm font-black text-yellow-300">{money(plan.minDeposit)}</p></div><div className="bg-white/5 rounded-xl p-2"><span className="text-[7px] text-gray-500">MAXIMUM</span><p className="text-sm font-black text-white">{plan.maxDeposit ? money(plan.maxDeposit) : "No limit"}</p></div></div><button onClick={() => setSelectedPlan(plan)} className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-black uppercase">Invest in {plan.name}</button></div>)}
    </div>}

    {tab === "history" && <div className="space-y-3"><div className="rounded-2xl border border-white/10 bg-[#11111c] p-3"><h3 className="text-xs font-black text-white flex items-center gap-2"><History className="w-4 h-4 text-pink-400"/> Investments</h3>{investments.map(inv => <div key={inv.id} className="border-b border-white/5 py-3 last:border-0"><div className="flex justify-between"><span className="text-[10px] font-black text-white">{inv.id}</span><span className={`text-[7px] border rounded-full px-2 py-1 ${statusClass(inv.status)}`}>{inv.status}</span></div><p className="text-[8px] text-gray-400 mt-1">{inv.planName} · Deposit {money(inv.principal)} · Earned {money(inv.totalEarnings || 0)}</p></div>)}</div><div className="rounded-2xl border border-white/10 bg-[#11111c] p-3"><h3 className="text-xs font-black text-white">Withdrawals</h3>{withdrawals.length === 0 ? <p className="text-[9px] text-gray-500 mt-3">No withdrawal requests.</p> : withdrawals.map(w => <div key={w.id} className="border-b border-white/5 py-2.5 last:border-0"><div className="flex justify-between"><span className="text-[9px] text-white font-black">{w.id}</span><span className={`text-[7px] border rounded-full px-2 py-1 ${statusClass(w.status)}`}>{w.status}</span></div><p className="text-[8px] text-gray-400 mt-1">{w.type} · {money(w.amount)} · {w.payoutFormat}</p></div>)}</div></div>}

    {tab === "dashboard" && <div className="rounded-2xl border border-white/10 bg-[#11111c] p-3"><h3 className="text-xs font-black text-white mb-3">Withdraw Earnings / Principal</h3><div className="grid grid-cols-2 gap-2"><select value={withdrawType} onChange={e => setWithdrawType(e.target.value as any)} className="bg-black/30 border border-white/10 rounded-xl p-2 text-[9px] text-white"><option value="earnings">Withdraw Earnings</option><option value="principal">Withdraw Principal</option></select><select value={payoutFormat} onChange={e => setPayoutFormat(e.target.value as any)} className="bg-black/30 border border-white/10 rounded-xl p-2 text-[9px] text-white"><option value="cash">Cash</option><option value="coins">Coins</option></select></div><div className="flex gap-2 mt-2"><input value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} type="number" min="0" placeholder="Amount" className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 text-[10px] text-white"/><button disabled={saving} onClick={submitWithdrawal} className="px-4 rounded-xl bg-yellow-400 text-black text-[9px] font-black">Withdraw</button></div></div>}

    {selectedPlan && <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-3"><div className="w-full max-w-md rounded-3xl border border-pink-400/20 bg-[#101019] p-4 shadow-2xl"><div className="flex justify-between"><div><h3 className="text-base font-black text-white">Invest — {selectedPlan.name}</h3><p className="text-[8px] text-gray-500">Minimum {money(selectedPlan.minDeposit)} · {selectedPlan.revenueSharePercent}% configured share</p></div><button onClick={() => setSelectedPlan(null)}><XCircle className="w-5 h-5 text-gray-400"/></button></div><input value={amount} onChange={e => setAmount(e.target.value)} type="number" min={selectedPlan.minDeposit} className="w-full mt-4 bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm" placeholder="Deposit amount"/><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full mt-2 bg-black/30 border border-white/10 rounded-xl p-3 text-white text-xs"><option>Bank</option><option>Easypaisa</option><option>JazzCash</option><option>Card</option><option>Existing Wallet</option></select><p className="text-[8px] text-gray-500 mt-2">After submission, the deposit remains Pending until payment verification.</p><button disabled={saving} onClick={submitInvestment} className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-black uppercase">{saving ? "Submitting…" : "Confirm Investment"}</button></div></div>}
  </div>;
}
