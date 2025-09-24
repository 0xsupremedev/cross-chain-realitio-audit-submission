

# Cross-Chain Realitio Audit Submission

This repository contains my submission for the Kleros Cross-Chain Realitio Proxy audit.

## Contents
- submission/
  - report.md: Audit report with issues, PoCs and suggested fixes.
  - poc/: Proof-of-Concept tests (Hardhat) including end-to-end Gnosis/Optimism flows.
  - fixes/: Optional fixed code snippets (e.g., SafeSend fix).
- audit/
  - README_FLOW.md: High-level flow and invariants.
  - TOOLING.md: How to use Slither/Echidna/Solhint/Hardhat.
  - echidna.yaml: Default Echidna config.

## Quickstart
```powershell
# Minimal env for local hardhat tests
$env:PRIVATE_KEY="0x59c6995e998f97a5a0044976f7d28e2f68f5e5d2d0b3e6a53a4f3aa1f0b7c5d1"
$env:ALCHEMY_API_KEY="demo"
$env:TESTING="true"

npx hardhat compile

# Run PoCs (examples)
npx hardhat test --network hardhat ..\submission\poc\001-receive-auth.test.js
npx hardhat test --network hardhat ..\submission\poc\004-gnosis-end2end.test.js
npx hardhat test --network hardhat ..\submission\poc\005-optimism-end2end.test.js
```

## Notes
- All commits authored by 0xsupremedev.
- Issues classified per contest rules (High/Medium/Low).
