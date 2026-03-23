import { HederaService } from "./HederaService";
import { prisma } from "../lib/prisma";
import { ReputationEvent, DebtorReputationDTO } from "@tradeflow/shared";

export class ReputationService {
  constructor(private hedera: HederaService) {}

  /**
   * Rebuild debtor reputation score from HCS messages
   */
  async rebuildFromHCS(debtorId: string): Promise<DebtorReputationDTO> {
    const debtor = await prisma.debtorReputation.findUniqueOrThrow({
      where: { id: debtorId },
    });

    const events = await this.hedera.getDebtorHistory(debtor.hcsTopicId);

    let paidOnTime = 0;
    let latePaid = 0;
    let defaulted = 0;
    let totalDays = 0;
    let paymentCount = 0;

    for (const ev of events) {
      if (ev.event === "PAID_ON_TIME") {
        paidOnTime++;
        if (ev.daysEarly) {
          totalDays += ev.daysEarly;
          paymentCount++;
        }
      } else if (ev.event === "PAID_LATE") {
        latePaid++;
        if (ev.daysLate) {
          totalDays += ev.daysLate;
          paymentCount++;
        }
      } else if (ev.event === "DEFAULTED") {
        defaulted++;
      }
    }

    const totalPayments = paidOnTime + latePaid + defaulted;

    // Score: start at 50, +2 per on-time, -5 per late, -15 per default
    let reputationScore = 50;
    reputationScore += paidOnTime * 2;
    reputationScore -= latePaid * 5;
    reputationScore -= defaulted * 15;
    reputationScore = Math.min(100, Math.max(0, reputationScore));

    const avgDaysToPayment =
      paymentCount > 0 ? totalDays / paymentCount : undefined;

    const updated = await prisma.debtorReputation.update({
      where: { id: debtorId },
      data: {
        paidOnTime,
        latePaid,
        defaulted,
        totalInvoices: totalPayments,
        avgDaysToPayment,
        reputationScore,
        lastUpdated: new Date(),
      },
    });

    return {
      ...updated,
      lastUpdated: updated.lastUpdated.toISOString(),
      debtorHederaId: updated.debtorHederaId ?? undefined,
      avgDaysToPayment: updated.avgDaysToPayment ?? undefined,
    };
  }

  async getOrCreateDebtor(
    debtorName: string,
    debtorHederaId?: string
  ): Promise<{ id: string; hcsTopicId: string; reputationScore: number }> {
    const existing = await prisma.debtorReputation.findFirst({
      where: { debtorName },
    });
    if (existing) return existing;

    const topicId = await this.hedera.createReputationTopic(debtorName);
    const debtor = await prisma.debtorReputation.create({
      data: { debtorName, debtorHederaId, hcsTopicId: topicId },
    });
    return debtor;
  }

  async getReputation(debtorName: string): Promise<DebtorReputationDTO | null> {
    const debtor = await prisma.debtorReputation.findFirst({
      where: { debtorName },
    });
    if (!debtor) return null;
    return {
      ...debtor,
      lastUpdated: debtor.lastUpdated.toISOString(),
      debtorHederaId: debtor.debtorHederaId ?? undefined,
      avgDaysToPayment: debtor.avgDaysToPayment ?? undefined,
    };
  }

  async getHistory(topicId: string): Promise<ReputationEvent[]> {
    return this.hedera.getDebtorHistory(topicId);
  }
}
