"use client";
import { useState, useEffect, useCallback } from "react";
import { CONTRACT_ADDRESS, connectWallet, readClient, shortAddr, type WalletState } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

type Case = { id: string; plaintiff: string; defendant: string; title: string; complaint: string; evidence: string; defense: string; defense_evidence: string; stake: string; status: number; ruling: string; };

const STATUS = ["Filed", "Awaiting Judgment", "Ruled"];
const SCOLOR = ["#b45309", "#1d4ed8", "#6d28d9"];

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [cases, setCases] = useState<Case[]>([]);
  const [charter, setCharter] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"browse" | "file">("browse");
  const [selected, setSelected] = useState<Case | null>(null);
  const [form, setForm] = useState({ title: "", complaint: "", evidence: "", defendant: "", stake: "" });
  const [defense, setDefense] = useState({ text: "", evidence: "" });
  const [tx, setTx] = useState("");

  const load = useCallback(async () => {
    try {
      const rc = readClient();
      try { setCharter(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_charter", args: [] }) as string); } catch {}
      const count = Number(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_case_count", args: [] }));
      const out: Case[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_case", args: [String(i)] });
        out.push(JSON.parse(raw as string));
      }
      setCases(out.reverse());
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleConnect() {
    setTx("Connecting…");
    try { const w = await connectWallet(); setWallet(w); setTx(`Connected · ${shortAddr(w.address!)}`); }
    catch (e: any) { setTx(`⚠ ${e.message}`); }
  }

  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { setTx("⚠ Connect your wallet first"); return; }
    setLoading(true); setTx(`Filing ${fn}…`);
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
      setTx("✓ Recorded"); await load(); setSelected(null);
    } catch (e: any) { setTx(`⚠ ${e.message}`); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1729", color: "#e2e1d8" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "30px 22px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #8b6914", paddingBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 34 }}>⚖️</span>
            <div>
              <h1 style={{ margin: 0, fontFamily: "'Playfair Display',Georgia,serif", fontSize: 30, color: "#d4af37", letterSpacing: 0.5 }}>JuryPool</h1>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8a90a0", fontStyle: "italic" }}>Decentralized court · AI adjudication</p>
            </div>
          </div>
          {wallet.address ? (
            <div style={{ ...pill, color: "#d4af37", border: "1px solid #8b6914" }}>● {shortAddr(wallet.address)}</div>
          ) : (
            <button onClick={handleConnect} style={btn}>Connect Wallet</button>
          )}
        </div>

        {charter && <div style={{ background: "#16203a", border: "1px solid #2a3a5a", borderLeft: "3px solid #d4af37", padding: 14, borderRadius: 6, marginTop: 18, fontSize: 13, color: "#b0b6c4", fontStyle: "italic" }}><b style={{ color: "#d4af37", fontStyle: "normal" }}>⚖ DAO Charter:</b> {charter}</div>}

        {tx && <div style={statusBar}>{tx}</div>}

        <div style={{ display: "flex", gap: 8, margin: "20px 0" }}>
          <button onClick={() => { setTab("browse"); setSelected(null); }} style={tabBtn(tab === "browse")}>Docket</button>
          <button onClick={() => { setTab("file"); setSelected(null); }} style={tabBtn(tab === "file")}>File a Case</button>
        </div>

        {tab === "file" && (
          <form onSubmit={e => { e.preventDefault(); send("file_case", [form.title, form.complaint, form.evidence, form.defendant], BigInt(form.stake || "0") * BigInt(10 ** 18)); }} style={card}>
            <label style={lbl}>Case Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required style={inp} />
            <label style={lbl}>Defendant Address</label>
            <input placeholder="0x…" value={form.defendant} onChange={e => setForm({ ...form, defendant: e.target.value })} required style={inp} />
            <label style={lbl}>Complaint — which rule was violated?</label>
            <textarea value={form.complaint} onChange={e => setForm({ ...form, complaint: e.target.value })} required rows={3} style={inp} />
            <label style={lbl}>Evidence</label>
            <textarea value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })} required rows={3} style={inp} />
            <label style={lbl}>Filing Fee (GEN)</label>
            <input type="number" min="1" value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} required style={inp} />
            <button type="submit" disabled={loading} style={{ ...btn, marginTop: 14, width: "100%" }}>File Case</button>
          </form>
        )}

        {tab === "browse" && !selected && (
          <div style={{ display: "grid", gap: 12 }}>
            {cases.length === 0 && <p style={{ color: "#5a6276", fontStyle: "italic" }}>The docket is empty.</p>}
            {cases.map(c => (
              <div key={c.id} onClick={() => setSelected(c)} style={{ ...card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "Georgia,serif", fontSize: 17 }}>Case №{c.id} — {c.title}</div>
                  <div style={{ color: "#8a90a0", fontSize: 12, marginTop: 4 }}>{shortAddr(c.plaintiff)} v. {shortAddr(c.defendant)}</div>
                </div>
                <span style={{ ...pill, color: SCOLOR[c.status], border: `1px solid ${SCOLOR[c.status]}` }}>{STATUS[c.status]}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "browse" && selected && (
          <div style={card}>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#d4af37", cursor: "pointer", fontStyle: "italic" }}>← back to docket</button>
            <h2 style={{ fontFamily: "Georgia,serif", marginTop: 10 }}>Case №{selected.id} — {selected.title}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <div style={{ background: "#16203a", padding: 14, borderRadius: 6, borderTop: "2px solid #b45309" }}>
                <strong style={{ color: "#f59e0b" }}>⚑ PLAINTIFF</strong>
                <p style={{ fontSize: 12, color: "#8a90a0" }}>{shortAddr(selected.plaintiff)}</p>
                <p style={{ fontSize: 13 }}><b>Complaint:</b> {selected.complaint}</p>
                <p style={{ fontSize: 13 }}><b>Evidence:</b> {selected.evidence}</p>
              </div>
              <div style={{ background: "#16203a", padding: 14, borderRadius: 6, borderTop: "2px solid #1d4ed8" }}>
                <strong style={{ color: "#60a5fa" }}>⚖ DEFENDANT</strong>
                <p style={{ fontSize: 12, color: "#8a90a0" }}>{shortAddr(selected.defendant)}</p>
                {selected.defense ? <><p style={{ fontSize: 13 }}><b>Defense:</b> {selected.defense}</p><p style={{ fontSize: 13 }}><b>Evidence:</b> {selected.defense_evidence}</p></> : <p style={{ color: "#5a6276", fontStyle: "italic", fontSize: 13 }}>No defense filed yet</p>}
              </div>
            </div>

            {selected.ruling && (() => { const r = JSON.parse(selected.ruling); return (
              <div style={{ marginTop: 14, background: "#1a1530", border: "1px solid #6d28d9", padding: 16, borderRadius: 6 }}>
                <strong style={{ color: "#a78bfa" }}>📜 RULING</strong>
                <p style={{ marginTop: 8 }}>Verdict for: <b style={{ color: "#d4af37" }}>{r.verdict === "plaintiff" ? "Plaintiff" : "Defendant"}</b> · Violation: {r.violation_found ? "Yes" : "No"}</p>
                <p style={{ fontStyle: "italic" }}>{r.reasoning}</p>
                <p style={{ fontSize: 13, color: "#8a90a0" }}>Remedy: {r.remedy}</p>
              </div>
            ); })()}

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {selected.status === 0 && (
                <>
                  <textarea placeholder="Your defense…" value={defense.text} onChange={e => setDefense({ ...defense, text: e.target.value })} rows={3} style={inp} />
                  <textarea placeholder="Your evidence…" value={defense.evidence} onChange={e => setDefense({ ...defense, evidence: e.target.value })} rows={2} style={inp} />
                  <button onClick={() => send("submit_defense", [selected.id, defense.text, defense.evidence])} disabled={loading || !defense.text} style={btn}>Submit Defense</button>
                </>
              )}
              {selected.status === 1 && <button onClick={() => send("judge_case", [selected.id])} disabled={loading} style={{ ...btn, background: "#6d28d9", color: "#fff", border: "none" }}>⚖ Request AI Ruling</button>}
            </div>
          </div>
        )}

        <footer style={{ marginTop: 50, textAlign: "center", color: "#4a5168", fontStyle: "italic", fontSize: 12 }}>Adjudicated by GenLayer AI consensus · {shortAddr(CONTRACT_ADDRESS)}</footer>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#16203a", border: "1px solid #2a3a5a", borderRadius: 8, padding: 20 };
const inp: React.CSSProperties = { padding: 11, borderRadius: 6, border: "1px solid #2a3a5a", background: "#0f1729", color: "#e2e1d8", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 4, fontFamily: "Georgia,serif" };
const lbl: React.CSSProperties = { fontSize: 12, color: "#8a90a0", marginTop: 12, display: "block", fontStyle: "italic" };
const btn: React.CSSProperties = { padding: "11px 22px", borderRadius: 6, border: "1px solid #d4af37", background: "transparent", color: "#d4af37", fontSize: 14, cursor: "pointer", fontFamily: "Georgia,serif", letterSpacing: 0.5 };
const pill: React.CSSProperties = { padding: "3px 12px", borderRadius: 4, fontSize: 11, fontWeight: 600 };
const statusBar: React.CSSProperties = { background: "#16203a", border: "1px solid #8b6914", padding: 12, borderRadius: 6, fontSize: 13, color: "#d4af37", marginTop: 16 };
const tabBtn = (a: boolean): React.CSSProperties => ({ padding: "9px 20px", background: a ? "#d4af37" : "transparent", border: "1px solid " + (a ? "#d4af37" : "#2a3a5a"), borderRadius: 6, color: a ? "#0f1729" : "#8a90a0", cursor: "pointer", fontFamily: "Georgia,serif", fontWeight: 600 });
