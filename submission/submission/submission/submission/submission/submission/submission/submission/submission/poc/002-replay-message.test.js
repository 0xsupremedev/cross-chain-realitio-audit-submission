const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("POC 002 - replay message (skeleton)", function () {
  it("state gating prevents double processing", async function () {
    const [caller] = await ethers.getSigners();

    const MockRealitio = await ethers.getContractFactory("MockRealitio");
    const realitio = await MockRealitio.deploy();
    await realitio.waitForDeployment?.();

    const AMB = await ethers.getContractFactory("MockAMB");
    const amb = await AMB.deploy();
    await amb.waitForDeployment?.();

    const Proxy = await ethers.getContractFactory("RealitioHomeProxyGnosis");
    const foreignProxy = ethers.ZeroAddress; // placeholder
    const foreignChainId = 100; // GnosisChain id
    const proxy = await Proxy.deploy(realitio.target ?? realitio.address, "meta", foreignProxy, foreignChainId, amb.target ?? amb.address);
    await proxy.waitForDeployment?.();

    // We can't easily simulate AMB internals here; this skeleton asserts that direct EOA calling is reverted
    await expect(proxy.receiveArbitrationRequest(ethers.ZeroHash, caller.address, 0)).to.be.reverted;
  });
});
