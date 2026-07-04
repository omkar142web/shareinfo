import express from "express";

import {
  getEntryPage,
  getLandingPage,
  getPublicEntries,
  getRobotsTxt,
  getSitemapXml,
  searchPublicEntriesController,
} from "../controllers/publicController.js";

const router = express.Router();

router.get("/", getLandingPage);
router.get("/robots.txt", getRobotsTxt);
router.get("/sitemap.xml", getSitemapXml);
router.get("/entry/:id", getEntryPage);
router.get("/api/public", getPublicEntries);
router.get("/api/public/search", searchPublicEntriesController);

export default router;
