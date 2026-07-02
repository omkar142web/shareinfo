import {
  findPublicEntryById,
  getPagedPublicEntries,
  normalizePublicEntry,
  searchPublicEntries,
} from "../services/public.service.js";
import { createHttpError } from "../middleware/errorHandlers.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const parsePagination = (req, res) => {
  const cursor = req.query.cursor ? String(req.query.cursor) : null;
  if (cursor && !/^[a-f\d]{24}$/i.test(cursor)) {
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

  return { cursor, limit };
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
    const page = await getPagedPublicEntries(null, DEFAULT_PAGE_SIZE);
    const isLoggedIn = !!(req.cookies.email && req.cookies.password);

    return res.render("landing", {
      data: page.items.map(normalizePublicEntry),
      initialCursor: page.nextCursor,
      hasMore: page.hasMore,
      totalCount: page.totalCount,
      isLoggedIn,
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
    });
  } catch (err) {
    console.error("Public entry page error:", err);
    return next(err);
  }
};

export const getPublicEntries = async (req, res) => {
  try {
    const pagination = parsePagination(req, res);
    if (!pagination) return;

    const page = await getPagedPublicEntries(pagination.cursor, pagination.limit);
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
