import { ChatOpenAI } from "@langchain/openai";
import { HederaService } from "./HederaService";
import { BonzoService } from "./BonzoService";
import { OracleService } from "./OracleService";
import { prisma } from "../lib/prisma";
import { RiskAssessment } from "@tradeflow/shared";

export class AIKeeperAgent {
  private llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });

  constructor(
    private hedera: HederaService,
    private bonzo: BonzoService,
    private oracle: OracleService
  ) {}

  async scoreInvoice(invoiceId: string): Promise<RiskAssessment> {
    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { owner: true },
    });
    const debtor = await prisma.debtorReputation.findFirst({
      where: { debtorName: invoice.debtorName },
    });
    const hbarUsd = await this.oracle.getHbarUsdPrice();
    const vault = await this.bonzo.getVaultStats();

    const daysUntilDue = Math.ceil(
      (invoice.dueDate.getTime() - Date.now()) / 86400000
    );

    const resp = await this.llm.invoke([
      {
        role: "system",
        content: `Trade finance risk AI. Respond ONLY as JSON:
          { "riskTier": "AAA"|"AA"|"A"|"BBB"|"BB"|"B"|"CCC",
            "riskScore": number (0-100, higher=safer),
            "advanceRate": number (0.0-0.95),
            "feePercent": number (annualized 0.5-8%),
            "reasoning": string, "redFlags": string[] }`,
      },
      {
        role: "user",
        content: `Invoice: $${invoice.amount} ${invoice.currency}, due in
          ${daysUntilDue} days.
          Debtor: ${invoice.debtorName}. Reputation score: ${
            debtor?.reputationScore ?? "UNKNOWN"
          }/100.
          History: ${debtor?.paidOnTime ?? 0} on-time, ${
            debtor?.latePaid ?? 0
          } late, ${debtor?.defaulted ?? 0} defaults.
          HBAR/USD: $${hbarUsd}. Vault APY: ${vault.apyPercent}%.`,
      },
    ]);

    const a: RiskAssessment = JSON.parse(resp.content as string);

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        riskScore: a.riskScore,
        riskTier: a.riskTier as never,
        advanceRate: a.advanceRate,
        advanceAmount: invoice.amount * a.advanceRate,
        status: "SCORED",
      },
    });

    return a;
  }

  async runKeeperCycle(): Promise<void> {
    const advanced = await prisma.invoice.findMany({
      where: { status: "ADVANCED" },
    });

    for (const inv of advanced) {
      const daysOverdue =
        (Date.now() - inv.dueDate.getTime()) / 86400000;
      if (daysOverdue <= 0) continue;

      const debtor = await prisma.debtorReputation.findFirst({
        where: { debtorName: inv.debtorName },
      });
      if (!debtor) continue;

      const event = daysOverdue > 30 ? "DEFAULTED" : "PAID_LATE";
      await this.hedera.submitReputationEvent(debtor.hcsTopicId, {
        debtorName: inv.debtorName,
        invoiceId: inv.id,
        invoiceAmount: inv.amount,
        event,
        daysLate: Math.floor(daysOverdue),
      });

      if (daysOverdue > 30) {
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { status: "DEFAULTED" },
        });
        await prisma.debtorReputation.update({
          where: { id: debtor.id },
          data: {
            defaulted: { increment: 1 },
            reputationScore: Math.max(0, debtor.reputationScore - 15),
            lastUpdated: new Date(),
          },
        });
      }
    }
  }

  startKeeperLoop(ms = 60000): NodeJS.Timeout {
    return setInterval(() => this.runKeeperCycle(), ms);
  }
}
