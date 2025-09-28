const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting ManifestRegistry deployment...");

  try {
    // Get deployer info early for better logging
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`🔑 Deploying from: ${deployer.address}`);
    console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);

    // Get the contract factory
    console.log("📦 Getting contract factory...");
    const ManifestRegistry = await ethers.getContractFactory("ManifestRegistry");

    // Deploy the contract
    console.log("⛏️  Deploying contract...");
    const manifestRegistry = await ManifestRegistry.deploy();

    // Wait for deployment to be mined
    console.log("⏳ Waiting for deployment confirmation...");
    await manifestRegistry.waitForDeployment();
    
    // Get transaction details for better reporting
    const deployTransaction = manifestRegistry.deploymentTransaction();
    const transactionReceipt = await deployTransaction.wait();

    // Get the deployed contract address
    const contractAddress = await manifestRegistry.getAddress();
    console.log("✅ ManifestRegistry deployed to:", contractAddress);

    // Update the .env file with the new contract address
    console.log("📝 Updating .env file...");
    const envPath = path.join(__dirname, "../.env");

    if (!fs.existsSync(envPath)) {
      throw new Error(".env file not found");
    }

    let envContent = fs.readFileSync(envPath, "utf8");

    // Check if the line exists and replace it, or add it if it doesn't exist
    const addressLine = `MANIFEST_REGISTRY_CONTRACT_ADDRESS=${contractAddress}`;

    if (envContent.includes("MANIFEST_REGISTRY_CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(
        /MANIFEST_REGISTRY_CONTRACT_ADDRESS=.*/,
        addressLine
      );
    } else {
      // Add the line if it doesn't exist (ensure proper line ending)
      envContent = envContent.trim() + `\n${addressLine}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated .env file with contract address");

    // Display deployment summary with transaction details
    console.log("\n📋 Deployment Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📍 Network: sepolia`);
    console.log(`📧 Contract Address: ${contractAddress}`);
    console.log(`📝 Transaction Hash: ${deployTransaction.hash}`);
    console.log(`⛽ Gas Used: ${transactionReceipt.gasUsed.toString()}`);
    console.log(`💸 Gas Price: ${ethers.formatUnits(deployTransaction.gasPrice, "gwei")} Gwei`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Verify deployment by calling a contract function
    console.log("\n🔍 Verifying deployment...");
    const owner = await manifestRegistry.owner();
    console.log(`✅ Contract owner: ${owner}`);
    console.log(`🔑 Deployed by: ${deployer.address}`);

    console.log("\n🎉 Deployment completed successfully!");
    console.log("Your backend can now interact with the deployed contract.");
    
    return {
      contractAddress,
      transactionHash: deployTransaction.hash,
      gasUsed: transactionReceipt.gasUsed.toString(),
      owner,
      deployer: deployer.address
    };
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Handle script execution
main()
  .then((result) => {
    console.log("\n✨ Script execution completed successfully!");
    console.log("📊 Final Result:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script execution failed:");
    console.error(error);
    process.exitCode = 1;
  });