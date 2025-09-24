### Issue title
Polygon FxPortal Root dispatcher uses raw address(this).call(_data) without selector allowlist

### Severity
Low

**Description**  
On the Polygon FxPortal (Root/L1) side, incoming child messages are dispatched with a raw self-call:
```solidity
function _processMessageFromChild(bytes memory _data) internal override {
  // solhint-disable-next-line avoid-low-level-calls
  (bool success, ) = address(this).call(_data);
  require(success, "Failed to call contract");
}
```
Because `onlyBridge` handlers check `msg.sender == address(this)`, any public/external function protected only by `onlyBridge` is potentially reachable through arbitrary child-provided `_data`. Current handlers are state-gated and safe, but the lack of a selector allowlist introduces a “future reachability” risk: newly added `onlyBridge` functions could become unintentionally reachable through FxPortal dispatch.

- Affected:
  - `contracts/src/0.8/RealitioForeignProxyPolygon.sol` (Root)
  - `contracts/src/0.8/RealitioHomeProxyPolygon.sol` (Child uses similar `_processMessageFromRoot`)
- Effect: Increased attack surface for future changes; depends on careful selector usage and state checks rather than an explicit allowlist.

**Attack Scenario**  
1. A legitimate child tunnel (or compromised environment) sends calldata targeting a different `onlyBridge` function than the typical flow.
2. Root forwards the calldata via `address(this).call(_data)`; if state conditions allow, that function executes.
3. While current code paths are gated, any future `onlyBridge` function could become unintentionally reachable by arbitrary child‑provided `_data`.

**Attachments**

1. **Proof of Concept (PoC) File**  
`submission/poc/006-polygon-dispatch.test.js`  
Skeleton illustrates encoding an arbitrary selector for dispatch and explains why an allowlist is safer.

2. **Revised Code File (Optional)**  
Add a selector allowlist before performing the self-call:
```solidity
// Pseudocode inside _processMessageFromChild/_processMessageFromRoot
bytes4 sel;
assembly { sel := mload(add(_data, 0x20)) } // first 4 bytes

require(
  sel == IHomeArbitrationProxy.receiveArbitrationRequest.selector ||
  sel == IHomeArbitrationProxy.receiveArbitrationAcknowledgement.selector ||
  sel == IHomeArbitrationProxy.receiveArbitrationCancelation.selector ||
  sel == IHomeArbitrationProxy.receiveArbitrationFailure.selector ||
  sel == IHomeArbitrationProxy.receiveArbitrationAnswer.selector,
  "Selector not allowed"
);

(bool success, ) = address(this).call(_data);
require(success, "Failed to call contract");
```
