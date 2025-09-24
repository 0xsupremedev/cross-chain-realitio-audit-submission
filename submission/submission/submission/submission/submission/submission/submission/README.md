# Submission - Kleros Cross-chain Realitio Proxy Audit

## Overview
This submission contains vulnerabilities found in the proxy contracts, with proofs of concept and optional fixes.

### Files
- `report.md` → Main report with issues and recommendations.
- `poc/` → Proof of Concept (PoC) tests.
- `fixes/` → Optional fixed contracts with comments.

### How to run PoCs (Hardhat)
```bash
cd cross-chain-realitio-proxy
yarn install
npx hardhat compile
npx hardhat test submission/poc --network hardhat
```

### How to run PoCs (Foundry)
```bash
forge test --match-path submission/poc/*.t.sol
```

### Notes
- Issues are classified per contest rules (High / Medium / Low).
- Fixes are suggested but not mandatory for submission.
