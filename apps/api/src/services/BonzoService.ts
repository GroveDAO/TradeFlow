import { ethers } from "ethers";

const BONZO_ABI = [
  "function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external",
  "function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf) external returns (uint256)",
  "function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))",
  "function getUserAccountData(address user) external view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
];

export interface VaultStats {
  apyPercent: string;
  liquidityIndex: string;
}

export class BonzoService {
  private vault: ethers.Contract;
  private signer: ethers.Wallet;

  constructor() {
    const provider = new ethers.JsonRpcProvider(
      process.env.HEDERA_EVM_RPC || "https://testnet.hashio.io/api"
    );
    this.signer = new ethers.Wallet(process.env.EVM_PRIVATE_KEY!, provider);
    this.vault = new ethers.Contract(
      process.env.BONZO_VAULT_ADDRESS!,
      BONZO_ABI,
      this.signer
    );
  }

  async depositToVault(usdcAmount: string): Promise<string> {
    const tx = await this.vault.deposit(
      process.env.USDC_H_ADDRESS!,
      ethers.parseUnits(usdcAmount, 6),
      this.signer.address,
      0
    );
    return (await tx.wait()).hash;
  }

  async withdrawFromVault(usdcAmount: string, to: string): Promise<string> {
    const tx = await this.vault.withdraw(
      process.env.USDC_H_ADDRESS!,
      ethers.parseUnits(usdcAmount, 6),
      to
    );
    return (await tx.wait()).hash;
  }

  async borrowForAdvance(
    usdcAmount: string,
    onBehalfOf: string
  ): Promise<string> {
    const tx = await this.vault.borrow(
      process.env.USDC_H_ADDRESS!,
      ethers.parseUnits(usdcAmount, 6),
      2,
      0,
      onBehalfOf
    );
    return (await tx.wait()).hash;
  }

  async repayAdvance(usdcAmount: string, onBehalfOf: string): Promise<string> {
    const tx = await this.vault.repay(
      process.env.USDC_H_ADDRESS!,
      ethers.parseUnits(usdcAmount, 6),
      2,
      onBehalfOf
    );
    return (await tx.wait()).hash;
  }

  async getVaultStats(): Promise<VaultStats> {
    const r = await this.vault.getReserveData(process.env.USDC_H_ADDRESS!);
    const rate = Number(r.currentLiquidityRate) / 1e27;
    const apyPercent = ((1 + rate / 31536000) ** 31536000 - 1) * 100;
    return {
      apyPercent: apyPercent.toFixed(2),
      liquidityIndex: r.liquidityIndex.toString(),
    };
  }

  async getUserAccountData(userAddress: string) {
    const [
      totalCollateral,
      totalDebt,
      availableBorrow,
      liquidationThreshold,
      ltv,
      healthFactor,
    ] = await this.vault.getUserAccountData(userAddress);
    return {
      totalCollateral: ethers.formatUnits(totalCollateral, 8),
      totalDebt: ethers.formatUnits(totalDebt, 8),
      availableBorrow: ethers.formatUnits(availableBorrow, 8),
      liquidationThreshold: liquidationThreshold.toString(),
      ltv: ltv.toString(),
      healthFactor: ethers.formatUnits(healthFactor, 18),
    };
  }
}
