import express from "express";
import { ObjectId } from "mongodb";
import * as fc from "../controllers/folderController.js";

const router = express.Router();

const requireObjectId = (req, res, next) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }
  return next();
};

router.get("/api/folders", fc.listFolders);
router.post("/api/folders", fc.createFolder);
router.patch("/api/folders/:id", requireObjectId, fc.renameFolder);
router.patch("/api/folders/:id/color", requireObjectId, fc.updateColor);
router.delete("/api/folders/:id", requireObjectId, fc.deleteFolder);
router.patch("/api/entries/:id/move-folder", requireObjectId, fc.moveEntryToFolder);

export default router;
