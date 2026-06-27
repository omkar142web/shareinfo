import express from "express";
import {
  getHome,
  getDashboard,
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
} from "../controllers/authControllers.js";

const router = express.Router();

router.route("/").get(getHome).post(createPost);

router.get("/dashboard", getDashboard);

router.route("/login").get(getLogin).post(postLogin);

router.route("/register").get(getRegister).post(postRegister);

router.get("/logout", logoutUser);

router.route("/add").get(getAddPage);
router.delete("/user/:id", deleteMasterUser);
router.route("/update/:id").get(getUpdatePage);
router.get("/api/entries", getEntriesPage);
router.route("/:id").get(getCreatePost).put(updatePost).delete(deletePost);

export default router;
