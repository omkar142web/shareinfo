import { ObjectId } from "mongodb";

import { getCollection } from "../config/mongodb.js";

// GET USER BY EMAIL and all..
import {
  findUserByEmail,
  createUser,
  deleteUser,
  updateUser,
  getAllUsers,
  getUserData,
  getAllUsersForMaster,
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

    if (user.password === req.cookies.password) {
      const getOneUserData = await getUserData(user.email);
      const getAllUsersData = await getAllUsers();
      console.log("All data from DB:", getOneUserData);

      if (user.password === "admin") {
        return res.render("allInfo", { data: getAllUsersData });
      } else if (user.password === "master") {
        const getAllUserLoginData = await getAllUsersForMaster();
        return res.render("allInfo", {
          data: getAllUserLoginData,
          isMaster: true,
        });
      }

      return res.render("allInfo", { data: getOneUserData });
    }

    clearUserCookies(res);
    return res.redirect("/login");
  } catch (err) {
    console.error("Home error ❌", err);
    res.status(500).send("Internal Server Error");
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
