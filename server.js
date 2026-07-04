import express from "express";
import cookieParser from "cookie-parser";
import "dotenv/config";
import Path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/mongodb.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandlers.js";
import authRoutes from "./routes/authRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";

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

// ! error handling middleware
app.use(notFoundHandler(viewsPath));
app.use(errorHandler(viewsPath));

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
