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
      //   return res.sendFile(Path.join(viewsPath , '404.html'));
      return res.send(
        `Welcome guest! Please <a href="/login">login</a> or <a href="/register">register</a>.`,
      );
    }

    // ✅ service layer used
    const user = await findUserByEmail(req.cookies.email);

    if (!user) {
      clearUserCookies(res);
      return res.send(`User not found. <a href="/register">Register</a>`);
    }

    if (user.password === req.cookies.password) {
      const getOneUserData = await getUserData(user.email);
      //   const collectionData = await getCollection().find({}).toArray();
      const getAllUsersData = await getAllUsers();
      console.log("All data from DB:", getOneUserData);
      if (user.password === "admin") {
        // return res.send(`
        //   <h1>Welcome Admin, ${user.name} 👑</h1>
        //   <p>Email: ${user.email}</p>
        //   <a href="/logout">Logout</a>
        //   <p>Here is all your data from the database:</p>
        //   <pre>${JSON.stringify(getAllUsersData, null, 2)}</pre>
        // `);

        return res.render("allInfo", { data: getAllUsersData });
      }
      // return res.send(`
      //   <h1>Welcome back, ${user.name} 👋</h1>
      //   <p>Email: ${user.email}</p>
      //   <a href="/logout">Logout</a>
      //   <p>Here is all your data from the database:</p>
      //   <pre>${JSON.stringify(getOneUserData, null, 2)}</pre>
      // `);

      return res.render("allInfo", { data: getOneUserData });
    }

    clearUserCookies(res);

    return res.send(`Invalid credentials. <a href="/login">Login</a>`);
  } catch (err) {
    console.error("Home error ❌", err);
    res.status(500).send("Internal Server Error");
  }
};

//! LOGIN GET
export const getLogin = async (req, res) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.sendFile(Path.join(viewsPath, "login.html"));
    }

    // ✅ service layer used
    const user = await findUserByEmail(req.cookies.email);

    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);

      return res.sendFile(Path.join(viewsPath, "login.html"));
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

    // ✅ service layer used
    const user = await findUserByEmail(email);

    if (!user) {
      return res.send(`User not found! <a href="/register">Register</a>`);
    }

    if (user.password !== password) {
      return res.send(`Wrong password! <a href="/login">Try again</a>`);
    }

    setUserCookies(res, user);

    return res.redirect("/");
  } catch (err) {
    console.error("Login POST error ❌", err);
    res.status(500).send("Internal Server Error");
  }
};

//! REGISTER GET
export const getRegister = (req, res) => {
  res.sendFile(Path.join(viewsPath, "register.html"));
};

//! REGISTER POST
export const postRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log(name, email);

    // ✅ service layer used
    const existingUser = await findUserByEmail(email);
    console.log(existingUser);

    if (existingUser) {
      return res.send(`Email already exists! <a href="/login">Login</a>`);
    }

    // ✅ service layer used
    await createUser(req.body);

    console.log(req.body);
    setUserCookies(res, { name, email, password });

    return res.redirect("/");
  } catch (err) {
    console.error("Register POST error ❌", err);
    res.status(500).send("Internal Server Error");
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

    const addedData = await collection.insertOne(req.body);

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

    const collection = getCollection("anyInformation");

    const updatedData = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: req.body },
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
