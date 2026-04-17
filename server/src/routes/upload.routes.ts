import { Router } from "express";
import { requireAuth, type AuthedRequest } from "@/middleware/auth";
import { presignUpload } from "@/controllers/upload.controller";

const router = Router();

router.use(requireAuth);
router.post("/presign", (req, res) => presignUpload(req as AuthedRequest, res));

export default router;
