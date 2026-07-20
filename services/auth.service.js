import { ObjectId } from "mongodb";

import { getCollection } from "../config/mongodb.js";

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const SORT_OPTIONS = new Set(["updated", "created"]);

const normalizeSort = (sort = "updated") => {
  return SORT_OPTIONS.has(sort) ? sort : "updated";
};

const getEntrySortDate = (entry, sort) => {
  const field = normalizeSort(sort) === "created" ? "createdAt" : "updatedAt";
  return entry[field] || entry.createdAt || entry._id?.getTimestamp?.() || new Date(0);
};

const encodeCursor = (entry, sort) => {
  if (!entry?._id) return null;

  return `${getEntrySortDate(entry, sort).toISOString()}_${entry._id.toString()}`;
};

const decodeCursor = (cursor) => {
  const [dateValue, id] = String(cursor || "").split("_");
  const date = new Date(dateValue);

  if (!dateValue || Number.isNaN(date.getTime()) || !ObjectId.isValid(id)) {
    return null;
  }

  return { date, id: new ObjectId(id) };
};

const getSortQuery = (cursor) => {
  const parsedCursor = decodeCursor(cursor);
  if (!parsedCursor) return {};

  return {
    $or: [
      { sortDate: { $lt: parsedCursor.date } },
      { sortDate: parsedCursor.date, _id: { $lt: parsedCursor.id } },
    ],
  };
};

const getSortDateExpression = (sort) => {
  if (normalizeSort(sort) === "created") {
    return { $ifNull: ["$createdAt", { $toDate: "$_id" }] };
  }

  return {
    $ifNull: ["$updatedAt", { $ifNull: ["$createdAt", { $toDate: "$_id" }] }],
  };
};

const getPagedCollection = async ({
  collectionName = "anyInformation",
  cursor = null,
  filter = {},
  limit = 20,
  search = "",
  sort = "updated",
  searchFields = ["name", "info"],
}) => {
  const collection = getCollection(collectionName);
  const trimmedSearch = String(search || "").trim();
  const normalizedSort = normalizeSort(sort);

  const queryFilter = { ...filter };
  const regex = trimmedSearch ? new RegExp(escapeRegex(trimmedSearch), "i") : null;
  const searchFilter = regex
    ? { $or: searchFields.map((field) => ({ [field]: regex })) }
    : null;
  const baseFilter = searchFilter
    ? { $and: [queryFilter, searchFilter] }
    : queryFilter;

  const cursorQuery = getSortQuery(cursor);

  const pipeline = [
    { $match: baseFilter },
    { $addFields: { sortDate: getSortDateExpression(normalizedSort) } },
  ];

  if (Object.keys(cursorQuery).length > 0) {
    pipeline.push({ $match: cursorQuery });
  }

  pipeline.push(
    { $sort: { sortDate: -1, _id: -1 } },
    { $limit: limit + 1 },
    { $project: { sortDate: 0 } },
  );

  const [rawItems, totalCount] = await Promise.all([
    collection.aggregate(pipeline).toArray(),
    collection.countDocuments(baseFilter),
  ]);
  const hasMore = rawItems.length > limit;
  const items = hasMore ? rawItems.slice(0, limit) : rawItems;
  const nextCursor =
    hasMore && items.length > 0 ? encodeCursor(items[items.length - 1], normalizedSort) : null;

  return { items, nextCursor, hasMore, totalCount };
};

export { getPagedCollection };

export const getPagedUserData = async (email, cursor, limit = 20) => {
  return getPagedCollection({
    cursor,
    filter: { email },
    limit,
  });
};

export const getPagedUserDataWithVisibility = async (
  email,
  cursor,
  limit = 20,
  visibility = "all",
  search = "",
  sort = "updated",
) => {
  const filter = { email };

  if (visibility === "favorite") {
    filter.isFavorite = true;
  } else if (visibility === "public") {
    filter.isPublic = true;
  } else if (visibility === "private") {
    filter.isPublic = { $ne: true };
  }

  return getPagedCollection({
    cursor,
    filter,
    limit,
    search,
    sort,
  });
};

export const getPagedPublicData = async (cursor, limit = 20) => {
  return getPagedCollection({
    cursor,
    filter: { isPublic: true },
    limit,
  });
};

export const getPagedAllData = async (cursor, limit = 20) => {
  return getPagedCollection({ cursor, limit });
};

export const getPagedAllDataWithVisibility = async (
  cursor,
  limit = 20,
  visibility = "all",
  search = "",
  sort = "updated",
) => {
  const filter = { email: { $ne: "contacts@gmail.com" } };

  if (visibility === "favorite") {
    filter.isFavorite = true;
  } else if (visibility === "public") {
    filter.isPublic = true;
  } else if (visibility === "private") {
    filter.isPublic = { $ne: true };
  }

  return getPagedCollection({ cursor, filter, limit, search, sort });
};

export const getPagedUsers = async (
  cursor,
  limit = 20,
  search = "",
  sort = "updated",
) => {
  return getPagedCollection({
    collectionName: "users",
    cursor,
    limit,
    search,
    sort,
    searchFields: ["name", "email"],
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
  return await getCollection("users").find().sort({ _id: -1 }).toArray();
};
//

// GET USER BY EMAIL
export const findUserByEmail = async (email) => {
  const collection = getCollection("users");
  return await collection.findOne({ email });
};

// CREATE USER
export const createUser = async (userData) => {
  const collection = getCollection("users");
  return await collection.insertOne(userData);
};

// UPDATE USER
export const updateUser = async (email, updateData) => {
  const collection = getCollection("users");
  return await collection.updateOne({ email }, { $set: updateData });
};

// DELETE USER
export const deleteUser = async (email) => {
  const collection = getCollection("users");
  return await collection.deleteOne({ email });
};
