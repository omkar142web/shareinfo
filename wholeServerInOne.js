/* 
==========================================================================
BACKEND CONSOLIDATED SOURCE CODE
File: wholeServerInOne.js
Generated: Saturday, June 13, 2026
==========================================================================
*/

// ==========================================
// FILE: server.js
// ==========================================
import express from "express";
const app = express();
const PORT = 3000;

// ! middle wares..
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ! Cookie parser middleware
import cookieParser from "cookie-parser";
app.use(cookieParser());

// ! disable browser cache for dynamic pages
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  next();
});

// ! static pages
import Path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);
app.use(express.static(Path.join(__dirname, "public")));

// ! view engine setup
app.set("views", Path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ! Database connection..
import { connectDB, getCollection } from "./config/mongodb.js";
await connectDB();

// ! routes..
import authRoutes from "./routes/authRoutes.js";
app.use("/", authRoutes);

// ! error handling middleware
app.use((req, res) => {
  res.status(404).sendFile(Path.join(__dirname, "views", "404.html"));
});

app.use((err, req, res, next) => {
  console.error("Error occurred ❌:", err);
  res.status(500).sendFile(Path.join(__dirname, "views", "500.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});


// ==========================================
// FILE: structure.js
// ==========================================
const str = {
  _id: ObjectId,
  userId: ObjectId,
  title: "MongoDB Notes",
  slug: "mongodb-notes-ab12",
  blocks: [
    {
      id: "blk_1",
      type: "heading",
      content: {
        text: "MongoDB Basics",
        level: 1,
      },
      order: 1,
    },

    {
      id: "blk_2",
      type: "paragraph",
      content: {
        text: "MongoDB is a NoSQL database...",
      },
      order: 2,
    },

    {
      id: "blk_3",
      type: "code",
      content: {
        language: "javascript",
        code: "console.log('hello')",
      },
      order: 3,
    },

    {
      id: "blk_4",
      type: "link",
      content: {
        url: "https://mongodb.com",
        title: "MongoDB",
        description: "Official website",
        image: "",
      },
      order: 4,
    },
  ],

  tags: ["mongodb", "backend"],

  visibility: "public",
  // public | private | unlisted

  status: "published",
  // draft | published | archived

  stats: {
    views: 0,
    likes: 0,
    bookmarks: 0,
    shares: 0,
    comments: 0,
  },

  settings: {
    allowComments: true,
    allowCopy: true,
    showLineNumbers: true,
  },

  isDeleted: false,
  deletedAt: null,
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date,
};

const postSchema = {
  title: String,
  slug: { type: String, unique: true },
  // The magic happens here
  blocks: [
    {
      id: String, // Unique ID for frontend keys/reordering
      type: {
        type: String,
        enum: ["heading", "paragraph", "code", "link", "image"],
      },
      // Store all data in a single 'data' field or separate fields
      content: {
        text: String, // For headings/paragraphs
        level: Number, // For headings (h1, h2)
        code: String, // For code blocks
        language: String, // For syntax highlighting
        url: String, // For links
        linkTitle: String, // For link display text
      },
      order: Number, // Helpful for dragging/reordering
    },
  ],
  tags: [String],
  status: { type: String, default: "draft" },
};

const createBlock = (type, content = {}, order = 0) => ({
  id: crypto.randomUUID(),
  type,
  content,
  order,
});

const newPostFromForm = {
  title: "How to setup MongoDB",

  slug: "setup-mongodb-2026",

  description: "Beginner guide for setting up MongoDB in 2026",

  coverImage: "https://example.com/cover.png",

  author: {
    id: ObjectId("USER_ID"),
    name: "Omkar",
    username: "omkar",
    avatar: "https://example.com/avatar.png",
  },

  blocks: [
    // HEADING
    createBlock(
      "heading",
      {
        text: "MongoDB Installation Guide",
        level: 1, // h1 - h6
      },
      1,
    ),

    // PARAGRAPH
    createBlock(
      "paragraph",
      {
        text: "MongoDB is one of the most popular NoSQL databases.",
      },
      2,
    ),

    // CODE
    createBlock(
      "code",
      {
        language: "bash",
        code: "npm install mongodb",
        filename: "install.sh",
      },
      3,
    ),

    // IMAGE
    createBlock(
      "image",
      {
        url: "https://example.com/mongodb.png",
        alt: "MongoDB Image",
        caption: "MongoDB Dashboard",
        width: 1200,
        height: 700,
      },
      4,
    ),

    // VIDEO
    createBlock(
      "video",
      {
        url: "https://youtube.com/watch?v=example",
        provider: "youtube",
        title: "MongoDB Tutorial",
        thumbnail: "https://example.com/thumb.png",
      },
      5,
    ),

    // QUOTE
    createBlock(
      "quote",
      {
        text: "Data is a precious thing and will last longer than systems.",
        author: "Tim Berners-Lee",
      },
      6,
    ),

    // LIST
    createBlock(
      "list",
      {
        style: "unordered", // ordered | unordered
        items: ["Install MongoDB", "Create Database", "Connect Backend"],
      },
      7,
    ),

    // CHECKLIST
    createBlock(
      "checklist",
      {
        items: [
          {
            text: "Install Node.js",
            checked: true,
          },
          {
            text: "Install MongoDB",
            checked: false,
          },
        ],
      },
      8,
    ),

    // TABLE
    createBlock(
      "table",
      {
        headers: ["Feature", "Supported"],
        rows: [
          ["Authentication", "Yes"],
          ["Aggregation", "Yes"],
          ["Transactions", "Yes"],
        ],
      },
      9,
    ),

    // DIVIDER
    createBlock(
      "divider",
      {
        style: "solid", // solid | dashed | dotted
      },
      10,
    ),

    // LINK
    createBlock(
      "link",
      {
        url: "https://mongodb.com",
        title: "Official MongoDB Website",
        target: "_blank",
      },
      11,
    ),

    // EMBED
    createBlock(
      "embed",
      {
        url: "https://codesandbox.io/s/example",
        provider: "codesandbox",
        embedId: "example",
      },
      12,
    ),
  ],

  tags: ["mongodb", "backend", "database", "tutorial"],

  category: "Programming",

  status: "published", // draft | published | archived

  seo: {
    metaTitle: "How to setup MongoDB",
    metaDescription: "Complete MongoDB setup tutorial",
    keywords: ["mongodb", "database", "nosql"],
  },

  analytics: {
    views: 0,
    likes: 0,
    bookmarks: 0,
    shares: 0,
    readingTime: 5,
  },

  settings: {
    allowComments: true,
    isFeatured: false,
    visibility: "public", // public | private | unlisted
  },

  createdAt: new Date(),
  updatedAt: new Date(),

  publishedAt: new Date(),

  isDeleted: false,
};


// ==========================================
// FILE: config/mongodb.js
// ==========================================
import { MongoClient } from "mongodb";

const dbname = "contacts-api";
const URI = "mongodb+srv://userNameOP:17102006om@cluster0.05uptec.mongodb.net/";

if (!URI) {
  throw new Error("MONGO_URI is missing..");
}

let actuallDB;

async function createIndexes() {
  const infoCollection = actuallDB.collection("anyInformation");
  const usersCollection = actuallDB.collection("users");

  await Promise.all([
    infoCollection.createIndex({ email: 1, _id: -1 }),
    usersCollection.createIndex({ email: 1 }, { unique: true }),
  ]);

  console.log("Database indexes are ready");
}

export async function connectDB() {
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

export function getCollection(collectionName = "anyInformation") {
  if (!actuallDB) {
    throw new Error("Database not connected. Please call connectDB() first.");
  }

  return actuallDB.collection(collectionName);
}


// ==========================================
// FILE: controllers/authControllers.js
// ==========================================
import { ObjectId } from "mongodb";

import { getCollection } from "../config/mongodb.js";

// GET USER BY EMAIL and all..
import {
  findUserByEmail,
  createUser,
  getPagedUserData,
  getPagedAllData,
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

    let page;
    let isMaster = false;

    if (user.password === "admin") {
      page = await getPagedAllData(null, DEFAULT_PAGE_SIZE);
    } else if (user.password === "master") {
      page = await getPagedUsers(null, DEFAULT_PAGE_SIZE);
      isMaster = true;
    } else {
      page = await getPagedUserData(user.email, null, DEFAULT_PAGE_SIZE);
    }

    return res.render("allInfo", {
      data: page.items,
      initialCursor: page.nextCursor,
      hasMore: page.hasMore,
      totalCount: page.totalCount,
      ...(isMaster ? { isMaster: true } : {}),
    });
  } catch (err) {
    console.error("Home error ❌", err);
    res.status(500).send("Internal Server Error");
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
    if (cursor && !/^[a-f\d]{24}$/i.test(cursor)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cursor",
      });
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

    let page;
    if (user.password === "admin") {
      page = await getPagedAllData(cursor, limit);
    } else if (user.password === "master") {
      page = await getPagedUsers(cursor, limit);
    } else {
      page = await getPagedUserData(user.email, cursor, limit);
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
export const getLogin = async (req, res) => {
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
    res.status(500).send("Internal Server Error");
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
  res.redirect("/login");
};

//! getting CREATE POST
export const getCreatePost = async (req, res) => {
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
    res.status(500).send("Internal Server Error");
  }
};

//! CREATE POST
export const createPost = async (req, res) => {
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
    const addedData = await collection.insertOne({
      name,
      info,
      email: user.email, // trusted email from backend
    });

    return res.status(201).json({
      message: "Post created successfully",
      addedData,
    });
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).send("Internal Server Error");
  }
};

// export const getAddPage = async (req, res) => {
//   res.render("updateInformation", {
//     person: {},
//     title: "Add Info",
//     buttonText: "Add Info",
//   });
// };

export const getAddPage = async (req, res) => {
  const user = await findUserByEmail(req.cookies.email);

  res.render("updateInformation", {
    person: {
      email: user?.email || "",
    },
    title: "Add Info",
    buttonText: "Save Entry",
  });
};

export const getUpdatePage = async (req, res) => {
  const id = req.params.id;

  const collection = getCollection("anyInformation");

  const data = await collection.findOne({
    _id: new ObjectId(id),
  });

  res.render("updateInformation", {
    person: data,
    title: "Update Info",
    buttonText: "Update Entry",
  });
};

export const updatePost = async (req, res) => {
  try {
    const id = req.params.id;

    if (!req.cookies.email || !req.cookies.password) {
      return res.status(401).send("Unauthorized");
    }

    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.status(401).send("Unauthorized");
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
        },
      },
    );

    res.status(200).json({
      message: "Updated successfully",
      updatedData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Update failed");
  }
};

export const deletePost = async (req, res) => {
  const id = req.params.id;

  const collection = getCollection("anyInformation");

  const deleteData = await collection.deleteOne({
    _id: new ObjectId(id),
  });

  res.status(200).json({ deleteData });
};

export const deleteMasterUser = async (req, res) => {
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
    res.status(500).send("Delete failed");
  }
};


// ==========================================
// FILE: routes/authRoutes.js
// ==========================================
import express from "express";
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
} from "../controllers/authControllers.js";

const router = express.Router();

router.route("/").get(getHome).post(createPost);

router.route("/login").get(getLogin).post(postLogin);

router.route("/register").get(getRegister).post(postRegister);

router.get("/logout", logoutUser);

router.route("/add").get(getAddPage);
router.delete("/user/:id", deleteMasterUser);
router.route("/update/:id").get(getUpdatePage);
router.get("/api/entries", getEntriesPage);
router.route("/:id").get(getCreatePost).put(updatePost).delete(deletePost);

export default router;


// ==========================================
// FILE: services/auth.service.js
// ==========================================
import { ObjectId } from "mongodb";

import { getCollection } from "../config/mongodb.js";

const getPagedCollection = async ({
  collectionName = "anyInformation",
  cursor = null,
  filter = {},
  limit = 20,
}) => {
  const collection = getCollection(collectionName);
  const query = cursor
    ? { ...filter, _id: { $lt: new ObjectId(cursor) } }
    : filter;
  const [rawItems, totalCount] = await Promise.all([
    collection
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .toArray(),
    collection.countDocuments(filter),
  ]);
  const hasMore = rawItems.length > limit;
  const items = hasMore ? rawItems.slice(0, limit) : rawItems;
  const nextCursor =
    hasMore && items.length > 0
      ? items[items.length - 1]._id.toString()
      : null;

  return { items, nextCursor, hasMore, totalCount };
};

export const getPagedUserData = async (email, cursor, limit = 20) => {
  return getPagedCollection({
    cursor,
    filter: { email },
    limit,
  });
};

export const getPagedAllData = async (cursor, limit = 20) => {
  return getPagedCollection({ cursor, limit });
};

export const getPagedUsers = async (cursor, limit = 20) => {
  return getPagedCollection({
    collectionName: "users",
    cursor,
    limit,
  });
};

//! User repository functions
export const getUserData = async (email) => {
  return await getCollection().find({ email }).sort({ _id: -1 }).toArray();
};

export const getAllUsers = async () => {
  return await getCollection().find().sort({ _id: -1 }).toArray();
};

export const getAllUsersForMaster = async () => {
  return await getCollection('users').find().sort({ _id: -1 }).toArray();
};
//

// GET USER BY EMAIL
export const findUserByEmail = async (email) => {
  const collection = getCollection('users');
  return await collection.findOne({ email });
};

// CREATE USER
export const createUser = async (userData) => {
  const collection = getCollection('users');
  return await collection.insertOne(userData);
};

// UPDATE USER
export const updateUser = async (email, updateData) => {
  const collection = getCollection('users');
  return await collection.updateOne({ email }, { $set: updateData });
};

// DELETE USER
export const deleteUser = async (email) => {
  const collection = getCollection('users');
  return await collection.deleteOne({ email });
};
