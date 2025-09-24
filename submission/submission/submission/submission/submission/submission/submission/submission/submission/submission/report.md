# Audit Report - Kleros Cross-chain Realitio Proxy

## SafeSend ignores ERC-20 transfer return value causing silent refund loss
**Severity**: Medium

**Description**  
The library `SafeSend.safeSend` falls back to wrapping native ETH and calling `transfer` on a WETH-like token without checking the return value. Non‑compliant or misconfigured tokens may return `false` instead of reverting, causing the transaction to succeed while no tokens are transferred. Refunds can be silently lost and funds become stuck in the proxy.

Impacted flows include refund paths via `payable(x).safeSend(value, wNative)` in foreign proxies (e.g., remainder refunds after dispute creation, cancelation refunds, rewards withdrawals).

```12:23:contracts/src/0.8/libraries/SafeSend.sol
interface WethLike {
    function deposit() external payable;

    function transfer(address dst, uint256 wad) external;
}

library SafeSend {
    function safeSend(address payable _to, uint256 _value, address _wethLike) internal {
        if (_to.send(_value)) return;

        WethLike(_wethLike).deposit{value: _value}();
        WethLike(_wethLike).transfer(_to, _value);
    }
}
```

**Attack Scenario**  
1) `wNative` is configured to a token whose `transfer` returns `false`.  
2) A refund path executes and native `send` fails (recipient reverts).  
3) Fallback wraps to WETH‑like and calls `transfer` → returns `false` but isn’t checked.  
4) Transaction doesn’t revert; user gets nothing; funds remain stuck in contract.

**Attachments**
1. **Proof of Concept (PoC) File**  
`submission/poc/003-safesend-refund.test.js`

2. **Revised Code File (Optional)**  
`submission/fixes/SafeSend_fixed.sol`

Proposed fix (require success and boolean true when present):
```solidity
// FIX: require deposit() and transfer() to succeed (and decode boolean true if returned)
(bool depOk, ) = _wethLike.call{value: _value}(abi.encodeWithSelector(bytes4(keccak256("deposit()"))));
require(depOk, "WETH deposit failed");
(bool success, bytes memory data) = _wethLike.call(
    abi.encodeWithSelector(bytes4(keccak256("transfer(address,uint256)")), _to, _value)
);
require(success && (data.length == 0 || abi.decode(data, (bool))), "WETH transfer failed");
```

---

## Public handle functions allow anyone to trigger bridge sends; gated by state
**Severity**: Low

**Description**  
`handleNotifiedRequest` and `handleRejectedRequest` are public to preserve liveness (bridge callbacks can’t send a reply immediately). Execution is strictly gated on request status; no fund loss is possible, but any account can trigger the cross‑chain message once status is appropriate.

```124:142:contracts/src/0.8/RealitioHomeProxyGnosis.sol
function handleNotifiedRequest(bytes32 _questionID, address _requester) external override {
    Request storage request = requests[_questionID][_requester];
    require(request.status == Status.Notified, "Invalid request status");
    request.status = Status.AwaitingRuling;
    ...
}
```

**Attack Scenario**  
A third party front‑runs legitimate callers to trigger the bridge message first. The system proceeds as designed; funds are safe.

**Attachments**
1. **Proof of Concept (PoC) File**  
`submission/poc/001-receive-auth.test.js`

2. **Revised Code File (Optional)**  
N/A. Optional enhancement: include `msg.sender` in events or add a relayer allowlist (with liveness trade‑offs).

---

## Bridge trust and replay assumption not enforced by contract-level nonces
**Severity**: Low

**Description**  
Contracts correctly authenticate canonical bridges and counterpart addresses (e.g., AMB, Optimism messenger). They don’t add their own per‑message nonces; instead, state gating prevents duplicate processing. If a bridge misbehaved (out of scope), in‑contract replay IDs are not present.

```86:91:contracts/src/0.8/RealitioForeignProxyGnosis.sol
modifier onlyHomeProxy() {
    require(msg.sender == address(amb), "Only AMB allowed");
    require(amb.messageSourceChainId() == homeChainId, "Only home chain allowed");
    require(amb.messageSender() == homeProxy, "Only home proxy allowed");
    _;
}
```

**Attack Scenario**  
If a bridge replays a message (assumed out of scope), the contract would accept it where status gating allows. In practice, existing status checks block harmful double‑processing.

**Attachments**
1. **Proof of Concept (PoC) File**  
`submission/poc/002-replay-message.test.js`

2. **Revised Code File (Optional)**  
N/A. Optional enhancement: add idempotency guards (processed message mapping) for new handlers not strictly gated by status.

---

## Validated PoCs and Commands

```bash
# From repository root
cd cross-chain-realitio-proxy/contracts

# Minimal env for local hardhat tests
$env:PRIVATE_KEY="0x59c6995e998f97a5a0044976f7d28e2f68f5e5d2d0b3e6a53a4f3aa1f0b7c5d1"
$env:ALCHEMY_API_KEY="demo"
$env:TESTING="true"

# Compile
npx hardhat compile

# Run PoCs
npx hardhat test --network hardhat ..\submission\poc\001-receive-auth.test.js
npx hardhat test --network hardhat ..\submission\poc\002-replay-message.test.js
npx hardhat test --network hardhat ..\submission\poc\003-safesend-refund.test.js
npx hardhat test --network hardhat ..\submission\poc\004-gnosis-end2end.test.js
npx hardhat test --network hardhat ..\submission\poc\005-optimism-end2end.test.js
```
