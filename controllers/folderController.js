import { findUserByEmail } from "../services/auth.service.js";
import * as folderService from "../services/folderService.js";

function clearUserCookies(res) {
  ["name", "email", "password"].forEach((cookie) => {
    res.clearCookie(cookie);
  });
}

export const redirectFromFolderShortUrl = async (req, res) => {
  try {
    const { shortId } = req.params;
    if (!shortId || typeof shortId !== "string" || shortId.length > 20) {
      return res.redirect("/");
    }

    const folder = await folderService.findFolderByShortId(shortId);
    if (!folder) {
      return res.redirect("/");
    }

    return res.redirect(`/?folderId=${folder._id.toString()}`);
  } catch (err) {
    console.error("Folder short URL error:", err);
    return res.redirect("/");
  }
};

export const listFolders = async (req, res) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await findUserByEmail(req.cookies.email);
    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const folders = await folderService.listFolders(user.email);
    return res.json({ folders });
  } catch (err) {
    console.error("List folders error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const createFolder = async (req, res) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await findUserByEmail(req.cookies.email);
    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, color } = req.body;
    const folder = await folderService.createFolder(user.email, name, color || "blue");
    return res.status(201).json({ success: true, folder });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error("Create folder error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const renameFolder = async (req, res) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await findUserByEmail(req.cookies.email);
    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name } = req.body;
    const folder = await folderService.renameFolder(user.email, req.params.id, name);
    return res.json({ success: true, folder });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error("Rename folder error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const updateColor = async (req, res) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await findUserByEmail(req.cookies.email);
    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { color } = req.body;
    const folder = await folderService.updateColor(user.email, req.params.id, color);
    return res.json({ success: true, folder });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error("Update folder color error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteFolder = async (req, res) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await findUserByEmail(req.cookies.email);
    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await folderService.deleteFolder(user.email, req.params.id);
    return res.json({ success: true, ...result });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error("Delete folder error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const moveEntryToFolder = async (req, res) => {
  try {
    if (!req.cookies.email || !req.cookies.password) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await findUserByEmail(req.cookies.email);
    if (!user || user.password !== req.cookies.password) {
      clearUserCookies(res);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { folderId } = req.body;
    const entry = await folderService.moveEntryToFolder(user.email, req.params.id, folderId);
    return res.json({ success: true, entry });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error("Move entry to folder error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
