import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network chainId:", (await ethers.provider.getNetwork()).chainId);

  // Deploy a minimal ERC20 stub for local testing (on testnet use USDC-H address)
  const usdcAddress = process.env.USDC_H_ADDRESS || deployer.address;

  // 1. Deploy LendingPool
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(usdcAddress);
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  console.log("LendingPool deployed to:", lendingPoolAddress);

  // 2. Deploy InvoiceFactory
  const InvoiceFactory = await ethers.getContractFactory("InvoiceFactory");
  const invoiceFactory = await InvoiceFactory.deploy(lendingPoolAddress);
  await invoiceFactory.waitForDeployment();
  const invoiceFactoryAddress = await invoiceFactory.getAddress();
  console.log("InvoiceFactory deployed to:", invoiceFactoryAddress);

  // 3. Wire: set InvoiceFactory as authorized factor in LendingPool
  await lendingPool.setInvoiceFactory(invoiceFactoryAddress);
  console.log("InvoiceFactory authorized in LendingPool");

  // Write addresses to deployment file
  const deployments = {
    network: (await ethers.provider.getNetwork()).chainId.toString(),
    lendingPool: lendingPoolAddress,
    invoiceFactory: invoiceFactoryAddress,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));
  console.log("Deployment info saved to", outPath);

  // Print env vars to add
  console.log("\nAdd to .env:");
  console.log(`LENDING_POOL_ADDRESS=${lendingPoolAddress}`);
  console.log(`INVOICE_FACTORY_ADDRESS=${invoiceFactoryAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
