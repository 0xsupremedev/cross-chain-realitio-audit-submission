# Cross-Chain Realitio Proxy - Flow and Invariants

Flow (high level)
- L1 Foreign proxy: requestArbitration → bridge to Home.
- L2 Home proxy: notify Realitio, A) acknowledge → back to L1, or B) reject → back to L1.
- L1 Foreign: if acknowledged, create dispute in arbitrator; else refund.
- Arbitrator rules on L1; L1 Foreign relays answer to L2 Home.
- L2 Home: report answer to Realitio and finalize.

Invariants (to verify)
- Only canonical bridge/counterpart can call trusted receive functions.
- One dispute per question: no duplicate dispute creation per questionID.
- Refunds are delivered or revert; no silent fund loss.
- Appeals accounting: no double-withdrawals; rewards only to winners or reimbursements as specified.
- Message replays are either prevented by bridge or blocked by state gating.
- Arbitrator address immutable after deployment (no unauthorized changes).
- Liveness: external handle functions progress state without enabling theft.
