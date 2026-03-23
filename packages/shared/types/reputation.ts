export interface DebtorReputationDTO {
  id: string;
  debtorName: string;
  debtorHederaId?: string;
  hcsTopicId: string;
  totalInvoices: number;
  paidOnTime: number;
  latePaid: number;
  defaulted: number;
  avgDaysToPayment?: number;
  reputationScore: number;
  lastUpdated: string;
}

export interface ReputationEvent {
  debtorName: string;
  invoiceId: string;
  invoiceAmount: number;
  event: "ISSUED" | "PAID_ON_TIME" | "PAID_LATE" | "DEFAULTED";
  daysEarly?: number;
  daysLate?: number;
  ts?: string;
  v?: string;
  seq?: number;
}
