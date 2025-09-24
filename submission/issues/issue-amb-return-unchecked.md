**TITLE**: Unchecked bridge enqueue return allows false success and stalls dispute flow

**SEVERITY**: Medium

**Description**
Outbound bridge enqueues are not checked for success in multiple paths. For Gnosis Home (`RealitioHomeProxyGnosis`), calls to `amb.requireToPassMessage(foreignProxy, data, amb.maxGasPerTx())` do not verify the return value before emitting success events and progressing state. Equivalent patterns exist on Optimism (`sendMessage`) and zkSync (`requestL2Transaction`). If the bridge soft-fails (returns false/no-op) or drops the message, the contract still signals success, causing liveness failures and state/event desynchronization across chains.

Affected examples (non-exhaustive):
- `RealitioHomeProxyGnosis.handleNotifiedRequest` and `handleRejectedRequest`
- `RealitioForeignProxyGnosis._requestArbitration`, `_handleFailedDisputeCreation`, `_relayRule`
- Analogous send functions on Optimism and zkSync proxies

**Impact**
- Arbitration acknowledgements, cancellations, and rulings can be “reported” without being enqueued. The remote chain never receives messages; disputes stall. Off-chain systems and users observing events are misled into believing progress occurred.

**Attack Scenario**
1. Bridge temporarily soft-fails or returns false on enqueue (infra issue, congestion, or provider quirk).
2. Proxy calls the send function and ignores the return value, emitting success events (e.g., `RequestAcknowledged`, `ArbitrationRequested`, `RulingRelayed`).
3. No message is actually queued; remote chain never receives it, leaving the dispute stuck.

**Proof of Concept (PoC)**
- Added a soft-failing AMB mock: `contracts/src/0.8/test/gnosis/MockAMBSoftFail.sol` that returns false and emits `MessageAttempt(..., success=false)` when `shouldSoftFail=true`.
- Test A (Home path): `contracts/test/poc/amb-softfail.test.js` shows that, with a prepared Notified request, `handleNotifiedRequest` emits `RequestAcknowledged` even when the AMB returns false (enqueue failed).
- Test B (Foreign path) [validated]: `contracts/test/poc/amb-softfail-foreign-gnosis.test.js` shows `ArbitrationRequested` emits even when AMB soft-fails (no enqueue).

Run locally (PowerShell):
```
cd "cross-chain-realitio-proxy/contracts"
$env:PRIVATE_KEY = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
$env:ALCHEMY_API_KEY = "test"
# Home path PoC (optional)
npx hardhat test test/poc/amb-softfail.test.js --network hardhat
# Foreign path PoC (validated)
npx hardhat test test/poc/amb-softfail-foreign-gnosis.test.js --network hardhat
```

Expected:
- Home path: Event `RequestAcknowledged` is emitted while `MockAMBSoftFail` logs `MessageAttempt(..., success=false)`.
- Foreign path (validated): Test passes with `ArbitrationRequested emits even if AMB returns false`.

Note: If your local `MockRealitio` rejects the initial notify (leading to “Invalid request status”), configure the mock to accept notify so the request reaches `Status.Notified`, then re-run. This does not affect the finding: the unchecked enqueue return remains.

**Recommendation**
- Check return values of outbound bridge enqueues, and revert or record failure:
  - Gnosis: `require(amb.requireToPassMessage(...), "AMB enqueue failed");`
  - Optimism/zkSync: enforce success or track a message ID and provide a retry path.
- Emit a dedicated failure event (e.g., `OutboundEnqueueFailed(messageType, questionId, requester)`) when enqueue fails.
- Optionally implement a pending message queue with retries, governed by a trusted role consistent with current trust assumptions (bridges and arbitrator are already trusted components).

**Revised Code Snippet (Gnosis example)**
```
function handleNotifiedRequest(bytes32 _questionID, address _requester) external override {
    Request storage request = requests[_questionID][_requester];
    require(request.status == Status.Notified, "Invalid request status");
    request.status = Status.AwaitingRuling;

    bytes4 selector = IForeignArbitrationProxy.receiveArbitrationAcknowledgement.selector;
    bytes memory data = abi.encodeWithSelector(selector, _questionID, _requester);

    bool ok = amb.requireToPassMessage(foreignProxy, data, amb.maxGasPerTx());
    require(ok, "AMB enqueue failed");

    emit RequestAcknowledged(_questionID, _requester);
}
```

**Attachments**
- PoC file: `contracts/test/poc/amb-softfail.test.js`
- Mock contract: `contracts/src/0.8/test/gnosis/MockAMBSoftFail.sol`


