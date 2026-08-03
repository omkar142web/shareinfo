import express from "express";
import { ObjectId } from "mongodb";

import {
  getHome,
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  logoutUser,
  getCreatePost,
  createPost,
  updatePost,
  deletePost,
  getUpdatePage,
  getAddPage,
  deleteMasterUser,
  getEntriesPage,
  generateTitle,
  toggleFavorite,
} from "../controllers/authControllers.js";

const router = express.Router();

const requireObjectId = (req, res, next) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid id",
    });
  }

  return next();
};

const passInvalidIdToNotFound = (req, res, next) => {
  if (!ObjectId.isValid(req.params.id)) {
    return next("route");
  }

  return next();
};

router.route("/").get(getHome).post(createPost);

router.route("/login").get(getLogin).post(postLogin);

router.route("/register").get(getRegister).post(postRegister);

router.get("/logout", logoutUser);

router.get("/add", getAddPage);
router.get("/api/entries", getEntriesPage);
router.post("/api/generate-title", generateTitle);
router.patch("/api/entries/:id/favorite", requireObjectId, toggleFavorite);

router.delete("/user/:id", requireObjectId, deleteMasterUser);

router.get("/update/:id", getUpdatePage);

router
  .route("/:id")
  .get(passInvalidIdToNotFound, getCreatePost)
  .put(requireObjectId, updatePost)
  .delete(requireObjectId, deletePost);

export default router;
