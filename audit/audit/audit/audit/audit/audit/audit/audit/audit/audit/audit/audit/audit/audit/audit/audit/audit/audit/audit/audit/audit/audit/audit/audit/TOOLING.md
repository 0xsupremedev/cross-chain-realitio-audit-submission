# Security Tooling - How to Validate Findings

## 1) Install Dependencies
- Python 3.10+
- Node.js (Hardhat already in repo)
- Foundry (optional, for fuzzing)

## 2) Slither (static analysis)
Install:
```bash
pip install slither-analyzer crytic-compile
```
Run (from repo root):
```bash
slither contracts/src/0.8 --exclude-informational --filter-paths test
```
Common useful flags:
- `--detect reentrancy,unchecked-transfer,uninitialized-state` to focus checks
- `--print human-summary` for a concise overview

## 3) Solhint (lint)
Install:
```bash
npm install --save-dev solhint
```
Run:
```bash
npx solhint "contracts/**/*.sol"
```

## 4) Echidna (fuzzing invariants)
Install (one option):
```bash
brew install echidna
# or see https://github.com/crytic/echidna
```
Create a config: `audit/echidna.yaml`
```yaml
testMode: assertion
sender: ["0x10000", "0x20000"]
```
Run:
```bash
echidna-test . --contract RealitioForeignProxyGnosis --config audit/echidna.yaml
```

## 5) Hardhat Tests (PoCs)
Compile and run:
```bash
yarn install
npx hardhat compile
npx hardhat test submission/poc --network hardhat
```

## 6) Foundry (optional)
Install:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```
Run fuzz tests:
```bash
forge test --match-path submission/poc/*.t.sol
```

## Tips to Reduce False Positives
- Always reproduce with a minimal PoC test first.
- Cross-check with at least one tool (Slither/Echidna) plus manual review.
- Respect scope: only `contracts/src/0.8`.
- Document exact commit, command, and output for reviewers.
