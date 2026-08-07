import "dotenv/config";
import { ObjectId } from "mongodb";
import OpenAI from "openai";

import { getCollection } from "../config/mongodb.js";
import { createHttpError } from "../middleware/errorHandlers.js";

//! GET USER BY EMAIL and all..
import {
  findUserByEmail,
  createUser,
  getPagedUserData,
  getPagedUserDataWithVisibility,
  getPagedAllData,
  getPagedAllDataWithVisibility,
  getPagedUsers,
  findEntryByShortId,
  setShortIdForEntry,
} from "../services/auth.service.js";

import { getLandingPage } from "./publicController.js";
import { renderMarkdown } from "../services/markdown.service.js";
import { listFolders, setShortIdForFolder, findFolderByShortId } from "../services/folderService.js";

import Path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

//! Reusable views directory path
const viewsPath = Path.join(__dirname, "..", "views");

//! COOKIES
const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 1000 * 60 * 60 * 24 * 30,
};
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const getUserRoom = (email = "") => `user:${String(email).toLowerCase()}`;

const emitEntryToPrivateAudience = (io, ownerEmail, event, payload) => {
  io.to(getUserRoom(ownerEmail)).to("admins").emit(event, payload);
};

const emitEntryToAudiences = ({
  io,
  ownerEmail,
  event,
  payload,
  isPublic = false,
}) => {
  io.to(getUserRoom(ownerEmail)).to("admins").emit(event, payload);

  if (isPublic) {
    io.to("public").emit(event, payload);
  }
};

const groq = process.env.GROQ_API_KEY
  ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" })
  : null;

const setUserCookies = (res, user) => {
  const cookies = {
    name: user.name,
    email: user.email,
    password: user.password,
  };

  Object.entries(cookies).forEach(([key, value]) => {
    res.cookie(key, value, COOKIE_OPTIONS);
  });
};

function clearUserCookies(res) {
  ["name", "email", "password"].forEach((cookie) => {
    res.clearCookie(cookie);
  });
}

//! HOME
/**
 * Resolves a folderId that may be either a MongoDB ObjectId or a shortId.
 * Returns the ObjectId string on success, or null if it cannot be resolved.
 */
const resolveFolderId = async (rawFolderId) => {
  if (!rawFolderId || typeof rawFolderId !== "string") return null;
  if (ObjectId.isValid(rawFolderId)) return rawFolderId;
  const folder = await findFolderByShortId(rawFolderId);
  return folder ? folder._id.toString() : null;
};

export const getHome = async (req, res, next) => {
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

    const rawFolderId = req.query.folderId;
    const folderId = await resolveFolderId(rawFolderId);

    let page;
    let isMaster = false;

    if (user.password === "admin" && user.email === "admin@gmail.com") {
      page = await getPagedAllDataWithVisibility(
        null,
        DEFAULT_PAGE_SIZE,
        visibility,
        keyword,
        sort,
        folderId,
      );
    } else if (
      user.password === "master" &&
      user.email === "master@gmail.com"
    ) {
      page = await getPagedUsers(null, DEFAULT_PAGE_SIZE, keyword, sort);
      isMaster = true;
    } else {
      page = await getPagedUserDataWithVisibility(
        user.email,
        null,
        DEFAULT_PAGE_SIZE,
        visibility,
        keyword,
        sort,
        folderId,
      );
    }

    // Fetch folders with counts for dropdown (not for master users)
    let foldersWithCounts = [];
    let activeFolderName = null;
    let activeFolderColor = null;

    if (!isMaster) {
      const folders = await getCollection("folders")
        .find({ email: user.email })
        .sort({ name: 1 })
        .toArray();

      if (folders.length > 0) {
        const foldersWithoutShortId = folders.filter((f) => !f.shortId);
        for (const folder of foldersWithoutShortId) {
          try {
            const shortId = await setShortIdForFolder(folder._id.toString());
            folder.shortId = shortId;
          } catch (err) {
            console.error("Failed to generate shortId for folder:", folder._id, err);
          }
        }

        const folderIds = folders.map((f) => f._id);
        const counts = await getCollection("anyInformation")
          .aggregate([
            { $match: { folderId: { $in: folderIds } } },
            { $group: { _id: "$folderId", count: { $sum: 1 } } },
          ])
          .toArray();
        const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
        foldersWithCounts = folders.map((f) => ({
          ...f,
          entryCount: countMap.get(f._id.toString()) || 0,
        }));
      }

      if (folderId) {
        const activeFolder = foldersWithCounts.find(
          (f) => f._id.toString() === folderId
        );
        if (activeFolder) {
          activeFolderName = activeFolder.name;
          activeFolderColor = activeFolder.color;
        }
      }
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
      activeFolderId: folderId,
      activeFolderName,
      activeFolderColor,
      folders: foldersWithCounts,
      ...(isMaster ? { isMaster: true } : {}),
    });
  } catch (err) {
    console.error("Home error ❌", err);
    return next(err);
  }
};

export const getEntriesPage = async (req, res) => {
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

    const cursor = req.query.cursor ? String(req.query.cursor) : null;
    if (cursor) {
      const isComposite = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z_[a-f\d]{24}$/i.test(cursor);
      if (!isComposite) {
        return res.status(400).json({
          success: false,
          message: "Invalid cursor",
        });
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

    const rawFolderId = req.query.folderId;
    const folderId = await resolveFolderId(rawFolderId);

    let page;
    if (user.password === "admin" && user.email === "admin@gmail.com") {
      page = await getPagedAllDataWithVisibility(cursor, limit, visibility, keyword, sort, folderId);
    } else if (
      user.password === "master" &&
      user.email === "master@gmail.com"
    ) {
      page = await getPagedUsers(cursor, limit, keyword, sort);
    } else {
      page = await getPagedUserDataWithVisibility(
        user.email,
        cursor,
        limit,
        visibility,
        keyword,
        sort,
        folderId,
      );
    }

    return res.json({
      items: page.items.map((item) => ({
        ...item,
        _id: item._id.toString(),
        shortId: item.shortId || null,
      })),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      totalCount: page.totalCount,
    });
  } catch (err) {
    console.error("Entries page error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const generateTitle = async (req, res) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    const user = await findUserByEmail(req.cookies.email);
    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.status(401).json({
        success: false,
        message: "Please login again.",
      });
    }

    const content = String(req.body.content || "").trim();
    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Add content first before using AI.",
      });
    }

    if (!process.env.GEMINI_API_KEY && !groq) {
      return res.status(500).json({
        success: false,
        message: "No AI API key configured. Set GEMINI_API_KEY or GROQ_API_KEY.",
      });
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

• Plain text → summarize the main topic.
• Source code → identify what the code does or represents.
• HTML/CSS/JavaScript → describe the page, component, or functionality.
• SVG → identify the icon, logo, or illustration if possible.
• JSON → describe the represented data.
• SQL → identify the query purpose.
• Logs or stack traces → identify the error or system.
• URLs → infer the website or resource when possible.
• Markdown → identify the document's topic.
• Configuration files → describe the software or purpose.

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
      return res.status(500).json({
        success: false,
        message: "Unable to generate title right now.",
      });
    }

    return res.json({
      success: true,
      title,
    });
  } catch (err) {
    console.error("AI title generation error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to generate title right now.",
    });
  }
};

//! LOGIN GET
export const getLogin = async (req, res, next) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.render("login");
    }

    // ✅ service layer used
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

//! LOGIN POST
export const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // ✅ service layer used
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No account found with that email. Please register first.",
        field: "email",
      });
    }

    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Please try again.",
        field: "password",
      });
    }

    setUserCookies(res, user);

    return res.json({ success: true, redirect: "/" });
  } catch (err) {
    console.error("Login POST error ❌", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

//! REGISTER GET
export const getRegister = (req, res) => {
  res.render("register");
};

//! REGISTER POST
export const postRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    console.log(name, email);

    // ✅ service layer used
    const existingUser = await findUserByEmail(email);
    console.log(existingUser);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Try logging in.",
        field: "email",
      });
    }

    // ✅ service layer used
    await createUser(req.body);

    console.log(req.body);
    setUserCookies(res, { name, email, password });

    return res.json({ success: true, redirect: "/" });
  } catch (err) {
    console.error("Register POST error ❌", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

//! LOGOUT
export const logoutUser = (req, res) => {
  clearUserCookies(res);
  res.redirect("/");
};

//! getting CREATE POST
export const getCreatePost = async (req, res, next) => {
  if (!req.cookies.email || !req.cookies.password) {
    return res.redirect("/login");
  }

  try {
    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.redirect("/login");
    }

    const folders = await listFolders(user.email);
    const isAdmin =
      user.email === "admin@gmail.com" && user.password === "admin";

    return res.render("updateInformation", {
      person: {},
      title: "Create Post",
      buttonText: "Create Post",
      folders,
      activeFolderId: null,
      activeFolderName: null,
      activeFolderColor: null,
      isAdmin,
    });
  } catch (err) {
    console.error("Error fetching user in getCreatePost:", err);
    return next(err);
  }
};

//! CREATE POST
export const createPost = async (req, res, next) => {
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

    const isAdmin =
      user.email === "admin@gmail.com" && user.password === "admin";
    let ownerEmail = user.email;
    let ownerName = user.name;

    if (isAdmin && typeof req.body.email === "string") {
      const trimmedEmail = req.body.email.trim();
      if (trimmedEmail && trimmedEmail !== user.email) {
        const targetUser = await findUserByEmail(trimmedEmail);
        if (!targetUser) {
          return res.status(400).json({
            success: false,
            message: "No user found with that email.",
          });
        }
        ownerEmail = targetUser.email;
        ownerName = targetUser.name;
      }
    }

    let entryFolderId = null;
    let entryFolderName = null;
    let entryFolderColor = null;

    if (req.body.folderId && ObjectId.isValid(req.body.folderId)) {
      entryFolderId = new ObjectId(req.body.folderId);
      const folder = await getCollection("folders").findOne({ _id: entryFolderId });
      if (folder) {
        entryFolderName = folder.name;
        entryFolderColor = folder.color;
      }
    }

    const addedData = await collection.insertOne({
      name,
      info,
      isPublic: req.body.isPublic === true,
      isFavorite: false,
      folderId: entryFolderId,
      folderName: entryFolderName,
      folderColor: entryFolderColor,
      ownerName,
      createdAt: now,
      updatedAt: now,
      email: ownerEmail,
    });

    const newId = addedData.insertedId.toString();
    const shortId = await setShortIdForEntry(newId);

    const io = req.app.get("io");
    if (io) {
      emitEntryToAudiences({
        io,
        ownerEmail,
        event: "entry:created",
        isPublic: req.body.isPublic === true,
        payload: {
          _id: newId,
          shortId,
          name,
          info,
          isPublic: req.body.isPublic === true,
          isFavorite: false,
          ownerName,
          email: ownerEmail,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          actionId: req.body.actionId || null,
        },
      });
    }

    return res.status(201).json({
      message: "Post created successfully",
      addedData: {
        ...addedData,
        insertedId: newId,
        shortId,
      },
    });
  } catch (err) {
    console.error("Error creating post:", err);
    return next(err);
  }
};

// export const getAddPage = async (req, res) => {
//   res.render("updateInformation", {
//     person: {},
//     title: "Add Info",
//     buttonText: "Add Info",
//   });
// };

export const getAddPage = async (req, res, next) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.redirect("/login");
    }

    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.redirect("/login");
    }

    const folders = await listFolders(user.email);
    const isAdmin =
      user.email === "admin@gmail.com" && user.password === "admin";

    const queryFolderId = req.query.folderId && ObjectId.isValid(req.query.folderId)
      ? req.query.folderId
      : null;

    let activeFolderName = null;
    let activeFolderColor = null;
    if (queryFolderId) {
      const f = folders.find((fo) => fo._id.toString() === queryFolderId);
      if (f) {
        activeFolderName = f.name;
        activeFolderColor = f.color;
      }
    }

    return res.render("updateInformation", {
      person: {
        email: user.email,
      },
      title: "Add Info",
      buttonText: "Save Entry",
      folders,
      activeFolderId: queryFolderId,
      activeFolderName,
      activeFolderColor,
      isAdmin,
    });
  } catch (err) {
    console.error("Add page error:", err);
    return next(err);
  }
};

// export const getUpdatePage = async (req, res) => {
//   const id = req.params.id;

//   const collection = getCollection("anyInformation");

//   const data = await collection.findOne({
//     _id: new ObjectId(id),
//   });

//   res.render("updateInformation", {
//     person: data,
//     title: "Update Info",
//     buttonText: "Update Entry",
//   });
// };

export const getUpdatePage = async (req, res, next) => {
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

    let data;
    const { id } = req.params;
    if (ObjectId.isValid(id)) {
      data = await collection.findOne({
        _id: new ObjectId(id),
      });
    } else if (typeof id === "string" && id.length <= 20) {
      data = await findEntryByShortId(id);
    }

    if (!data) {
      return next(createHttpError(404, "Post not found"));
    }

    const isAdmin =
      user.email === "admin@gmail.com" && user.password === "admin";

    const isOwner = data.email === user.email;

    if (!isAdmin && !isOwner) {
      return next(createHttpError(404, "Post not found"));
    }

    const folders = await listFolders(user.email);

    return res.render("updateInformation", {
      person: data,
      title: "Update Info",
      buttonText: "Update Entry",
      folders,
      activeFolderId: data.folderId ? data.folderId.toString() : null,
      activeFolderName: data.folderName || null,
      activeFolderColor: data.folderColor || null,
      isAdmin,
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

export const updatePost = async (req, res, next) => {
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

    const isAdmin =
      user.email === "admin@gmail.com" && user.password === "admin";
    const isOwner = existingEntry.email === user.email;

    if (!isAdmin && !isOwner) {
      return next(createHttpError(404, "Post not found"));
    }

    let entryEmail = existingEntry.email;
    let entryOwnerName = existingEntry.ownerName;

    if (isAdmin && typeof req.body.email === "string") {
      const trimmedEmail = req.body.email.trim();
      if (trimmedEmail && trimmedEmail !== existingEntry.email) {
        const targetUser = await findUserByEmail(trimmedEmail);
        if (!targetUser) {
          return res.status(400).json({
            success: false,
            message: "No user found with that email.",
          });
        }
        entryEmail = targetUser.email;
        entryOwnerName = targetUser.name;
      }
    }

    let entryFolderId = existingEntry.folderId || null;
    let entryFolderName = existingEntry.folderName || null;
    let entryFolderColor = existingEntry.folderColor || null;

    if (req.body.folderId === null || req.body.folderId === '') {
      entryFolderId = null;
      entryFolderName = null;
      entryFolderColor = null;
    } else if (req.body.folderId && ObjectId.isValid(req.body.folderId)) {
      entryFolderId = new ObjectId(req.body.folderId);
      const foldersCol = getCollection('folders');
      const folderDoc = await foldersCol.findOne({ _id: new ObjectId(req.body.folderId), email: user.email });
      if (folderDoc) {
        entryFolderName = folderDoc.name;
        entryFolderColor = folderDoc.color || 'blue';
      }
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
          folderId: entryFolderId,
          folderName: entryFolderName,
          folderColor: entryFolderColor,
          email: entryEmail,
          ownerName: entryOwnerName,
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
        email: entryEmail,
        ownerName: entryOwnerName,
        folderId: entryFolderId ? entryFolderId.toString() : null,
        folderName: entryFolderName,
        folderColor: entryFolderColor,
        updatedAt: now.toISOString(),
        actionId: req.body.actionId || null,
      };

      if (entryEmail !== existingEntry.email) {
        io.to(getUserRoom(existingEntry.email)).emit("entry:deleted", {
          _id: id,
          actionId: req.body.actionId || null,
        });
      }

      emitEntryToPrivateAudience(io, entryEmail, "entry:updated", payload);

      if (nowPublic) {
        io.to("public").emit("entry:updated", payload);
      } else if (wasPublic) {
        const ownerRoom = getUserRoom(entryEmail);
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

    res.status(200).json({
      message: "Updated successfully",
      updatedData,
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

export const toggleFavorite = async (req, res, next) => {
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

export const deletePost = async (req, res, next) => {
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

    const isAdmin =
      user.email === "admin@gmail.com" && user.password === "admin";
    const isOwner = entry.email === user.email;

    if (!isAdmin && !isOwner) {
      return next(createHttpError(404, "Post not found"));
    }

    const deleteData = await collection.deleteOne({
      _id: new ObjectId(id),
    });

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

export const deleteMasterUser = async (req, res, next) => {
  try {
    const id = req.params.id;

    const collection = getCollection("users");

    const userToDelete = await collection.findOne({ _id: new ObjectId(id) });

    const deletedUser = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    const io = req.app.get("io");
    if (io) {
      io.to("masters").to("admins").emit("user:deleted", {
        _id: id,
        email: userToDelete?.email || null,
        actionId: req.query.actionId || null,
      });
    }

    res.status(200).json({
      message: "User deleted",
      deletedUser,
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};
