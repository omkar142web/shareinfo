import {
  findPublicEntryById,
  getPagedPublicEntries,
  getPublicEntriesForSitemap,
  normalizePublicEntry,
  searchPublicEntries,
} from "../services/public.service.js";
import { createHttpError } from "../middleware/errorHandlers.js";
import { renderMarkdown } from "../services/markdown.service.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const SORT_OPTIONS = new Set(["updated", "created"]);
const SITE_URL = (process.env.SITE_URL || "https://opdev.site").replace(/\/+$/, "");

const escapeXml = (value = "") => {
  return String(value).replace(/[<>&'"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  }[char]));
};

const parsePagination = (req, res) => {
  const cursor = req.query.cursor ? String(req.query.cursor) : null;
  if (cursor && !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z_[a-f\d]{24}$/i.test(cursor)) {
    res.status(400).json({
      success: false,
      message: "Invalid cursor",
    });
    return null;
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  const requestedSort = String(req.query.sort || "updated");
  const sort = SORT_OPTIONS.has(requestedSort) ? requestedSort : "updated";

  return { cursor, limit, sort };
};

const sendPublicPage = (res, page) => {
  return res.json({
    items: page.items.map(normalizePublicEntry),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    totalCount: page.totalCount,
  });
};

export const getLandingPage = async (req, res, next) => {
  try {
    const page = await getPagedPublicEntries(null, DEFAULT_PAGE_SIZE, "updated");
    const isLoggedIn = !!(req.cookies.email && req.cookies.password);

    return res.render("landing", {
      data: page.items.map(normalizePublicEntry),
      initialCursor: page.nextCursor,
      hasMore: page.hasMore,
      totalCount: page.totalCount,
      isLoggedIn,
      siteUrl: SITE_URL,
      canonicalUrl: `${SITE_URL}/`,
      renderMarkdown,
    });
  } catch (err) {
    console.error("Landing page error:", err);
    return next(err);
  }
};

export const getEntryPage = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return next(createHttpError(404, "Entry not found"));
    }

    const entry = await findPublicEntryById(id);
    if (!entry) {
      return next(createHttpError(404, "Entry not found"));
    }

    return res.render("entry", {
      entry: normalizePublicEntry(entry),
      siteUrl: SITE_URL,
      canonicalUrl: `${SITE_URL}/entry/${encodeURIComponent(id)}`,
      renderMarkdown,
    });
  } catch (err) {
    console.error("Public entry page error:", err);
    return next(err);
  }
};

export const getRobotsTxt = (req, res) => {
  res.type("text/plain");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.send(`User-agent: *
Allow: /

Disallow: /login
Disallow: /register
Disallow: /api
Disallow: /logout
Disallow: /add
Disallow: /update/

Sitemap: ${SITE_URL}/sitemap.xml
`);
};

export const getSitemapXml = async (req, res) => {
  try {
    const entries = await getPublicEntriesForSitemap();
    const urls = [
      `  <url>
    <loc>${escapeXml(`${SITE_URL}/`)}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
      ...entries.map((entry) => {
        const id = entry._id.toString();
        const lastmod = (entry.updatedAt || entry.createdAt || entry._id.getTimestamp()).toISOString();
        return `  <url>
    <loc>${escapeXml(`${SITE_URL}/entry/${encodeURIComponent(id)}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }),
    ];

    res.type("application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`);
  } catch (err) {
    console.error("Sitemap error:", err);
    return res.status(500).type("text/plain").send("Unable to generate sitemap");
  }
};

export const getPublicEntries = async (req, res) => {
  try {
    const pagination = parsePagination(req, res);
    if (!pagination) return;

    const page = await getPagedPublicEntries(
      pagination.cursor,
      pagination.limit,
      pagination.sort,
    );
    return sendPublicPage(res, page);
  } catch (err) {
    console.error("Public entries API error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const searchPublicEntriesController = async (req, res) => {
  try {
    const pagination = parsePagination(req, res);
    if (!pagination) return;

    const keyword = String(req.query.keyword || "").trim();
    const page = await searchPublicEntries(
      keyword,
      pagination.cursor,
      pagination.limit,
      pagination.sort,
    );

    return sendPublicPage(res, page);
  } catch (err) {
    console.error("Public search API error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
