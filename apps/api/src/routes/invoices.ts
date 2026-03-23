import { Router, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HederaService } from "../services/HederaService";
import { BonzoService } from "../services/BonzoService";
import { AIKeeperAgent } from "../services/AIKeeperAgent";
import { IPFSService } from "../services/IPFSService";
import { auth, enrichUser, AuthRequest } from "../middleware/auth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10_000_000 },
});
const hedera = new HederaService();
const bonzo = new BonzoService();
const ipfs = new IPFSService();

const InvoiceSchema = z.object({
  debtorName: z.string().min(2),
  debtorAddress: z.string(),
  debtorHederaId: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  dueDate: z.string().datetime(),
  invoiceNumber: z.string(),
});

// POST /api/invoices/upload
router.post(
  "/upload",
  auth,
  upload.single("invoice"),
  async (req: AuthRequest, res: Response) => {
    await enrichUser(req);
    const data = InvoiceSchema.parse(JSON.parse(req.body.metadata as string));
    if (!req.file) {
      res.status(400).json({ error: "PDF required" });
      return;
    }

    const ipfsHash = await ipfs.uploadBuffer(
      req.file.buffer,
      `inv-${data.invoiceNumber}.pdf`
    );

    const invoice = await prisma.invoice.create({
      data: {
        ...data,
        dueDate: new Date(data.dueDate),
        ownerId: req.user!.id,
        ipfsHash,
      },
    });

    const tokenId = process.env.HEDERA_INVOICE_TOKEN_ID!;
    const meta = JSON.stringify({
      invoiceId: invoice.id,
      debtor: data.debtorName,
      amount: data.amount,
      dueDate: data.dueDate,
      ipfs: `ipfs://${ipfsHash}`,
    });
    const serial = await hedera.mintInvoiceNFT(tokenId, meta);

    let debtor = await prisma.debtorReputation.findFirst({
      where: { debtorName: data.debtorName },
    });
    if (!debtor) {
      const topicId = await hedera.createReputationTopic(data.debtorName);
      debtor = await prisma.debtorReputation.create({
        data: {
          debtorName: data.debtorName,
          debtorHederaId: data.debtorHederaId,
          hcsTopicId: topicId,
        },
      });
    }

    const hcsSeq = await hedera.submitReputationEvent(debtor.hcsTopicId, {
      debtorName: data.debtorName,
      invoiceId: invoice.id,
      invoiceAmount: data.amount,
      event: "ISSUED",
    });

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        htsTokenId: tokenId,
        htsSerialNumber: serial,
        hcsReputationSeq: hcsSeq,
        status: "MINTED",
      },
    });

    res.status(201).json({
      invoice: updated,
      hashScanUrl: `https://hashscan.io/testnet/token/${tokenId}/${serial}`,
      ipfsUrl: `https://ipfs.io/ipfs/${ipfsHash}`,
    });
  }
);

// GET /api/invoices — list user's invoices
router.get("/", auth, async (req: AuthRequest, res: Response) => {
  const invoices = await prisma.invoice.findMany({
    where: { ownerId: req.user!.id },
    include: { advances: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ invoices });
});

// GET /api/invoices/explore — public marketplace of SCORED invoices
router.get("/explore", async (_req, res: Response) => {
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["SCORED", "ADVANCED"] } },
    select: {
      id: true,
      invoiceNumber: true,
      debtorName: true,
      amount: true,
      currency: true,
      dueDate: true,
      status: true,
      riskScore: true,
      riskTier: true,
      advanceRate: true,
      advanceAmount: true,
      htsTokenId: true,
      htsSerialNumber: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ invoices });
});

// GET /api/invoices/:id
router.get("/:id", auth, async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: req.params.id, ownerId: req.user!.id },
    include: { advances: true },
  });
  res.json({ invoice });
});

// POST /api/invoices/:id/score
router.post("/:id/score", auth, async (req: AuthRequest, res: Response) => {
  const keeper = req.app.get("keeper") as AIKeeperAgent;
  const assessment = await keeper.scoreInvoice(req.params.id);
  res.json({ assessment });
});

// POST /api/invoices/:id/advance
router.post("/:id/advance", auth, async (req: AuthRequest, res: Response) => {
  await enrichUser(req);
  const inv = await prisma.invoice.findUniqueOrThrow({
    where: { id: req.params.id, ownerId: req.user!.id },
  });

  if (!["MINTED", "SCORED"].includes(inv.status) || !inv.advanceAmount) {
    res.status(400).json({ error: "Invoice not ready for advance" });
    return;
  }

  if (!req.user!.evmAddress) {
    res.status(400).json({ error: "EVM address not configured for this user" });
    return;
  }

  const txHash = await bonzo.borrowForAdvance(
    inv.advanceAmount.toFixed(2),
    req.user!.evmAddress
  );

  const fee = inv.riskScore ? ((100 - inv.riskScore) / 100) * 8 : 3;

  await prisma.advance.create({
    data: {
      invoiceId: inv.id,
      amount: inv.advanceAmount,
      feePercent: fee,
      txId: txHash,
    },
  });

  await prisma.invoice.update({
    where: { id: inv.id },
    data: { status: "ADVANCED", advanceTxId: txHash },
  });

  res.json({
    message: `$${inv.advanceAmount.toFixed(2)} advanced via Bonzo vault`,
    txId: txHash,
  });
});

// POST /api/invoices/:id/repay
router.post("/:id/repay", auth, async (req: AuthRequest, res: Response) => {
  await enrichUser(req);
  const inv = await prisma.invoice.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { advances: true },
  });

  if (inv.status !== "ADVANCED") {
    res.status(400).json({ error: "Invoice not in ADVANCED state" });
    return;
  }

  if (!req.user!.evmAddress) {
    res.status(400).json({ error: "EVM address not configured for this user" });
    return;
  }

  const total = inv.advances.reduce(
    (s: number, a: { amount: number; feePercent: number }) => s + a.amount * (1 + a.feePercent / 100),
    0
  );

  const repayTx = await bonzo.repayAdvance(
    total.toFixed(2),
    req.user!.evmAddress
  );

  await hedera.burnInvoiceNFT(inv.htsTokenId!, inv.htsSerialNumber!);

  const debtor = await prisma.debtorReputation.findFirst({
    where: { debtorName: inv.debtorName },
  });

  if (debtor) {
    const daysLate = Math.max(
      0,
      Math.ceil((Date.now() - inv.dueDate.getTime()) / 86400000)
    );

    await hedera.submitReputationEvent(debtor.hcsTopicId, {
      debtorName: inv.debtorName,
      invoiceId: inv.id,
      invoiceAmount: inv.amount,
      event: daysLate > 0 ? "PAID_LATE" : "PAID_ON_TIME",
      daysLate,
    });

    await prisma.debtorReputation.update({
      where: { id: debtor.id },
      data: {
        totalInvoices: { increment: 1 },
        paidOnTime: daysLate === 0 ? { increment: 1 } : undefined,
        latePaid: daysLate > 0 ? { increment: 1 } : undefined,
        reputationScore:
          daysLate === 0
            ? Math.min(100, debtor.reputationScore + 2)
            : Math.max(0, debtor.reputationScore - 5),
        lastUpdated: new Date(),
      },
    });
  }

  await prisma.advance.updateMany({
    where: { invoiceId: inv.id, repaid: false },
    data: { repaid: true, repaidAt: new Date(), repayTxId: repayTx },
  });

  await prisma.invoice.update({
    where: { id: inv.id },
    data: { status: "REPAID", repaidAt: new Date(), repayTxId: repayTx },
  });

  res.json({
    message: "Invoice repaid, NFT burned, reputation updated",
    repayTxId: repayTx,
  });
});

export default router;
