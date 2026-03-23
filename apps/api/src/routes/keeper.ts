import { Router, Response } from "express";
import { AIKeeperAgent } from "../services/AIKeeperAgent";
import { auth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/keeper/run — manually trigger keeper cycle
router.post(
  "/run",
  auth,
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response) => {
    const keeper = req.app.get("keeper") as AIKeeperAgent;
    await keeper.runKeeperCycle();
    res.json({ message: "Keeper cycle completed" });
  }
);

export default router;
