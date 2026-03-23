export type InvoiceStatus =
  | "UPLOADED"
  | "MINTED"
  | "SCORED"
  | "ADVANCED"
  | "REPAID"
  | "DEFAULTED";

export type RiskTier = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC";

export interface InvoiceDTO {
  id: string;
  invoiceNumber: string;
  debtorName: string;
  debtorAddress: string;
  debtorHederaId?: string;
  amount: number;
  currency: string;
  dueDate: string;
  ownerId: string;
  ipfsHash?: string;
  htsTokenId?: string;
  htsSerialNumber?: number;
  hcsReputationSeq?: string;
  status: InvoiceStatus;
  riskScore?: number;
  riskTier?: RiskTier;
  advanceRate?: number;
  advanceAmount?: number;
  advanceTxId?: string;
  repaidAt?: string;
  repayTxId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskAssessment {
  riskTier: RiskTier;
  riskScore: number;
  advanceRate: number;
  feePercent: number;
  reasoning: string;
  redFlags: string[];
}
