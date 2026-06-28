"use client";
import { useState, useEffect, useCallback } from "react";
import { CONTRACT_ADDRESS, connectWallet, readClient, shortAddr, type WalletState } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

type Case = { id: string; plaintiff: string; defendant: string; title: string; complaint: string; evidence: string; defense: string; defense_evidence: string; stake: string; status: number; ruling: string; };
const STATUS = ["FILED", "AWAITING JUDGMENT", "RULED"];

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [cases, setCases] = useState<Case[]>([]);
  const [charter, setCharter] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Case | null>(null);
  const [showFile, setShowFile] = useState(false);
  const [form, setForm] = useState({ title: "", complaint: "", evidence: "", defendant: "", stake: "" });
  const [defense, setDefense] = useState({ text: "", evidence: "" });
  const [tx, setTx] = useState("");

  const load = useCallback(async () => {
    try {
      const rc = readClient();
      try { setCharter(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_charter", args: [] }) as string); } catch {}
      const count = Number(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_case_count", args: [] }));
      const out: Case[] = [];
      for (let i = 1; i <= count; i++) { const raw = await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_case", args: [String(i)] }); out.push(JSON.parse(raw as string)); }
      setCases(out.reverse());
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleConnect() { setTx("Connecting…"); try { const w = await connectWallet(); setWallet(w); setTx(""); } catch (e: any) { setTx(e.message); } }
  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { setTx("Connect wallet first"); return; }
    setLoading(true); setTx("Filing with the court…");
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      const _rcpt: any = await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 30, interval: 5000 });
      const _st = String((_rcpt && (_rcpt.statusName ?? _rcpt.status)) || "").toUpperCase();
      if (_st && _st !== "ACCEPTED" && _st !== "FINALIZED") throw new Error(/UNDETERMINED|TIMEOUT|NO_MAJORITY|DISAGREE/.test(_st) ? "AI validators could not reach consensus — no funds were moved. Please try again." : ("Transaction did not complete (" + _st + ")."));
      setTx(""); await load(); setSelected(null); setShowFile(false);
    } catch (e: any) { setTx(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#e8e4d9", color: "#1a1a1a", fontFamily: "'Courier New', Courier, monospace" }}>
      {/* Letterhead */}
      <div style={{ background: "#1a2332", color: "#e8e4d9", padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px double #c9a84a" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, fontFamily: "Georgia, serif" }}>⚖  JURYPOOL</div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#c9a84a" }}>DECENTRALIZED COURT OF AI ADJUDICATION</div>
        </div>
        {/* Credential badge connect */}
        {wallet.address ? (
          <div style={{ border: "2px solid #c9a84a", padding: "6px 12px", textAlign: "center", fontSize: 11 }}>
            <div style={{ color: "#c9a84a", letterSpacing: 1 }}>★ ADMITTED ★</div>
            <div>{shortAddr(wallet.address)}</div>
          </div>
        ) : (
          <button onClick={handleConnect} style={{ border: "2px solid #c9a84a", background: "transparent", color: "#c9a84a", padding: "8px 16px", cursor: "pointer", fontFamily: "Georgia, serif", letterSpacing: 2, fontSize: 12 }}>⊕ ENTER THE BAR</button>
        )}
      </div>

      {/* Charter as a statute notice */}
      {charter && (
        <div style={{ maxWidth: 820, margin: "20px auto 0", padding: "0 24px" }}>
          <div style={{ background: "#fffef8", border: "1px solid #b0a589", borderLeft: "4px solid #1a2332", padding: "14px 18px", fontSize: 13 }}>
            <div style={{ fontWeight: 700, letterSpacing: 1, fontSize: 11, color: "#6a6250", marginBottom: 6 }}>§ GOVERNING CHARTER</div>
            <div style={{ lineHeight: 1.7 }}>{charter}</div>
          </div>
        </div>
      )}

      {tx && <p style={{ textAlign: "center", color: "#7a3b2e" }}>{tx}</p>}

      {!selected && (
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px" }}>
          <div style={{ background: "#fffef8", border: "1px solid #b0a589", borderLeft: "4px solid #c9a84a", padding: "16px 20px", marginBottom: 18 }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 18, marginBottom: 6 }}>About this Court</div>
            <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0, color: "#3a3526" }}>JuryPool is a decentralized court for DAO disputes. A member files a case against another for breaking the DAO charter; the defendant answers; then GenLayer's AI validators weigh the charter and both sides' evidence and deliver a binding verdict on-chain.</p>
            <table style={{ width: "100%", marginTop: 12, fontSize: 13, borderCollapse: "collapse" }}>
              <tbody>
                {[["I.", "Enter the bar — connect your wallet."], ["II.", "File a case: title, complaint, evidence, defendant address + filing fee."], ["III.", "The defendant submits a defense with their own evidence."], ["IV.", "Request the AI ruling — verdict & remedy are recorded on-chain."]].map(([n, t], i) => (
                  <tr key={i} style={{ borderTop: "1px dotted #c9bfa3" }}>
                    <td style={{ padding: "6px 10px 6px 0", fontWeight: 700, color: "#7a3b2e", verticalAlign: "top", width: 30 }}>{n}</td>
                    <td style={{ padding: "6px 0", color: "#3a3526" }}>{t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1a2332", paddingBottom: 10, marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontFamily: "Georgia, serif", letterSpacing: 1 }}>COURT DOCKET</h2>
            <button onClick={() => setShowFile(true)} style={fileBtn}>+ FILE NEW CASE</button>
          </div>

          {cases.length === 0 && <p style={{ textAlign: "center", color: "#8a8270" }}>— no cases on the docket —</p>}
          {/* Case files as manila folders */}
          {cases.map(c => (
            <div key={c.id} onClick={() => setSelected(c)} style={{ background: "#fffef8", border: "1px solid #b0a589", marginBottom: 12, cursor: "pointer", position: "relative" }}>
              <div style={{ display: "inline-block", background: "#d4c9a8", padding: "3px 14px", fontSize: 11, fontWeight: 700, letterSpacing: 1, borderBottom: "1px solid #b0a589", borderRight: "1px solid #b0a589" }}>CASE №{String(c.id).padStart(4, "0")}</div>
              <div style={{ padding: "10px 18px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 18 }}>{c.title}</span>
                  <span style={{ fontSize: 10, border: "1px solid #1a2332", padding: "3px 8px", letterSpacing: 1, transform: "rotate(-3deg)", color: c.status === 2 ? "#1a7d4f" : "#7a3b2e", borderColor: c.status === 2 ? "#1a7d4f" : "#7a3b2e" }}>{STATUS[c.status]}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6a6250", marginTop: 6 }}>{shortAddr(c.plaintiff)} <span style={{ fontStyle: "italic" }}>v.</span> {shortAddr(c.defendant)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Case detail as a legal document */}
      {selected && (() => {
        const r = selected.ruling ? JSON.parse(selected.ruling) : null;
        return (
          <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px" }}>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#1a2332", cursor: "pointer", fontFamily: "inherit", marginBottom: 12 }}>‹ RETURN TO DOCKET</button>
            <div style={{ background: "#fffef8", border: "1px solid #b0a589", padding: "34px 40px", boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }}>
              <div style={{ textAlign: "center", borderBottom: "2px solid #1a2332", paddingBottom: 14, marginBottom: 18 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: "#6a6250" }}>IN THE DECENTRALIZED COURT OF GENLAYER</div>
                <h2 style={{ fontFamily: "Georgia, serif", margin: "8px 0", fontSize: 22 }}>{selected.title}</h2>
                <div style={{ fontSize: 12 }}>Case №{String(selected.id).padStart(4, "0")} · {STATUS[selected.status]}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 1, color: "#7a3b2e" }}>▸ PLAINTIFF ({shortAddr(selected.plaintiff)})</div>
                <p style={{ margin: "6px 0", fontSize: 14, lineHeight: 1.7 }}><b>Complaint:</b> {selected.complaint}</p>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}><b>Evidence:</b> {selected.evidence}</p>
              </div>
              <div style={{ marginBottom: 16, borderTop: "1px dashed #b0a589", paddingTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 1, color: "#1d4ed8" }}>▸ DEFENDANT ({shortAddr(selected.defendant)})</div>
                {selected.defense ? <><p style={{ margin: "6px 0", fontSize: 14, lineHeight: 1.7 }}><b>Defense:</b> {selected.defense}</p><p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}><b>Evidence:</b> {selected.defense_evidence}</p></> : <p style={{ fontStyle: "italic", color: "#8a8270" }}>— no defense entered —</p>}
              </div>
              {r && (
                <div style={{ marginTop: 18, border: "2px solid #1a2332", padding: 18, position: "relative" }}>
                  <div style={{ position: "absolute", top: -12, right: 20, background: "#7a3b2e", color: "#fffef8", padding: "4px 12px", fontSize: 11, letterSpacing: 2, transform: "rotate(3deg)" }}>⚖ RULED</div>
                  <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>JUDGMENT FOR: {r.verdict === "plaintiff" ? "PLAINTIFF" : "DEFENDANT"} · VIOLATION: {r.violation_found ? "YES" : "NO"}</div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, fontStyle: "italic" }}>{r.reasoning}</p>
                  <div style={{ fontSize: 13 }}>Remedy ordered: {r.remedy}</div>
                </div>
              )}
              <div style={{ marginTop: 20 }}>
                {selected.status === 0 && (<>
                  <textarea placeholder="Enter your defense…" value={defense.text} onChange={e => setDefense({ ...defense, text: e.target.value })} rows={3} style={inp} />
                  <textarea placeholder="Supporting evidence…" value={defense.evidence} onChange={e => setDefense({ ...defense, evidence: e.target.value })} rows={2} style={inp} />
                  <button onClick={() => send("submit_defense", [selected.id, defense.text, defense.evidence])} disabled={loading || !defense.text} style={fileBtn}>FILE DEFENSE</button>
                </>)}
                {selected.status === 1 && <button onClick={() => send("judge_case", [selected.id])} disabled={loading} style={{ ...fileBtn, background: "#7a3b2e" }}>⚖ REQUEST AI RULING</button>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* file modal */}
      {showFile && (
        <div onClick={() => setShowFile(false)} style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,0.6)", display: "grid", placeItems: "center", padding: 20 }}>
          <form onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); send("file_case", [form.title, form.complaint, form.evidence, form.defendant], BigInt(form.stake || "0") * BigInt(10 ** 18)); }} style={{ background: "#fffef8", border: "1px solid #b0a589", padding: 30, maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <h2 style={{ fontFamily: "Georgia, serif", marginTop: 0, textAlign: "center" }}>File a New Case</h2>
            <input placeholder="Case title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required style={inp} />
            <input placeholder="Defendant address (0x…)" value={form.defendant} onChange={e => setForm({ ...form, defendant: e.target.value })} required style={inp} />
            <textarea placeholder="Complaint — which charter rule was violated?" value={form.complaint} onChange={e => setForm({ ...form, complaint: e.target.value })} required rows={3} style={inp} />
            <textarea placeholder="Evidence" value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })} required rows={3} style={inp} />
            <input placeholder="Filing fee (GEN)" type="number" min="1" value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} required style={inp} />
            <button disabled={loading} style={fileBtn}>SUBMIT FILING</button>
          </form>
        </div>
      )}
      <style>{`body{margin:0}`}</style>
    </div>
  );
}

const inp: React.CSSProperties = { padding: 11, border: "1px solid #b0a589", background: "#faf8f0", color: "#1a1a1a", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 10, fontFamily: "'Courier New', monospace" };
const fileBtn: React.CSSProperties = { padding: "10px 18px", background: "#1a2332", color: "#e8e4d9", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", letterSpacing: 1, fontSize: 13 };
