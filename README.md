# ⚖️ JuryPool

Decentralized DAO court on GenLayer. Members file disputes against each other, present evidence, and AI validators rule based on the DAO's charter.

## How it works

1. DAO sets its charter (rules/constitution)
2. Plaintiff files a case with complaint + evidence + filing fee
3. Defendant submits their defense + evidence
4. AI validators read the charter, analyze both sides, and deliver a verdict
5. Filing fee goes to the winning party

## Setup

```bash
genlayer network set studionet
genlayer account unlock --password "YOUR_PASSWORD"
genlayer deploy --contract contracts/jury_pool.py --args "Your DAO charter rules here..."

cd frontend && npm install
# Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local
npm run dev
```

## Contract Methods

| Method | Description |
|--------|-------------|
| `file_case(title, complaint, evidence, defendant)` | File dispute with stake |
| `submit_defense(case_id, defense, evidence)` | Defendant responds |
| `judge_case(case_id)` | AI rules based on charter |
| `update_charter(new_charter)` | Update DAO rules |
| `get_charter()` | View current rules |
