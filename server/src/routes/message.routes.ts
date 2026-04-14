import { Router } from "express";
import { requireAuth, type AuthedRequest } from "@/middleware/auth";
import {
  getConversation,
  listConversations,
  sendMessage,
} from "@/controllers/message.controller";

const router = Router();

router.use(requireAuth);
router.get("/conversations", (req, res) => listConversations(req as AuthedRequest, res));
router.post("/", (req, res) => sendMessage(req as AuthedRequest, res));
router.get("/:otherUserId", (req, res) => getConversation(req as AuthedRequest, res));

export default router;
