import { Router, Response, Request } from "express";
import { prisma } from "../lib/prisma";
import { HederaService } from "../services/HederaService";
import { ReputationService } from "../services/ReputationService";
import { auth, AuthRequest } from "../middleware/auth";

const router = Router();
const hedera = new HederaService();
const reputationService = new ReputationService(hedera);

// GET /api/debtors — list all debtors with reputation
router.get("/", async (_req: Request, res: Response) => {
  const debtors = await prisma.debtorReputation.findMany({
    orderBy: { reputationScore: "desc" },
  });
  res.json({ debtors });
});

// GET /api/debtors/:name — lookup by debtor name
router.get("/lookup/:name", async (req: Request, res: Response) => {
  const debtor = await reputationService.getReputation(
    decodeURIComponent(req.params.name)
  );
  if (!debtor) {
    res.status(404).json({ error: "Debtor not found" });
    return;
  }
  res.json({ debtor });
});

// GET /api/debtors/:id/history — HCS event history
router.get("/:id/history", async (req: Request, res: Response) => {
  const debtor = await prisma.debtorReputation.findUnique({
    where: { id: req.params.id },
  });
  if (!debtor) {
    res.status(404).json({ error: "Debtor not found" });
    return;
  }
  const history = await reputationService.getHistory(debtor.hcsTopicId);
  res.json({ history, topicId: debtor.hcsTopicId });
});

// POST /api/debtors/:id/rebuild — rebuild score from HCS
router.post(
  "/:id/rebuild",
  auth,
  async (req: AuthRequest, res: Response) => {
    const reputation = await reputationService.rebuildFromHCS(req.params.id);
    res.json({ reputation });
  }
);

export default router;
