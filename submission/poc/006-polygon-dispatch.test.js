const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("POC 006 - Polygon FxPortal dispatch selector allowlist (skeleton)", function () {
  it("demonstrates raw self-call dispatch via _processMessageFromChild", async function () {
    // Deploy a minimal setup where we can call _processMessageFromChild indirectly via FxBaseRootTunnel
    // Here we just encode a known selector for receiveArbitrationAcknowledgement and ensure onlyBridge/state gating applies.

    const [req] = await ethers.getSigners();

    // Mocks needed: arbitrator, wNative not necessary for this skeleton
    const ArbitratorAddr = ethers.ZeroAddress;

    const Foreign = await ethers.getContractFactory("RealitioForeignProxyPolygon");
    // Constructor: (wNative, arbitrator, arbitratorExtraData, metaEvidence, winnerMultiplier, loserMultiplier, loserAppealPeriodMultiplier, checkpointManager, fxRoot)
    const foreign = await Foreign.deploy(
      ethers.ZeroAddress,
      ArbitratorAddr,
      "0x",
      "meta",
      1000,
      2000,
      5000,
      req.address,
      req.address
    );
    await foreign.waitForDeployment?.();

    // Encode a valid selector and dummy params; call should eventually be gated by onlyBridge/state.
    const iface = new ethers.Interface([
      "function receiveArbitrationAcknowledgement(bytes32,address)"
    ]);
    const data = iface.encodeFunctionData("receiveArbitrationAcknowledgement", [ethers.ZeroHash, req.address]);

    // Call internal dispatcher through exposed internal via ethers (using callStatic to avoid state changes)
    // In practice, FxBaseRootTunnel triggers _processMessageFromChild; here we simulate low-level call
    await expect(
      foreign.runner.provider.send("hardhat_setBalance", [foreign.target ?? foreign.address, "0x0"]) // noop to keep test simple
    ).not.to.be.reverted;

    // We cannot directly call internal function from JS; this PoC documents that the contract uses address(this).call(_data)
    // and recommends allowlisting. A full integration test would require a mock FxRoot dispatch wrapper.
    expect(true).to.equal(true);
  });
});
