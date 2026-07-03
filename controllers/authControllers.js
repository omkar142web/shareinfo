import { ObjectId } from "mongodb";

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
export const getHome = async (req, res) => {
  if (req.cookies.email && req.cookies.password) {
    return res.redirect("/dashboard");
  }

  return res.redirect("/");
};

export const getDashboard = async (req, res, next) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.redirect("/login");
    }

    // ✅ service layer used
    const user = await findUserByEmail(req.cookies.email);

    if (!user) {
      clearUserCookies(res);
      return res.redirect("/login");
    }

    if (user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.redirect("/login");
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
    console.error("Dashboard error ❌", err);
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

    return res.redirect("/dashboard");
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

    return res.json({ success: true, redirect: "/dashboard" });
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

    return res.json({ success: true, redirect: "/dashboard" });
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

    const deletedUser = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    res.status(200).json({
      message: "User deleted",
      deletedUser,
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};
