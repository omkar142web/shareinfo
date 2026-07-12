import "dotenv/config";
import { ObjectId } from "mongodb";
import OpenAI from "openai";

import { getCollection } from "../config/mongodb.js";
import { createHttpError } from "../middleware/errorHandlers.js";

// GET USER BY EMAIL and all..
import {
  findUserByEmail,
  createUser,
  getPagedUserData,
  getPagedUserDataWithVisibility,
  getPagedAllData,
  getPagedAllDataWithVisibility,
  getPagedUsers,
} from "../services/auth.service.js";

import { getLandingPage } from "./publicController.js";

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

    const visibility = ["public", "private"].includes(req.query.visibility)
      ? req.query.visibility
      : "all";

    const keyword = req.query.keyword ? String(req.query.keyword).trim() : "";
    const sort = ["updated", "created"].includes(req.query.sort)
      ? req.query.sort
      : "updated";

    let page;
    let isMaster = false;

    if (user.password === "admin" && user.email === "admin@gmail.com") {
      page = await getPagedAllDataWithVisibility(
        null,
        DEFAULT_PAGE_SIZE,
        visibility,
        keyword,
        sort,
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
      );
    }

    return res.render("allInfo", {
      data: page.items,
      initialCursor: page.nextCursor,
      hasMore: page.hasMore,
      totalCount: page.totalCount,
      activeVisibility: visibility,
      activeKeyword: keyword,
      activeSort: sort,
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

    const visibility = ["public", "private"].includes(req.query.visibility)
      ? req.query.visibility
      : "all";

    const keyword = req.query.keyword ? String(req.query.keyword).trim() : "";
    const sort = ["updated", "created"].includes(req.query.sort)
      ? req.query.sort
      : "updated";

    let page;
    if (user.password === "admin" && user.email === "admin@gmail.com") {
      page = await getPagedAllDataWithVisibility(cursor, limit, visibility, keyword, sort);
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
      );
    }

    return res.json({
      items: page.items.map((item) => ({
        ...item,
        _id: item._id.toString(),
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
    const addedData = await collection.insertOne({
      name,
      info,
      isPublic: req.body.isPublic === true,
      ownerName: user.name,
      createdAt: now,
      updatedAt: now,
      email: user.email, // trusted email from backend
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("entry:created", {
        _id: addedData.insertedId,
        name,
        info,
        isPublic: req.body.isPublic === true,
        ownerName: user.name,
        email: user.email,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        actionId: req.body.actionId || null,
      });
    }

    return res.status(201).json({
      message: "Post created successfully",
      addedData,
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

    return res.render("updateInformation", {
      person: {
        // email: user?.email || "",
        email: user.email,
      },
      title: "Add Info",
      buttonText: "Save Entry",
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

    const data = await collection.findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!data) {
      return next(createHttpError(404, "Post not found"));
    }

    const isAdmin =
      user.email === "admin@gmail.com" && user.password === "admin";

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

    const updatedData = await collection.updateOne(
      {
        _id: new ObjectId(id),
        // email: user.email, // ownership protection (but not needed, cant update using admin or master account)
      },
      {
        $set: {
          name,
          info,
          isPublic: req.body.isPublic === true,
          updatedAt: new Date(),
        },
      },
    );

    const io = req.app.get("io");
    if (io) {
      io.emit("entry:updated", {
        _id: id,
        name,
        info,
        isPublic: req.body.isPublic === true,
        updatedAt: new Date().toISOString(),
        actionId: req.body.actionId || null,
      });
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

export const deletePost = async (req, res, next) => {
  try {
    const id = req.params.id;

    const collection = getCollection("anyInformation");

    const deleteData = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("entry:deleted", {
        _id: id,
        actionId: req.query.actionId || null,
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
      io.emit("user:deleted", {
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
