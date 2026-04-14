import { Router } from "express";
import { requireAuth, type AuthedRequest } from "@/middleware/auth";
import { getById, searchByEmail } from "@/controllers/user.controller";

const router = Router();

router.use(requireAuth);
router.get("/search", (req, res) => searchByEmail(req as AuthedRequest, res));
router.get("/:id", (req, res) => getById(req as AuthedRequest, res));

export default router;
