export interface LenderDTO {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  bonzoShareTokens?: number;
  txId: string;
  withdrawn: boolean;
  withdrawnAt?: string;
  createdAt: string;
}

export interface VaultStats {
  apyPercent: string;
  liquidityIndex: string;
  totalDeposited?: string;
}
