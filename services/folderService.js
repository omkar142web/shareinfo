import { ObjectId } from "mongodb";
import { getCollection } from "../config/mongodb.js";

const VALID_COLORS = new Set(["blue", "purple", "green", "red", "orange", "pink"]);

export const listFolders = async (email) => {
  const folders = await getCollection("folders")
    .find({ email })
    .sort({ name: 1 })
    .toArray();

  if (folders.length === 0) return [];

  const folderIds = folders.map((f) => f._id);
  const counts = await getCollection("anyInformation")
    .aggregate([
      { $match: { folderId: { $in: folderIds } } },
      { $group: { _id: "$folderId", count: { $sum: 1 } } },
    ])
    .toArray();

  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  return folders.map((f) => ({
    _id: f._id,
    name: f.name,
    color: f.color,
    entryCount: countMap.get(f._id.toString()) || 0,
    createdAt: f.createdAt,
  }));
};

export const createFolder = async (email, name, color) => {
  const trimmed = (name || "").trim();
  if (!trimmed || trimmed.length > 255) {
    throw { statusCode: 400, message: "Folder name must be 1-255 characters." };
  }
  if (!VALID_COLORS.has(color)) {
    throw { statusCode: 400, message: "Invalid color." };
  }

  const existing = await getCollection("folders").findOne({ email, name: trimmed });
  if (existing) {
    throw { statusCode: 409, message: "A folder with this name already exists." };
  }

  const folder = { email, name: trimmed, color, createdAt: new Date() };
  const result = await getCollection("folders").insertOne(folder);
  return { ...folder, _id: result.insertedId };
};

export const renameFolder = async (email, folderId, name) => {
  if (!ObjectId.isValid(folderId)) {
    throw { statusCode: 400, message: "Invalid folder ID." };
  }

  const folder = await getCollection("folders").findOne({
    _id: new ObjectId(folderId),
    email,
  });
  if (!folder) {
    throw { statusCode: 404, message: "Folder not found." };
  }

  const trimmed = (name || "").trim();
  if (!trimmed || trimmed.length > 255) {
    throw { statusCode: 400, message: "Folder name must be 1-255 characters." };
  }

  const duplicate = await getCollection("folders").findOne({
    email,
    name: trimmed,
    _id: { $ne: new ObjectId(folderId) },
  });
  if (duplicate) {
    throw { statusCode: 409, message: "A folder with this name already exists." };
  }

  await getCollection("folders").updateOne(
    { _id: new ObjectId(folderId) },
    { $set: { name: trimmed } }
  );

  await getCollection("anyInformation").updateMany(
    { folderId: new ObjectId(folderId) },
    { $set: { folderName: trimmed } }
  );

  return { _id: folderId, name: trimmed, color: folder.color };
};

export const updateColor = async (email, folderId, color) => {
  if (!VALID_COLORS.has(color)) {
    throw { statusCode: 400, message: "Invalid color." };
  }
  if (!ObjectId.isValid(folderId)) {
    throw { statusCode: 400, message: "Invalid folder ID." };
  }

  const folder = await getCollection("folders").findOne({
    _id: new ObjectId(folderId),
    email,
  });
  if (!folder) {
    throw { statusCode: 404, message: "Folder not found." };
  }

  await getCollection("folders").updateOne(
    { _id: new ObjectId(folderId) },
    { $set: { color } }
  );

  await getCollection("anyInformation").updateMany(
    { folderId: new ObjectId(folderId) },
    { $set: { folderColor: color } }
  );

  return { _id: folderId, name: folder.name, color };
};

export const deleteFolder = async (email, folderId) => {
  if (!ObjectId.isValid(folderId)) {
    throw { statusCode: 400, message: "Invalid folder ID." };
  }

  const folder = await getCollection("folders").findOne({
    _id: new ObjectId(folderId),
    email,
  });
  if (!folder) {
    throw { statusCode: 404, message: "Folder not found." };
  }

  const result = await getCollection("anyInformation").updateMany(
    { folderId: new ObjectId(folderId) },
    { $set: { folderId: null, folderName: null, folderColor: null } }
  );

  await getCollection("folders").deleteOne({ _id: new ObjectId(folderId) });

  return { deletedFolderId: folderId, orphanedEntries: result.modifiedCount };
};

export const moveEntryToFolder = async (email, entryId, folderId) => {
  if (!ObjectId.isValid(entryId)) {
    throw { statusCode: 400, message: "Invalid entry ID." };
  }

  const entry = await getCollection("anyInformation").findOne({
    _id: new ObjectId(entryId),
    email,
  });
  if (!entry) {
    throw { statusCode: 404, message: "Entry not found." };
  }

  let folderName = null;
  let folderColor = null;
  let resolvedFolderId = null;

  if (folderId && ObjectId.isValid(folderId)) {
    const folder = await getCollection("folders").findOne({
      _id: new ObjectId(folderId),
      email,
    });
    if (!folder) {
      throw { statusCode: 404, message: "Folder not found." };
    }
    resolvedFolderId = folder._id;
    folderName = folder.name;
    folderColor = folder.color;
  }

  await getCollection("anyInformation").updateOne(
    { _id: new ObjectId(entryId) },
    { $set: { folderId: resolvedFolderId, folderName, folderColor } }
  );

  return {
    _id: entryId,
    folderId: resolvedFolderId ? resolvedFolderId.toString() : null,
    folderName,
    folderColor,
  };
};
