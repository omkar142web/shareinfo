import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { MongoClient, ObjectId } from "mongodb";
import http from "http";
import { Server } from "socket.io";
import OpenAI from "openai";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import Path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);
const viewsPath = Path.join(__dirname, "views");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});
app.use(express.static(Path.join(__dirname, "public")));
app.set("views", viewsPath);
app.set("view engine", "ejs");

// ==========================================
// MONGODB
// ==========================================
const dbname = process.env.MONGO_DB_NAME || "contacts-api";
const URI = process.env.MONGO_URI;

if (!URI) {
  throw new Error("MONGO_URI is missing in .env");
}

let actuallDB;

async function createIndexes() {
  const infoCollection = actuallDB.collection("anyInformation");
  const usersCollection = actuallDB.collection("users");

  await Promise.all([
    infoCollection.createIndex({ email: 1, _id: -1 }),
    infoCollection.createIndex({ isPublic: 1, _id: -1 }),
    usersCollection.createIndex({ email: 1 }, { unique: true }),
  ]);

  console.log("Database indexes are ready");
}

async function connectDB() {
  try {
    if (actuallDB) return actuallDB;

    const client = new MongoClient(URI);
    console.log("Connecting to MongoDB...");

    await client.connect();
    actuallDB = client.db(dbname);

    console.log(`MongoDB is connected to database: ${dbname}`);
    await createIndexes();

    return actuallDB;
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

function getCollection(collectionName = "anyInformation") {
  if (!actuallDB) {
    throw new Error("Database not connected. Please call connectDB() first.");
  }

  return actuallDB.collection(collectionName);
}

await connectDB();

// ==========================================
// MARKDOWN SERVICE
// ==========================================
marked.setOptions({
  breaks: true,
  gfm: true,
  mangle: false,
  headerIds: false,
});

const HTML_DOCUMENT_PATTERN = /^\s*(?:<!doctype\s+html\b|<html\b)/i;
const HTML_STRUCTURE_PATTERN = /<(?:head|body|script|style|main|section|article|button|form|input|textarea|select|div|span|p|h[1-6]|ul|ol|li|table|nav|footer|header)\b[\s\S]*?>/i;
const FENCED_CODE_PATTERN = /^\s*(```|~~~)/;

const mdAllowedTags = sanitizeHtml.defaults.allowedTags.concat([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "img", "del", "input",
  "table", "thead", "tbody", "tr", "th", "td",
  "pre", "code",
]);

const mdAllowedAttributes = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ["href", "name", "target", "rel", "class"],
  code: ["class"],
  input: ["type", "checked", "disabled"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  th: ["align"],
  td: ["align"],
};

function isMostlyHtml(rawText) {
  const tagMatches = rawText.match(/<\/?[a-z][\w:-]*(?:\s[^<>]*)?>/gi) || [];
  if (tagMatches.length < 3) return false;
  const tagLength = tagMatches.reduce((total, tag) => total + tag.length, 0);
  return tagLength / Math.max(rawText.trim().length, 1) > 0.18;
}

function shouldRenderAsHtmlCode(rawText) {
  const text = String(rawText ?? "");
  if (!text.trim() || FENCED_CODE_PATTERN.test(text)) return false;
  return (
    HTML_DOCUMENT_PATTERN.test(text) ||
    (HTML_STRUCTURE_PATTERN.test(text) && isMostlyHtml(text))
  );
}

function prepareMarkdownSource(text = "") {
  const rawText = String(text ?? "");
  if (!shouldRenderAsHtmlCode(rawText)) return rawText;
  const fence = rawText.includes("```") ? "~~~" : "```";
  return `${fence}html\n${rawText}\n${fence}`;
}

function renderMarkdown(text = "") {
  const html = marked.parse(prepareMarkdownSource(text));
  return sanitizeHtml(html, {
    allowedTags: mdAllowedTags,
    allowedAttributes: mdAllowedAttributes,
    allowedSchemes: ["http", "https", "ftp", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
        class: "inline-link",
      }),
      input: sanitizeHtml.simpleTransform("input", {
        disabled: "disabled",
      }),
      img: sanitizeHtml.simpleTransform("img", {
        loading: "lazy",
      }),
    },
  });
}

// ==========================================
// ERROR HANDLER MIDDLEWARE
// ==========================================
const ERROR_PAGES = { 404: "404.html", 500: "500.html" };
const FILE_READ_ERROR_PAGE = "fserr.html";

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function wantsJson(req) {
  return req.path.startsWith("/api/") || req.accepts(["html", "json"]) === "json";
}

function sendErrorPage(res, viewsPathLocal, statusCode) {
  const pageName = ERROR_PAGES[statusCode] || ERROR_PAGES[500];
  const pagePath = Path.join(viewsPathLocal, pageName);
  const fileReadErrorPath = Path.join(viewsPathLocal, FILE_READ_ERROR_PAGE);

  return res.status(statusCode).sendFile(pagePath, (err) => {
    if (!err || res.headersSent) return;
    console.error(`Could not read ${pageName}:`, err);

    return res.status(500).sendFile(fileReadErrorPath, (fallbackErr) => {
      if (!fallbackErr || res.headersSent) return;
      console.error(`Could not read ${FILE_READ_ERROR_PAGE}:`, fallbackErr);

      return res.status(500).send("File read error");
    });
  });
}

function notFoundHandler(viewsPathLocal) {
  return (req, res) => {
    if (wantsJson(req)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    return sendErrorPage(res, viewsPathLocal, 404);
  };
}

function errorHandler(viewsPathLocal) {
  return (err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }

    const statusCode = err.statusCode === 404 ? 404 : 500;
    console.error("Error occurred:", err);

    if (wantsJson(req)) {
      return res.status(statusCode).json({
        success: false,
        message: statusCode === 404 ? "Not found" : "Internal Server Error",
      });
    }

    return sendErrorPage(res, viewsPathLocal, statusCode);
  };
}

// ==========================================
// SERVICES
// ==========================================
const SORT_OPTIONS = new Set(["updated", "created"]);
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const SITE_URL = (process.env.SITE_URL || "https://opdev.site").replace(/\/+$/, "");

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const groq = process.env.GROQ_API_KEY
  ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" })
  : null;

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeSort = (sort = "updated") => SORT_OPTIONS.has(sort) ? sort : "updated";

const getEntrySortDate = (entry, sort) => {
  const field = normalizeSort(sort) === "created" ? "createdAt" : "updatedAt";
  return entry[field] || entry.createdAt || entry._id?.getTimestamp?.() || new Date(0);
};

const encodeCursor = (entry, sort) => {
  if (!entry?._id) return null;

  return `${getEntrySortDate(entry, sort).toISOString()}_${entry._id.toString()}`;
};

const decodeCursor = (cursor) => {
  const [dateValue, id] = String(cursor || "").split("_");
  const date = new Date(dateValue);

  if (!dateValue || Number.isNaN(date.getTime()) || !ObjectId.isValid(id)) {
    return null;
  }

  return { date, id: new ObjectId(id) };
};

const getSortQuery = (cursor) => {
  const parsedCursor = decodeCursor(cursor);
  if (!parsedCursor) return {};

  return {
    $or: [
      { sortDate: { $lt: parsedCursor.date } },
      { sortDate: parsedCursor.date, _id: { $lt: parsedCursor.id } },
    ],
  };
};

const getSortDateExpression = (sort) => {
  if (normalizeSort(sort) === "created") {
    return { $ifNull: ["$createdAt", { $toDate: "$_id" }] };
  }

  return {
    $ifNull: ["$updatedAt", { $ifNull: ["$createdAt", { $toDate: "$_id" }] }],
  };
};

const getPagedCollection = async ({
  collectionName = "anyInformation",
  cursor = null,
  filter = {},
  limit = 20,
  search = "",
  sort = "updated",
  searchFields = ["name", "info"],
}) => {
  const collection = getCollection(collectionName);
  const trimmedSearch = String(search || "").trim();
  const normalizedSort = normalizeSort(sort);

  const queryFilter = { ...filter };
  const regex = trimmedSearch ? new RegExp(escapeRegex(trimmedSearch), "i") : null;
  const searchFilter = regex
    ? { $or: searchFields.map((field) => ({ [field]: regex })) }
    : null;
  const baseFilter = searchFilter
    ? { $and: [queryFilter, searchFilter] }
    : queryFilter;

  const cursorQuery = getSortQuery(cursor);

  const pipeline = [
    { $match: baseFilter },
    { $addFields: { sortDate: getSortDateExpression(normalizedSort) } },
  ];

  if (Object.keys(cursorQuery).length > 0) {
    pipeline.push({ $match: cursorQuery });
  }

  pipeline.push(
    { $sort: { sortDate: -1, _id: -1 } },
    { $limit: limit + 1 },
    { $project: { sortDate: 0 } },
  );

  const [rawItems, totalCount] = await Promise.all([
    collection.aggregate(pipeline).toArray(),
    collection.countDocuments(baseFilter),
  ]);
  const hasMore = rawItems.length > limit;
  const items = hasMore ? rawItems.slice(0, limit) : rawItems;
  const nextCursor =
    hasMore && items.length > 0 ? encodeCursor(items[items.length - 1], normalizedSort) : null;

  return { items, nextCursor, hasMore, totalCount };
};

// --- Auth Services ---
const findUserByEmail = async (email) => {
  const collection = getCollection("users");
  return await collection.findOne({ email });
};

const createUser = async (userData) => {
  const collection = getCollection("users");
  return await collection.insertOne(userData);
};

const getUserData = async (email) => {
  return await getCollection().find({ email }).sort({ _id: -1 }).toArray();
};

const getAllUsers = async () => {
  return await getCollection().find().sort({ _id: -1 }).toArray();
};

const getAllUsersForMaster = async () => {
  return await getCollection("users").find().sort({ _id: -1 }).toArray();
};

const updateUser = async (email, updateData) => {
  const collection = getCollection("users");
  return await collection.updateOne({ email }, { $set: updateData });
};

const deleteUser = async (email) => {
  const collection = getCollection("users");
  return await collection.deleteOne({ email });
};

const getPagedUserData = async (email, cursor, limit = 20) => {
  return getPagedCollection({ cursor, filter: { email }, limit });
};

const getPagedUserDataWithVisibility = async (email, cursor, limit = 20, visibility = "all", search = "", sort = "updated") => {
  const filter = { email };

  if (visibility === "favorite") {
    filter.isFavorite = true;
  } else if (visibility === "public") {
    filter.isPublic = true;
  } else if (visibility === "private") {
    filter.isPublic = { $ne: true };
  }

  return getPagedCollection({ cursor, filter, limit, search, sort });
};

const getPagedAllData = async (cursor, limit = 20) => {
  return getPagedCollection({ cursor, limit });
};

const getPagedAllDataWithVisibility = async (cursor, limit = 20, visibility = "all", search = "", sort = "updated") => {
  const filter = { email: { $ne: "contacts@gmail.com" } };

  if (visibility === "favorite") {
    filter.isFavorite = true;
  } else if (visibility === "public") {
    filter.isPublic = true;
  } else if (visibility === "private") {
    filter.isPublic = { $ne: true };
  }

  return getPagedCollection({ cursor, filter, limit, search, sort });
};

const getPagedUsers = async (cursor, limit = 20, search = "", sort = "updated") => {
  return getPagedCollection({
    collectionName: "users",
    cursor,
    limit,
    search,
    sort,
    searchFields: ["name", "email"],
  });
};

// --- Public Services ---
const normalizePublicEntry = (entry = {}) => {
  return {
    _id: entry._id?.toString(),
    name: entry.name || "",
    info: entry.info || "",
    ownerName: entry.ownerName || "",
    email: entry.email || "",
    isPublic: entry.isPublic === true,
    createdAt: entry.createdAt || entry._id?.getTimestamp?.() || null,
    updatedAt: entry.updatedAt || null,
  };
};

const getPagedPublicEntries = async (cursor, limit = 20, sort = "updated") => {
  return getPagedCollection({ cursor, filter: { isPublic: true }, limit, sort });
};

const searchPublicEntries = async (keyword, cursor, limit = 20, sort = "updated") => {
  const trimmedKeyword = String(keyword || "").trim();

  if (!trimmedKeyword) {
    return getPagedPublicEntries(cursor, limit, sort);
  }

  const regex = new RegExp(escapeRegex(trimmedKeyword), "i");
  const filter = {
    isPublic: true,
    $or: [{ name: regex }, { info: regex }],
  };

  return getPagedCollection({ cursor, filter, limit, sort });
};

const findPublicEntryById = async (id) => {
  const collection = getCollection("anyInformation");

  return collection.findOne({ _id: new ObjectId(id), isPublic: true });
};

const getPublicEntriesForSitemap = async () => {
  const collection = getCollection("anyInformation");

  return collection
    .find(
      { isPublic: true },
      { projection: { _id: 1, createdAt: 1, updatedAt: 1 } },
    )
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .toArray();
};

// ==========================================
// SOCKET HELPERS
// ==========================================
const getUserRoom = (email = "") => `user:${String(email).toLowerCase()}`;

const emitEntryToPrivateAudience = (io, ownerEmail, event, payload) => {
  io.to(getUserRoom(ownerEmail)).to("admins").emit(event, payload);
};

const emitEntryToAudiences = ({ io, ownerEmail, event, payload, isPublic = false }) => {
  io.to(getUserRoom(ownerEmail)).to("admins").emit(event, payload);
  if (isPublic) {
    io.to("public").emit(event, payload);
  }
};

// ==========================================
// AUTH CONTROLLERS
// ==========================================
const COOKIE_OPTIONS = { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 30 };

const setUserCookies = (res, user) => {
  const cookies = { name: user.name, email: user.email, password: user.password };

  Object.entries(cookies).forEach(([key, value]) => {
    res.cookie(key, value, COOKIE_OPTIONS);
  });
};

function clearUserCookies(res) {
  ["name", "email", "password"].forEach((cookie) => {
    res.clearCookie(cookie);
  });
}

const getHome = async (req, res, next) => {
  const isLoggedIn = req.cookies.email && req.cookies.password;

  if (!isLoggedIn) {
    return getLandingPage(req, res, next);
  }

  try {
    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return getLandingPage(req, res, next);
    }

    const visibility = ["public", "private", "favorite"].includes(req.query.visibility)
      ? req.query.visibility
      : "all";

    const keyword = req.query.keyword ? String(req.query.keyword).trim() : "";
    const sort = ["updated", "created"].includes(req.query.sort)
      ? req.query.sort
      : "updated";

    let page;
    let isMaster = false;

    if (user.password === "admin" && user.email === "admin@gmail.com") {
      page = await getPagedAllDataWithVisibility(null, DEFAULT_PAGE_SIZE, visibility, keyword, sort);
    } else if (user.password === "master" && user.email === "master@gmail.com") {
      page = await getPagedUsers(null, DEFAULT_PAGE_SIZE, keyword, sort);
      isMaster = true;
    } else {
      page = await getPagedUserDataWithVisibility(user.email, null, DEFAULT_PAGE_SIZE, visibility, keyword, sort);
    }

    return res.render("allInfo", {
      data: page.items,
      initialCursor: page.nextCursor,
      hasMore: page.hasMore,
      totalCount: page.totalCount,
      activeVisibility: visibility,
      activeKeyword: keyword,
      activeSort: sort,
      renderMarkdown,
      currentUserEmail: user.email,
      isAdmin: user.email === "admin@gmail.com" && user.password === "admin",
      ...(isMaster ? { isMaster: true } : {}),
    });
  } catch (err) {
    console.error("Home error", err);
    return next(err);
  }
};

const getEntriesPage = async (req, res) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await findUserByEmail(req.cookies.email);
    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cursor = req.query.cursor ? String(req.query.cursor) : null;
    if (cursor) {
      const isComposite = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z_[a-f\d]{24}$/i.test(cursor);
      if (!isComposite) {
        return res.status(400).json({ success: false, message: "Invalid cursor" });
      }
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

    const visibility = ["public", "private", "favorite"].includes(req.query.visibility)
      ? req.query.visibility
      : "all";

    const keyword = req.query.keyword ? String(req.query.keyword).trim() : "";
    const sort = ["updated", "created"].includes(req.query.sort)
      ? req.query.sort
      : "updated";

    let page;
    if (user.password === "admin" && user.email === "admin@gmail.com") {
      page = await getPagedAllDataWithVisibility(cursor, limit, visibility, keyword, sort);
    } else if (user.password === "master" && user.email === "master@gmail.com") {
      page = await getPagedUsers(cursor, limit, keyword, sort);
    } else {
      page = await getPagedUserDataWithVisibility(user.email, cursor, limit, visibility, keyword, sort);
    }

    return res.json({
      items: page.items.map((item) => ({ ...item, _id: item._id.toString() })),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      totalCount: page.totalCount,
    });
  } catch (err) {
    console.error("Entries page error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const generateTitle = async (req, res) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.status(401).json({ success: false, message: "Please login first." });
    }

    const user = await findUserByEmail(req.cookies.email);
    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.status(401).json({ success: false, message: "Please login again." });
    }

    const content = String(req.body.content || "").trim();
    if (!content) {
      return res.status(400).json({ success: false, message: "Add content first before using AI." });
    }

    if (!process.env.GEMINI_API_KEY && !groq) {
      return res.status(500).json({ success: false, message: "No AI API key configured. Set GEMINI_API_KEY or GROQ_API_KEY." });
    }

    const SYSTEM_PROMPT = `You are an expert at creating concise, searchable titles for saved content.

Your goal is to generate the best possible title that helps users quickly recognize the content later.

Rules:

- Return ONLY the title.
- Never include explanations, quotes, markdown, or prefixes.
- Prefer 2–5 words.
- Never exceed 7 words.
- Use title case where appropriate.
- Make the title descriptive rather than generic.
- Focus on the primary topic or purpose, not minor details.
- Avoid vague titles like "Notes", "Information", "Data", "File", "Code", or "Untitled" unless nothing else is identifiable.

Understand the content before naming it:

- Plain text → summarize the main topic.
- Source code → identify what the code does or represents.
- HTML/CSS/JavaScript → describe the page, component, or functionality.
- SVG → identify the icon, logo, or illustration if possible.
- JSON → describe the represented data.
- SQL → identify the query purpose.
- Logs or stack traces → identify the error or system.
- URLs → infer the website or resource when possible.
- Markdown → identify the document's topic.
- Configuration files → describe the software or purpose.

When appropriate:

- Preserve important names such as technologies, frameworks, libraries, products, people, websites, APIs, programming languages, file names, classes, or functions.
- Expand obvious abbreviations only if it improves clarity.
- If the content contains a clear title or heading, prefer a refined version of that title.

Emoji:

- Add at most one relevant emoji only if it naturally improves recognition.
- Never force emojis.

Fallback:

- If the content is too short or ambiguous, generate the most accurate descriptive title possible rather than guessing.`;

    let title = null;

    if (process.env.GEMINI_API_KEY) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const geminiRes = await fetch(
          `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
              contents: [{ parts: [{ text: content }] }],
            }),
            signal: controller.signal,
          },
        );

        clearTimeout(timeout);

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            title = String(data.candidates[0].content.parts[0].text)
              .trim()
              .replace(/^["'`]+|["'`.!?:;]+$/g, "");
          }
        } else {
          const errBody = await geminiRes.json().catch(() => ({}));
          console.error("Gemini API error:", errBody.error || errBody);
        }
      } catch (geminiErr) {
        console.error("Gemini failed, falling back to Groq:", geminiErr.message);
      }
    }

    if (!title && groq) {
      let model = "openai/gpt-oss-20b";
      let response;
      try {
        response = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content },
          ],
        });
      } catch (primaryErr) {
        if (primaryErr.status !== 404) {
          throw primaryErr;
        }
        model = "llama-3.3-70b-versatile";
        try {
          response = await groq.chat.completions.create({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content },
            ],
          });
        } catch (fallbackErr) {
          console.error("Fallback model also failed:", fallbackErr);
          throw primaryErr;
        }
      }

      title = String(response.choices[0]?.message?.content || "")
        .trim()
        .replace(/^["'`]+|["'`.!?:;]+$/g, "");
    }

    if (!title) {
      return res.status(500).json({ success: false, message: "Unable to generate title right now." });
    }

    return res.json({ success: true, title });
  } catch (err) {
    console.error("AI title generation error:", err);
    return res.status(500).json({ success: false, message: "Unable to generate title right now." });
  }
};

const getLogin = async (req, res, next) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.render("login");
    }

    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.render("login");
    }

    return res.redirect("/");
  } catch (err) {
    console.error("Login GET error ❌", err);
    return next(err);
  }
};

const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ success: false, message: "No account found with that email. Please register first.", field: "email" });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: "Incorrect password. Please try again.", field: "password" });
    }

    setUserCookies(res, user);

    return res.json({ success: true, redirect: "/" });
  } catch (err) {
    console.error("Login POST error ❌", err);
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

const getRegister = (req, res) => {
  res.render("register");
};

const postRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    console.log(name, email);

    const existingUser = await findUserByEmail(email);
    console.log(existingUser);

    if (existingUser) {
      return res.status(409).json({ success: false, message: "An account with this email already exists. Try logging in.", field: "email" });
    }

    await createUser(req.body);

    console.log(req.body);
    setUserCookies(res, { name, email, password });

    return res.json({ success: true, redirect: "/" });
  } catch (err) {
    console.error("Register POST error ❌", err);
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

const logoutUser = (req, res) => {
  clearUserCookies(res);
  res.redirect("/");
};

const getCreatePost = async (req, res, next) => {
  if (!req.cookies.email || !req.cookies.password) {
    return res.redirect("/login");
  }

  try {
    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.redirect("/login");
    }

    return res.render("updateInformation", {
      person: {},
      title: "Create Post",
      buttonText: "Create Post",
    });
  } catch (err) {
    console.error("Error fetching user in getCreatePost:", err);
    return next(err);
  }
};

const createPost = async (req, res, next) => {
  if (!req.cookies.email || !req.cookies.password) {
    return res.redirect("/login");
  }

  try {
    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.redirect("/login");
    }

    const collection = getCollection("anyInformation");

    const { name, info } = req.body;
    const now = new Date();
    const addedData = await collection.insertOne({
      name,
      info,
      isPublic: req.body.isPublic === true,
      isFavorite: false,
      ownerName: user.name,
      createdAt: now,
      updatedAt: now,
      email: user.email,
    });

    const io = req.app.get("io");
    if (io) {
      emitEntryToAudiences({
        io,
        ownerEmail: user.email,
        event: "entry:created",
        isPublic: req.body.isPublic === true,
        payload: {
        _id: addedData.insertedId,
        name,
        info,
        isPublic: req.body.isPublic === true,
        isFavorite: false,
        ownerName: user.name,
        email: user.email,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        actionId: req.body.actionId || null,
        },
      });
    }

    return res.status(201).json({ message: "Post created successfully", addedData });
  } catch (err) {
    console.error("Error creating post:", err);
    return next(err);
  }
};

const getAddPage = async (req, res, next) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.redirect("/login");
    }

    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.redirect("/login");
    }

    return res.render("updateInformation", {
      person: { email: user.email },
      title: "Add Info",
      buttonText: "Save Entry",
    });
  } catch (err) {
    console.error("Add page error:", err);
    return next(err);
  }
};

const getUpdatePage = async (req, res, next) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.redirect("/login");
    }

    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.redirect("/login");
    }

    const collection = getCollection("anyInformation");

    const data = await collection.findOne({ _id: new ObjectId(req.params.id) });

    if (!data) {
      return next(createHttpError(404, "Post not found"));
    }

    const isAdmin = user.email === "admin@gmail.com" && user.password === "admin";
    const isOwner = data.email === user.email;

    if (!isAdmin && !isOwner) {
      return next(createHttpError(404, "Post not found"));
    }

    return res.render("updateInformation", {
      person: data,
      title: "Update Info",
      buttonText: "Update Entry",
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!req.cookies.email || !req.cookies.password) {
      return next(createHttpError(404, "Post not found"));
    }

    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return next(createHttpError(404, "Post not found"));
    }

    const collection = getCollection("anyInformation");

    const { name, info } = req.body;
    const existingEntry = await collection.findOne({ _id: new ObjectId(id) });

    if (!existingEntry) {
      return next(createHttpError(404, "Post not found"));
    }

    const isAdmin = user.email === "admin@gmail.com" && user.password === "admin";
    const isOwner = existingEntry.email === user.email;

    if (!isAdmin && !isOwner) {
      return next(createHttpError(404, "Post not found"));
    }

    const wasPublic = existingEntry.isPublic === true;
    const nowPublic = req.body.isPublic === true;
    const now = new Date();

    const updatedData = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          info,
          isPublic: nowPublic,
          updatedAt: now,
        },
      },
    );

    const io = req.app.get("io");
    if (io) {
      const payload = {
        _id: id,
        name,
        info,
        isPublic: nowPublic,
        isFavorite: existingEntry.isFavorite === true,
        email: existingEntry.email,
        ownerName: existingEntry.ownerName,
        updatedAt: now.toISOString(),
        actionId: req.body.actionId || null,
      };

      emitEntryToPrivateAudience(io, existingEntry.email, "entry:updated", payload);

      if (nowPublic) {
        io.to("public").emit("entry:updated", payload);
      } else if (wasPublic) {
        // Emit entry:deleted only to public-room sockets that are NOT the
        // owner's own devices.  The owner already received entry:updated via
        // their private user room, so sending them entry:deleted would cause
        // the card to vanish on their other devices.
        const ownerRoom = getUserRoom(existingEntry.email);
        const publicSockets = io.sockets.adapter.rooms.get("public");
        if (publicSockets) {
          for (const socketId of publicSockets) {
            const s = io.sockets.sockets.get(socketId);
            if (s && !s.rooms.has(ownerRoom)) {
              s.emit("entry:deleted", {
                _id: id,
                actionId: req.body.actionId || null,
              });
            }
          }
        }
      }
    }

    res.status(200).json({ message: "Updated successfully", updatedData });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

const toggleFavorite = async (req, res, next) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const collection = getCollection("anyInformation");
    const id = new ObjectId(req.params.id);
    const entry = await collection.findOne({ _id: id });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found",
      });
    }

    const isAdmin = user.email === "admin@gmail.com" && user.password === "admin";
    const isOwner = entry.email === user.email;

    if (!isAdmin && !isOwner) {
      return res.status(404).json({
        success: false,
        message: "Entry not found",
      });
    }

    const isFavorite = entry.isFavorite !== true;

    await collection.updateOne(
      { _id: id },
      {
        $set: {
          isFavorite,
        },
      },
    );

    const io = req.app.get("io");
    if (io) {
      emitEntryToPrivateAudience(io, entry.email, "entry:favorite-updated", {
        _id: req.params.id,
        isFavorite,
      });
    }

    return res.json({
      success: true,
      isFavorite,
    });
  } catch (err) {
    console.error("Favorite toggle error:", err);
    return next(err);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!req.cookies.email || !req.cookies.password) {
      return next(createHttpError(404, "Post not found"));
    }

    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return next(createHttpError(404, "Post not found"));
    }

    const collection = getCollection("anyInformation");
    const entry = await collection.findOne({ _id: new ObjectId(id) });

    if (!entry) {
      return next(createHttpError(404, "Post not found"));
    }

    const isAdmin = user.email === "admin@gmail.com" && user.password === "admin";
    const isOwner = entry.email === user.email;

    if (!isAdmin && !isOwner) {
      return next(createHttpError(404, "Post not found"));
    }

    const deleteData = await collection.deleteOne({ _id: new ObjectId(id) });

    const io = req.app.get("io");
    if (io) {
      emitEntryToAudiences({
        io,
        ownerEmail: entry.email,
        event: "entry:deleted",
        isPublic: entry.isPublic === true,
        payload: {
        _id: id,
        actionId: req.query.actionId || null,
        },
      });
    }

    return res.status(200).json({ deleteData });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

const deleteMasterUser = async (req, res, next) => {
  try {
    const id = req.params.id;

    const collection = getCollection("users");

    const userToDelete = await collection.findOne({ _id: new ObjectId(id) });
    const deletedUser = await collection.deleteOne({ _id: new ObjectId(id) });

    const io = req.app.get("io");
    if (io) {
      io.to("masters").to("admins").emit("user:deleted", {
        _id: id,
        email: userToDelete?.email || null,
        actionId: req.query.actionId || null,
      });
    }

    res.status(200).json({ message: "User deleted", deletedUser });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

// ==========================================
// PUBLIC CONTROLLERS
// ==========================================
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
    res.status(400).json({ success: false, message: "Invalid cursor" });
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

const getLandingPage = async (req, res, next) => {
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

const getEntryPage = async (req, res, next) => {
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

const getRobotsTxt = (req, res) => {
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

const getSitemapXml = async (req, res) => {
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

const getPublicEntries = async (req, res) => {
  try {
    const pagination = parsePagination(req, res);
    if (!pagination) return;

    const page = await getPagedPublicEntries(pagination.cursor, pagination.limit, pagination.sort);
    return sendPublicPage(res, page);
  } catch (err) {
    console.error("Public entries API error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const searchPublicEntriesController = async (req, res) => {
  try {
    const pagination = parsePagination(req, res);
    if (!pagination) return;

    const keyword = String(req.query.keyword || "").trim();
    const page = await searchPublicEntries(keyword, pagination.cursor, pagination.limit, pagination.sort);

    return sendPublicPage(res, page);
  } catch (err) {
    console.error("Public search API error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ==========================================
// ROUTES
// ==========================================
const requireObjectId = (req, res, next) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }

  return next();
};

const passInvalidIdToNotFound = (req, res, next) => {
  if (!ObjectId.isValid(req.params.id)) {
    return next("route");
  }

  return next();
};

const router = express.Router();

// Public routes
router.get("/explore", getLandingPage);
router.get("/robots.txt", getRobotsTxt);
router.get("/sitemap.xml", getSitemapXml);
router.get("/entry/:id", getEntryPage);
router.get("/api/public", getPublicEntries);
router.get("/api/public/search", searchPublicEntriesController);

// Auth routes
router.route("/").get(getHome).post(createPost);
router.route("/login").get(getLogin).post(postLogin);
router.route("/register").get(getRegister).post(postRegister);
router.get("/logout", logoutUser);
router.get("/add", getAddPage);
router.get("/api/entries", getEntriesPage);
router.post("/api/generate-title", generateTitle);
router.patch("/api/entries/:id/favorite", requireObjectId, toggleFavorite);
router.delete("/user/:id", requireObjectId, deleteMasterUser);
router.get("/update/:id", passInvalidIdToNotFound, getUpdatePage);
router
  .route("/:id")
  .get(passInvalidIdToNotFound, getCreatePost)
  .put(requireObjectId, updatePost)
  .delete(requireObjectId, deletePost);

app.use("/", router);

// Error handling
app.use(notFoundHandler(viewsPath));
app.use(errorHandler(viewsPath));

const server = http.createServer(app);
const io = new Server(server);

app.set("io", io);

const parseCookieHeader = (header = "") => {
  return String(header)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator === -1) return cookies;

      const key = part.slice(0, separator);
      const value = part.slice(separator + 1);

      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }

      return cookies;
    }, {});
};

io.use(async (socket, next) => {
  try {
    const cookies = parseCookieHeader(socket.handshake.headers.cookie || "");
    const page = socket.handshake.auth?.page || "public";

    socket.data.page = page;

    socket.join("public");

    if (!cookies.email || !cookies.password) {
      return next();
    }

    const user = await findUserByEmail(cookies.email);
    if (!user || user.password !== cookies.password) {
      return next();
    }

    socket.data.user = {
      email: user.email,
      isAdmin: user.email === "admin@gmail.com" && user.password === "admin",
      isMaster: user.email === "master@gmail.com" && user.password === "master",
    };

    socket.join(getUserRoom(user.email));

    if (socket.data.user.isAdmin) {
      socket.join("admins");
    }

    if (socket.data.user.isMaster) {
      socket.join("masters");
    }

    return next();
  } catch (err) {
    return next(err);
  }
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
