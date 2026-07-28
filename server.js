import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import "dotenv/config";
import Path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/mongodb.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandlers.js";
import authRoutes from "./routes/authRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";
import { findUserByEmail } from "./services/auth.service.js";

const app = express();
const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);
const viewsPath = Path.join(__dirname, "views");

// ! middle wares..
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ! disable browser cache for dynamic pages
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  next();
});

// ! static pages
app.use(express.static(Path.join(__dirname, "public")));

// ! view engine setup
app.set("views", viewsPath);
app.set("view engine", "ejs");

// ! Database connection..
await connectDB();

// ! routes..
app.use("/", publicRoutes);
app.use("/", authRoutes);
app.use("/", folderRoutes);

// ! error handling middleware
app.use(notFoundHandler(viewsPath));
app.use(errorHandler(viewsPath));

// ! http server + socket.io
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

const userRoom = (email = "") => `user:${String(email).toLowerCase()}`;

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

    socket.join(userRoom(user.email));

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
