import { AIKeeperAgent } from "../services/AIKeeperAgent";
import { HederaService } from "../services/HederaService";
import { BonzoService } from "../services/BonzoService";
import { OracleService } from "../services/OracleService";

// Mock all external dependencies
jest.mock("@langchain/openai", () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({
      content: JSON.stringify({
        riskTier: "AA",
        riskScore: 82,
        advanceRate: 0.85,
        feePercent: 1.8,
        reasoning: "Strong debtor with good payment history",
        redFlags: [],
      }),
    }),
  })),
}));

jest.mock("../lib/prisma", () => ({
  prisma: {
    invoice: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "inv_001",
        invoiceNumber: "INV-2024-001",
        debtorName: "Acme Corp",
        amount: 10000,
        currency: "USD",
        dueDate: new Date(Date.now() + 30 * 86400000),
        status: "MINTED",
        owner: { id: "user_001", email: "sme@example.com" },
      }),
      update: jest.fn().mockResolvedValue({
        id: "inv_001",
        riskScore: 82,
        riskTier: "AA",
        advanceRate: 0.85,
        advanceAmount: 8500,
        status: "SCORED",
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    debtorReputation: {
      findFirst: jest.fn().mockResolvedValue({
        id: "debtor_001",
        debtorName: "Acme Corp",
        hcsTopicId: "0.0.12345",
        reputationScore: 75,
        paidOnTime: 5,
        latePaid: 1,
        defaulted: 0,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

describe("AIKeeperAgent", () => {
  let agent: AIKeeperAgent;
  let mockHedera: jest.Mocked<HederaService>;
  let mockBonzo: jest.Mocked<BonzoService>;
  let mockOracle: jest.Mocked<OracleService>;

  beforeEach(() => {
    mockHedera = {
      submitReputationEvent: jest.fn().mockResolvedValue("42"),
      createReputationTopic: jest.fn().mockResolvedValue("0.0.99999"),
      mintInvoiceNFT: jest.fn().mockResolvedValue(1),
      burnInvoiceNFT: jest.fn().mockResolvedValue("0.0.tx123"),
      getDebtorHistory: jest.fn().mockResolvedValue([]),
      createInvoiceCollection: jest.fn().mockResolvedValue("0.0.11111"),
      transferInvoiceNFT: jest.fn().mockResolvedValue("0.0.tx456"),
    } as unknown as jest.Mocked<HederaService>;

    mockBonzo = {
      getVaultStats: jest
        .fn()
        .mockResolvedValue({ apyPercent: "6.20", liquidityIndex: "1000000000000000000000000000" }),
      depositToVault: jest.fn().mockResolvedValue("0xhash1"),
      borrowForAdvance: jest.fn().mockResolvedValue("0xhash2"),
      repayAdvance: jest.fn().mockResolvedValue("0xhash3"),
      withdrawFromVault: jest.fn().mockResolvedValue("0xhash4"),
      getUserAccountData: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<BonzoService>;

    mockOracle = {
      getHbarUsdPrice: jest.fn().mockResolvedValue(0.085),
    } as unknown as jest.Mocked<OracleService>;

    agent = new AIKeeperAgent(mockHedera, mockBonzo, mockOracle);
  });

  describe("scoreInvoice", () => {
    it("should score an invoice and return risk assessment", async () => {
      const assessment = await agent.scoreInvoice("inv_001");

      expect(assessment).toBeDefined();
      expect(assessment.riskTier).toBe("AA");
      expect(assessment.riskScore).toBe(82);
      expect(assessment.advanceRate).toBe(0.85);
      expect(assessment.feePercent).toBe(1.8);
      expect(assessment.reasoning).toBeTruthy();
      expect(assessment.redFlags).toBeInstanceOf(Array);
    });

    it("should call oracle for HBAR price", async () => {
      await agent.scoreInvoice("inv_001");
      expect(mockOracle.getHbarUsdPrice).toHaveBeenCalledTimes(1);
    });

    it("should call bonzo for vault stats", async () => {
      await agent.scoreInvoice("inv_001");
      expect(mockBonzo.getVaultStats).toHaveBeenCalledTimes(1);
    });
  });

  describe("runKeeperCycle", () => {
    it("should run without error when no advanced invoices", async () => {
      await expect(agent.runKeeperCycle()).resolves.not.toThrow();
    });

    it("should process overdue invoices", async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { prisma } = require("../lib/prisma");
      prisma.invoice.findMany.mockResolvedValueOnce([
        {
          id: "inv_002",
          debtorName: "Late Corp",
          amount: 5000,
          dueDate: new Date(Date.now() - 10 * 86400000), // 10 days overdue
          status: "ADVANCED",
        },
      ]);

      await agent.runKeeperCycle();

      expect(mockHedera.submitReputationEvent).toHaveBeenCalledWith(
        "0.0.12345",
        expect.objectContaining({
          event: "PAID_LATE",
          debtorName: "Late Corp",
        })
      );
    });

    it("should mark defaulted invoices", async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { prisma } = require("../lib/prisma");
      prisma.invoice.findMany.mockResolvedValueOnce([
        {
          id: "inv_003",
          debtorName: "Acme Corp",
          amount: 5000,
          dueDate: new Date(Date.now() - 35 * 86400000), // 35 days overdue
          status: "ADVANCED",
        },
      ]);

      await agent.runKeeperCycle();

      expect(mockHedera.submitReputationEvent).toHaveBeenCalledWith(
        "0.0.12345",
        expect.objectContaining({ event: "DEFAULTED" })
      );
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "DEFAULTED" }),
        })
      );
    });
  });
});
