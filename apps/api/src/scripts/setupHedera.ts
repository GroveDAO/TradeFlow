/**
 * Setup Hedera resources for TradeFlow:
 * - Creates the Invoice NFT collection (HTS)
 * - Creates the Alerts HCS topic
 * - Writes IDs to .env file
 *
 * Run: npx ts-node src/scripts/setupHedera.ts
 */
import { HederaService } from "../services/HederaService";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

async function main() {
  console.log("Setting up Hedera resources...");
  console.log("Network:", process.env.HEDERA_NETWORK || "testnet");
  console.log("Operator:", process.env.HEDERA_OPERATOR_ID);

  const hedera = new HederaService();

  // 1. Create Invoice NFT Collection
  console.log("\nCreating Invoice NFT collection...");
  const tokenId = await hedera.createInvoiceCollection();
  console.log("✅ Invoice NFT Token ID:", tokenId);

  // 2. Create Alerts HCS topic
  console.log("\nCreating Alerts HCS topic...");
  const topicId = await hedera.createReputationTopic("TradeFlow Alerts");
  console.log("✅ Alerts Topic ID:", topicId);

  // 3. Write to .env
  const envPath = path.resolve(__dirname, "../../../../.env");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  const updateEnv = (content: string, key: string, value: string): string => {
    const regex = new RegExp(`^${key}=.*`, "m");
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    }
    return content + `\n${key}=${value}`;
  };

  envContent = updateEnv(envContent, "HEDERA_INVOICE_TOKEN_ID", tokenId);
  envContent = updateEnv(envContent, "HEDERA_ALERTS_TOPIC_ID", topicId);
  fs.writeFileSync(envPath, envContent);

  console.log("\n✅ .env updated with:");
  console.log(`   HEDERA_INVOICE_TOKEN_ID=${tokenId}`);
  console.log(`   HEDERA_ALERTS_TOPIC_ID=${topicId}`);
  console.log("\nSetup complete!");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
