const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("POC 001 - receive authentication", function () {
  it("reverts when EOA (non-bridge) calls a bridge-only function", async function () {
    const [attacker] = await ethers.getSigners();

    // Use existing MockRealitio from repo
    const MockRealitio = await ethers.getContractFactory("MockRealitio");
    const realitio = await MockRealitio.deploy();
    await realitio.waitForDeployment?.();

    // Deploy Home proxy (Optimism variant) with placeholder args
    const Proxy = await ethers.getContractFactory("RealitioHomeProxyOptimism");
    const foreignProxy = ethers.ZeroAddress; // placeholder
    const foreignChainId = 11155111; // Sepolia
    const proxy = await Proxy.deploy(realitio.target ?? realitio.address, "meta", foreignProxy, foreignChainId);
    await proxy.waitForDeployment?.();

    // Direct call by EOA should revert (onlyForeignProxy modifier)
    await expect(
      proxy.connect(attacker).receiveArbitrationRequest(ethers.ZeroHash, attacker.address, 0)
    ).to.be.reverted;
  });
});
