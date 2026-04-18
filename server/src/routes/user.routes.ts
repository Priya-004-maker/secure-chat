import { Router } from "express";
import { requireAuth, type AuthedRequest } from "@/middleware/auth";
import {
  changePassword,
  confirmAvatar,
  getById,
  presignAvatar,
  searchByEmail,
  updateProfile,
} from "@/controllers/user.controller";

const router = Router();

router.use(requireAuth);
router.get("/search", (req, res) => searchByEmail(req as AuthedRequest, res));
router.patch("/me", (req, res) => updateProfile(req as AuthedRequest, res));
router.patch("/me/password", (req, res) => changePassword(req as AuthedRequest, res));
router.post("/me/avatar/presign", (req, res) => presignAvatar(req as AuthedRequest, res));
router.post("/me/avatar", (req, res) => confirmAvatar(req as AuthedRequest, res));
router.get("/:id", (req, res) => getById(req as AuthedRequest, res));

export default router;
