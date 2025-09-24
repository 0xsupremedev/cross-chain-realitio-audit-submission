const { expect } = require("chai");
const { ethers } = require("hardhat");

// End-to-end: Simulate Foreign -> Home via MockAMB on Gnosis
// We bypass deploying the full foreign proxy by setting foreignProxy to an EOA
// and sending the AMB message from that EOA. We also set foreignChainId = 0 to
// match MockAMB.messageSourceChainId().
describe("POC 004 - Gnosis end-to-end receiveArbitrationRequest", function () {
  it("accepts AMB message from configured foreign proxy and updates request status", async function () {
    const [requester, foreignEOA] = await ethers.getSigners();

    // Deploy Realitio mock and create an answered question
    const MockRealitio = await ethers.getContractFactory("MockRealitio");
    const realitio = await MockRealitio.deploy();
    await realitio.waitForDeployment?.();

    // Ask a question and submit an answer with a bond
    const askTx = await realitio.connect(requester).askQuestion("Is this a test?");
    await askTx.wait();
    const questionID = ethers.zeroPadValue(ethers.toBeHex(0), 32);
    await realitio.connect(requester).submitAnswer(questionID, ethers.ZeroHash, 0, { value: ethers.parseEther("0.01") });

    // Deploy AMB and Home proxy
    const AMB = await ethers.getContractFactory("MockAMB");
    const amb = await AMB.deploy();
    await amb.waitForDeployment?.();

    const Home = await ethers.getContractFactory("RealitioHomeProxyGnosis");
    const foreignProxyAddress = foreignEOA.address; // treat EOA as foreign proxy
    const foreignChainId = 0; // MockAMB returns 0
    const home = await Home.deploy(
      realitio.target ?? realitio.address,
      "meta",
      foreignProxyAddress,
      foreignChainId,
      amb.target ?? amb.address
    );
    await home.waitForDeployment?.();

    // Prepare data for receiveArbitrationRequest
    const iface = new ethers.Interface([
      "function receiveArbitrationRequest(bytes32,address,uint256)"
    ]);
    const maxPrevious = ethers.parseEther("0.02"); // >= current bond
    const data = iface.encodeFunctionData("receiveArbitrationRequest", [questionID, requester.address, maxPrevious]);

    // Send AMB message from the configured foreign proxy EOA
    await expect(
      amb.connect(foreignEOA).requireToPassMessage(home.target ?? home.address, data, 5_000_000)
    ).to.emit(home, "RequestNotified");
  });
});
