const { expect } = require("chai");
const { ethers, network, artifacts } = require("hardhat");

// Optimism messenger precompile address on L2
const MESSENGER_PRECOMPILE = "0x4200000000000000000000000000000000000007";

describe("POC 005 - Optimism end-to-end receiveArbitrationRequest", function () {
  it("accepts messenger-delivered message from foreign proxy and updates request status", async function () {
    const [requester, foreignEOA] = await ethers.getSigners();

    // Deploy Realitio mock and prepare answered question
    const MockRealitio = await ethers.getContractFactory("MockRealitio");
    const realitio = await MockRealitio.deploy();
    await realitio.waitForDeployment?.();

    await (await realitio.connect(requester).askQuestion("Is Optimism working?"))?.wait?.();
    const questionID = ethers.zeroPadValue(ethers.toBeHex(0), 32);
    await (await realitio.connect(requester).submitAnswer(questionID, ethers.ZeroHash, 0, { value: ethers.parseEther("0.01") }))?.wait?.();

    // Deploy Home proxy (Optimism) with placeholder foreign proxy
    const Home = await ethers.getContractFactory("RealitioHomeProxyOptimism");
    const foreignProxy = foreignEOA.address; // treat EOA as foreign proxy
    const foreignChainId = 11155111; // Sepolia (for metadata)
    const home = await Home.deploy(realitio.target ?? realitio.address, "meta", foreignProxy, foreignChainId);
    await home.waitForDeployment?.();

    // Inject MockCrossDomainMessenger bytecode at the precompile address
    const messengerArtifact = await artifacts.readArtifact("MockCrossDomainMessenger");
    // Construct runtime bytecode with constructor args (home, foreign)
    // For simplicity, use default constructor by setting code directly and then configure via setters
    await network.provider.send("hardhat_setCode", [MESSENGER_PRECOMPILE, messengerArtifact.deployedBytecode]);

    // Attach to the precompile as a Contract instance
    const messenger = await ethers.getContractAt("MockCrossDomainMessenger", MESSENGER_PRECOMPILE);
    // Configure home and foreign proxy on the messenger
    await (await messenger.setHomeProxy(home.target ?? home.address))?.wait?.();
    await (await messenger.setForeignProxy(foreignProxy))?.wait?.();

    // Prepare data for receiveArbitrationRequest
    const iface = new ethers.Interface([
      "function receiveArbitrationRequest(bytes32,address,uint256)"
    ]);
    const maxPrevious = ethers.parseEther("0.02");
    const data = iface.encodeFunctionData("receiveArbitrationRequest", [questionID, requester.address, maxPrevious]);

    // Call sendMessage on the messenger (now at the precompile address)
    await expect(
      messenger.connect(foreignEOA).sendMessage(home.target ?? home.address, data, 1_500_000)
    ).to.emit(home, "RequestNotified");
  });
});
