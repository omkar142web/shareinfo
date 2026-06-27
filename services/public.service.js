import { ObjectId } from "mongodb";

import { getCollection } from "../config/mongodb.js";
import { getPagedCollection } from "./auth.service.js";

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const normalizePublicEntry = (entry = {}) => {
  return {
    _id: entry._id?.toString(),
    name: entry.name || "",
    info: entry.info || "",
    isPublic: entry.isPublic === true,
    createdAt: entry.createdAt || entry._id?.getTimestamp?.() || null,
    updatedAt: entry.updatedAt || null,
  };
};

export const getPagedPublicEntries = async (cursor, limit = 20) => {
  return getPagedCollection({
    cursor,
    filter: { isPublic: true },
    limit,
  });
};

export const searchPublicEntries = async (keyword, cursor, limit = 20) => {
  const trimmedKeyword = String(keyword || "").trim();

  if (!trimmedKeyword) {
    return getPagedPublicEntries(cursor, limit);
  }

  const collection = getCollection("anyInformation");
  const regex = new RegExp(escapeRegex(trimmedKeyword), "i");
  const filter = {
    isPublic: true,
    $or: [{ name: regex }, { info: regex }],
  };
  const query = cursor
    ? { ...filter, _id: { $lt: new ObjectId(cursor) } }
    : filter;

  const [rawItems, totalCount] = await Promise.all([
    collection.find(query).sort({ _id: -1 }).limit(limit + 1).toArray(),
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

export const findPublicEntryById = async (id) => {
  const collection = getCollection("anyInformation");

  return collection.findOne({
    _id: new ObjectId(id),
    isPublic: true,
  });
};
