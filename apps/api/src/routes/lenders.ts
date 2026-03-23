import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { BonzoService } from "../services/BonzoService";
import { auth, requireRole, enrichUser, AuthRequest } from "../middleware/auth";

const router = Router();
const bonzo = new BonzoService();

const DepositSchema = z.object({
  amount: z.number().positive(),
});

const WithdrawSchema = z.object({
  amount: z.number().positive(),
});

// POST /api/lenders/deposit
router.post(
  "/deposit",
  auth,
  requireRole("LENDER", "ADMIN"),
  async (req: AuthRequest, res: Response) => {
    await enrichUser(req);
    const { amount } = DepositSchema.parse(req.body);

    if (!req.user!.evmAddress) {
      res.status(400).json({ error: "EVM address not configured" });
      return;
    }

    const txHash = await bonzo.depositToVault(amount.toFixed(2));

    const deposit = await prisma.lPDeposit.create({
      data: {
        userId: req.user!.id,
        amount,
        currency: "USDC-H",
        txId: txHash,
      },
    });

    const stats = await bonzo.getVaultStats();

    res.status(201).json({
      deposit,
      vaultStats: stats,
      message: `$${amount.toFixed(2)} USDC-H deposited to Bonzo vault`,
      txId: txHash,
    });
  }
);

// POST /api/lenders/withdraw
router.post(
  "/withdraw",
  auth,
  requireRole("LENDER", "ADMIN"),
  async (req: AuthRequest, res: Response) => {
    await enrichUser(req);
    const { amount } = WithdrawSchema.parse(req.body);

    if (!req.user!.evmAddress) {
      res.status(400).json({ error: "EVM address not configured" });
      return;
    }

    const txHash = await bonzo.withdrawFromVault(
      amount.toFixed(2),
      req.user!.evmAddress
    );

    // Mark most recent active deposit as withdrawn
    const deposit = await prisma.lPDeposit.findFirst({
      where: { userId: req.user!.id, withdrawn: false },
      orderBy: { createdAt: "desc" },
    });

    if (deposit) {
      await prisma.lPDeposit.update({
        where: { id: deposit.id },
        data: { withdrawn: true, withdrawnAt: new Date() },
      });
    }

    const stats = await bonzo.getVaultStats();

    res.json({
      message: `$${amount.toFixed(2)} USDC-H withdrawn from Bonzo vault`,
      txId: txHash,
      vaultStats: stats,
    });
  }
);

// GET /api/lenders/stats
router.get("/stats", async (_req, res: Response) => {
  const stats = await bonzo.getVaultStats();
  const totalDeposited = await prisma.lPDeposit.aggregate({
    _sum: { amount: true },
    where: { withdrawn: false },
  });
  res.json({
    vaultStats: stats,
    totalDeposited: totalDeposited._sum.amount ?? 0,
  });
});

// GET /api/lenders/my-deposits
router.get(
  "/my-deposits",
  auth,
  async (req: AuthRequest, res: Response) => {
    const deposits = await prisma.lPDeposit.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ deposits });
  }
);

export default router;
