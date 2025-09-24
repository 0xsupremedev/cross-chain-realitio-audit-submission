const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("POC 003 - SafeSend refund behavior (skeleton)", function () {
  it("demonstrates receiver reverting on native send path", async function () {
    const [user] = await ethers.getSigners();

    // Compile-time available mock under src/0.8/test/mocks
    const Reverting = await ethers.getContractFactory("RevertingReceiver");
    const bad = await Reverting.deploy();
    await bad.waitForDeployment?.();

    await expect(user.sendTransaction({ to: bad.target ?? bad.address, value: ethers.parseEther("0.001") }))
      .to.be.revertedWith("RevertingReceiver: reject ETH");
  });
});
