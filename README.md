# ⚖️ JuryPool

**A decentralized court for DAO disputes verdicts in minutes, not endless threads.**

🔗 **Live app:** https://jurypool.pages.dev
📜 **Contract (GenLayer Studionet):** `0x6e638a22453e43a93915BA9619801E61860296Da`

---

## The Problem

When a DAO member breaks the rules, resolution today means endless governance threads, biased moderators, or a multisig making a judgment call. There's no neutral, fast, rules-based way to settle disputes.

JuryPool is a decentralized court: a member files a case, the accused responds, and GenLayer's AI validators weigh the DAO's charter and both sides' evidence to deliver a binding, on-chain verdict.

---

## How It Works

1. **Connect your wallet** (MetaMask, Rabby, or any EVM wallet)
2. **File a case** title, complaint (which charter rule was broken), evidence, the defendant's address, and a filing fee.
3. **Defendant responds** with a defense and their own evidence.
4. **Request the AI ruling** validators read the charter + both sides and deliver a verdict (who wins, whether a violation occurred, reasoning, and a recommended remedy). The filing fee goes to the winning party.

The DAO's governing **charter** is stored on-chain and shown at the top of the court.

---

## Why GenLayer?

Interpreting a natural-language charter against submitted evidence is a judgment task no deterministic contract can do. GenLayer validators each evaluate the case independently and must agree on the **verdict** and whether a **violation** occurred before it's finalized — making the ruling neutral and tamper-resistant.

> Note: JuryPool resolves disputes by agreed AI adjudication; it is not a court of law and rulings are not automatically legally binding.

---

## Wallet & Network

Standard EVM wallet, normal signing popup **no GenLayer Snap**. On connect it adds/switches to the **GenLayer Studio Network** (chain `61999`, RPC `https://studio.genlayer.com/api`).

---

## Contract API

| Method | Type | Description |
|--------|------|-------------|
| `file_case(title, complaint, evidence, defendant)` | payable | File a dispute with a filing fee |
| `submit_defense(case_id, defense, evidence)` | write | Defendant responds |
| `judge_case(case_id)` | write (AI) | AI delivers the verdict per charter |
| `update_charter(new_charter)` | write | Update the governing rules |
| `get_case(case_id)` | view | Full case + ruling |
| `get_case_count()` | view | Total cases |
| `get_charter()` | view | Current DAO charter |

**Consensus rule:** `verdict` and `violation_found` must match exactly across validators.

---

## Project Structure

```
jury-pool-genlayer/
├── contracts/
│   └── jury_pool.py         # GenLayer Intelligent Contract (Python)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx     # Legal case-file UI
│   │   └── lib/
│   │       └── genlayer.ts  # Wallet connect (no Snap) + read client
│   ├── next.config.js
│   └── package.json
└── README.md
```

---

## Run Locally

```bash
npm install -g genlayer
genlayer network set studionet
genlayer account create --name deployer --password "yourpass"
genlayer account unlock --password "yourpass"

# charter is a constructor argument
genlayer deploy --contract contracts/jury_pool.py --args "1. Act in good faith. 2. No spam proposals. 3. Funds used for stated purposes. 4. Equal voting rights. 5. Disclose conflicts of interest."

cd frontend
npm install
npm run dev
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contract | Python — GenLayer Intelligent Contract |
| AI consensus | `gl.vm.run_nondet_unsafe` + partial field matching |
| Frontend | Next.js (static export) + TypeScript |
| SDK | genlayer-js |
| Hosting | Cloudflare Pages |

---

## License

MIT
