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
