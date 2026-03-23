import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hedera_testnet: {
      url: process.env.HEDERA_EVM_RPC || "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: process.env.EVM_PRIVATE_KEY ? [process.env.EVM_PRIVATE_KEY] : [],
    },
    hedera_mainnet: {
      url: "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: process.env.EVM_PRIVATE_KEY ? [process.env.EVM_PRIVATE_KEY] : [],
    },
  },
};

export default config;
