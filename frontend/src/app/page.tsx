"use client";
import { useState, useEffect } from "react";
import { client, CONTRACT_ADDRESS } from "@/lib/genlayer";

type Case = {
  id: string; plaintiff: string; defendant: string; title: string;
  complaint: string; evidence: string; defense: string; defense_evidence: string;
  stake: string; status: number; ruling: string; created_at: number;
};

const STATUS = ["Filed", "Awaiting Judgment", "Ruled"];
const COLORS = ["#ff9800", "#2196f3", "#9c27b0"];

export default function Home() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"browse" | "file">("browse");
  const [selected, setSelected] = useState<Case | null>(null);
  const [form, setForm] = useState({ title: "", complaint: "", evidence: "", defendant: "", stake: "" });
  const [defense, setDefense] = useState({ text: "", evidence: "" });
  const [tx, setTx] = useState("");

  useEffect(() => { if (CONTRACT_ADDRESS) load(); }, []);

  async function load() {
    try {
      const count = Number(await client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: "get_case_count", args: [] }));
      const loaded: Case[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: "get_case", args: [String(i)] });
        loaded.push(JSON.parse(raw as string));
      }
      setCases(loaded);
    } catch (e) { console.error(e); }
  }

  async function send(fn: string, args: any[], value?: bigint) {
    setLoading(true); setTx(`${fn}...`);
    try {
      const hash = await client.writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: fn, args, ...(value ? { value } : {}) });
      await client.waitForTransactionReceipt({ hash });
      setTx("✓ Done!"); await load(); setSelected(null);
    } catch (e: any) { setTx(`Error: ${e.message}`); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ textAlign: "center" }}>⚖️ JuryPool</h1>
      <p style={{ textAlign: "center", color: "#888" }}>Decentralized DAO court — AI validators rule on disputes</p>

      {tx && <div style={{ background: "#1a1a2e", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{tx}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button onClick={() => { setTab("browse"); setSelected(null); }} style={tabBtn(tab === "browse")}>Cases</button>
        <button onClick={() => { setTab("file"); setSelected(null); }} style={tabBtn(tab === "file")}>File Case</button>
      </div>

      {tab === "file" && (
        <form onSubmit={e => { e.preventDefault(); send("file_case", [form.title, form.complaint, form.evidence, form.defendant], BigInt(form.stake) * BigInt(10**18)); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="Case title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required style={inp} />
          <input placeholder="Defendant address (0x...)" value={form.defendant} onChange={e => setForm({...form, defendant: e.target.value})} required style={inp} />
          <textarea placeholder="Your complaint — what rule was violated?" value={form.complaint} onChange={e => setForm({...form, complaint: e.target.value})} required rows={3} style={inp} />
          <textarea placeholder="Evidence supporting your claim" value={form.evidence} onChange={e => setForm({...form, evidence: e.target.value})} required rows={3} style={inp} />
          <input placeholder="Filing fee stake (GEN)" type="number" min="1" value={form.stake} onChange={e => setForm({...form, stake: e.target.value})} required style={inp} />
          <button type="submit" disabled={loading} style={btn}>File Case</button>
        </form>
      )}

      {tab === "browse" && !selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {cases.length === 0 && <p style={{ color: "#888" }}>No cases filed yet.</p>}
          {cases.map(c => (
            <div key={c.id} onClick={() => setSelected(c)} style={{ background: "#1a1a2e", padding: 16, borderRadius: 8, cursor: "pointer", border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>#{c.id} — {c.title}</h3>
                <span style={{ background: COLORS[c.status], padding: "4px 10px", borderRadius: 12, fontSize: 12 }}>{STATUS[c.status]}</span>
              </div>
              <p style={{ color: "#aaa", margin: "8px 0 0", fontSize: 14 }}>Plaintiff: {c.plaintiff.slice(0,10)}... vs Defendant: {c.defendant.slice(0,10)}...</p>
            </div>
          ))}
        </div>
      )}

      {tab === "browse" && selected && (
        <div style={{ background: "#1a1a2e", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#6c5ce7", cursor: "pointer" }}>← Back</button>
          <h2>#{selected.id} — {selected.title}</h2>
          <span style={{ background: COLORS[selected.status], padding: "4px 10px", borderRadius: 12, fontSize: 12 }}>{STATUS[selected.status]}</span>

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "#12122a", padding: 12, borderRadius: 8 }}>
              <strong>🟡 Plaintiff</strong><br /><small>{selected.plaintiff.slice(0,14)}...</small>
              <p><strong>Complaint:</strong> {selected.complaint}</p>
              <p><strong>Evidence:</strong> {selected.evidence}</p>
            </div>
            <div style={{ background: "#12122a", padding: 12, borderRadius: 8 }}>
              <strong>🔵 Defendant</strong><br /><small>{selected.defendant.slice(0,14)}...</small>
              {selected.defense ? (
                <><p><strong>Defense:</strong> {selected.defense}</p><p><strong>Evidence:</strong> {selected.defense_evidence}</p></>
              ) : <p style={{ color: "#888" }}>No defense submitted yet</p>}
            </div>
          </div>

          {selected.ruling && (
            <div style={{ marginTop: 16, background: "#1a2a1a", padding: 12, borderRadius: 8 }}>
              <strong>📜 Ruling:</strong><br />
              {(() => { const r = JSON.parse(selected.ruling); return <><p>Verdict: <strong>{r.verdict === "plaintiff" ? "Plaintiff wins" : "Defendant wins"}</strong></p><p>Violation: {r.violation_found ? "Yes" : "No"}</p><p>Reasoning: {r.reasoning}</p><p>Remedy: {r.remedy}</p></>; })()}
            </div>
          )}

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {selected.status === 0 && (
              <>
                <textarea placeholder="Your defense..." value={defense.text} onChange={e => setDefense({...defense, text: e.target.value})} rows={3} style={inp} />
                <textarea placeholder="Your evidence..." value={defense.evidence} onChange={e => setDefense({...defense, evidence: e.target.value})} rows={2} style={inp} />
                <button onClick={() => send("submit_defense", [selected.id, defense.text, defense.evidence])} disabled={loading || !defense.text} style={btn}>Submit Defense</button>
              </>
            )}
            {selected.status === 1 && (
              <button onClick={() => send("judge_case", [selected.id])} disabled={loading} style={{ ...btn, background: "#9c27b0" }}>⚖️ Request AI Ruling</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { padding: 12, borderRadius: 8, border: "1px solid #333", background: "#1a1a2e", color: "#e0e0e0", fontSize: 14 };
const btn: React.CSSProperties = { padding: "12px 20px", borderRadius: 8, border: "none", background: "#6c5ce7", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: "bold" };
const tabBtn = (a: boolean): React.CSSProperties => ({ padding: "10px 20px", background: a ? "#6c5ce7" : "#2d2d2d", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" });
