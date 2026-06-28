# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing
from datetime import datetime, timezone


class JuryPool(gl.Contract):
    case_count: i32
    cases: TreeMap[str, str]
    dao_charter: str

    def __init__(self, charter: str):
        self.case_count = i32(0)
        self.dao_charter = charter

    @gl.public.write
    def update_charter(self, new_charter: str) -> None:
        # In production, this would be governance-gated
        self.dao_charter = new_charter

    @gl.public.write.payable
    def file_case(self, title: str, complaint: str, evidence: str, defendant: str) -> i32:
        value = gl.message.value
        if value == u256(0):
            raise gl.vm.UserError("Must stake filing fee")

        self.case_count = i32(int(self.case_count) + 1)
        case_id = str(int(self.case_count))
        now = int(datetime.now(timezone.utc).timestamp())

        case = {
            "id": case_id,
            "plaintiff": str(gl.message.sender_address),
            "defendant": defendant,
            "title": title,
            "complaint": complaint,
            "evidence": evidence,
            "defense": "",
            "defense_evidence": "",
            "stake": str(value),
            "status": 0,  # 0=filed, 1=defense_submitted, 2=judged
            "ruling": "",
            "created_at": now,
        }
        self.cases[case_id] = json.dumps(case)
        return self.case_count

    @gl.public.write
    def submit_defense(self, case_id: str, defense: str, evidence: str) -> None:
        case = json.loads(self.cases[case_id])
        if case["status"] != 0:
            raise gl.vm.UserError("Case not awaiting defense")
        if str(gl.message.sender_address) != case["defendant"]:
            raise gl.vm.UserError("Only defendant can respond")

        case["defense"] = defense
        case["defense_evidence"] = evidence
        case["status"] = 1
        self.cases[case_id] = json.dumps(case)

    @gl.public.write
    def judge_case(self, case_id: str) -> typing.Any:
        case = json.loads(self.cases[case_id])
        if case["status"] != 1:
            raise gl.vm.UserError("Case not ready for judgment")

        charter = self.dao_charter

        def leader_fn():
            prompt = f"""You are a decentralized court judge for a DAO dispute.

DAO CHARTER/RULES:
{charter}

CASE: {case['title']}

PLAINTIFF ({case['plaintiff'][:10]}...):
Complaint: {case['complaint']}
Evidence: {case['evidence']}

DEFENDANT ({case['defendant'][:10]}...):
Defense: {case['defense']}
Evidence: {case['defense_evidence']}

Based on the DAO charter and evidence presented, determine:
1. Did the defendant violate the charter?
2. Is the plaintiff's complaint valid?
3. What is the appropriate ruling?

Return JSON:
{{
    "verdict": "plaintiff" or "defendant",
    "violation_found": true or false,
    "reasoning": "brief explanation referencing specific charter rules",
    "remedy": "recommended action (warning/fine/removal/none)"
}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(raw, dict):
                raw = {}
            verdict = str(raw.get("verdict", "defendant")).strip().lower()
            if verdict not in ("plaintiff", "defendant"):
                verdict = "defendant"
            return {
                "verdict": verdict,
                "violation_found": bool(raw.get("violation_found", False)),
                "reasoning": str(raw.get("reasoning", ""))[:1000],
                "remedy": str(raw.get("remedy", "none")),
            }

        def validator_fn(leader_result) -> bool:
            # Robust consensus: agree on the normalized verdict only.
            if not isinstance(leader_result, gl.vm.Return):
                return False
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(raw, dict):
                raw = {}
            verdict = str(raw.get("verdict", "defendant")).strip().lower()
            if verdict not in ("plaintiff", "defendant"):
                verdict = "defendant"
            try:
                leader_verdict = str(leader_result.calldata["verdict"]).strip().lower()
            except (TypeError, KeyError):
                return False
            return verdict == leader_verdict

        result = gl.vm.run_nondet(leader_fn, validator_fn)

        # Refund filing fee to winner
        stake = u256(int(case["stake"]))
        if result["verdict"] == "plaintiff":
            self._pay(case["plaintiff"], stake)
        else:
            self._pay(case["defendant"], stake)

        case["status"] = 2
        case["ruling"] = json.dumps(result)
        self.cases[case_id] = json.dumps(case)

    @gl.public.view
    def get_case(self, case_id: str) -> str:
        return self.cases[case_id]

    @gl.public.view
    def get_case_count(self) -> i32:
        return self.case_count

    @gl.public.view
    def get_charter(self) -> str:
        return self.dao_charter

    def _pay(self, recipient: str, amount: u256) -> None:
        @gl.evm.contract_interface
        class _Recipient:
            class View:
                pass
            class Write:
                pass
        _Recipient(Address(recipient)).emit_transfer(value=amount)
