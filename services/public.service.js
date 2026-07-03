import { ObjectId } from "mongodb";

import { getCollection } from "../config/mongodb.js";

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const normalizePublicEntry = (entry = {}) => {
  return {
    _id: entry._id?.toString(),
    name: entry.name || "",
    info: entry.info || "",
    ownerName: entry.ownerName || "",
    email: entry.email || "",
    isPublic: entry.isPublic === true,
    createdAt: entry.createdAt || entry._id?.getTimestamp?.() || null,
    updatedAt: entry.updatedAt || null,
  };
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

const getSortQuery = (cursor, sort) => {
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

const getPagedPublicEntriesByFilter = async ({
  cursor = null,
  filter = {},
  limit = 20,
  sort = "updated",
}) => {
  const collection = getCollection("anyInformation");
  const normalizedSort = normalizeSort(sort);
  const cursorQuery = getSortQuery(cursor, normalizedSort);
  const pipeline = [
    { $match: filter },
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
    collection.countDocuments(filter),
  ]);

  const hasMore = rawItems.length > limit;
  const items = hasMore ? rawItems.slice(0, limit) : rawItems;
  const nextCursor =
    hasMore && items.length > 0 ? encodeCursor(items[items.length - 1], normalizedSort) : null;

  return { items, nextCursor, hasMore, totalCount };
};

export const getPagedPublicEntries = async (cursor, limit = 20, sort = "updated") => {
  return getPagedPublicEntriesByFilter({
    cursor,
    filter: { isPublic: true },
    limit,
    sort,
  });
};

export const searchPublicEntries = async (keyword, cursor, limit = 20, sort = "updated") => {
  const trimmedKeyword = String(keyword || "").trim();

  if (!trimmedKeyword) {
    return getPagedPublicEntries(cursor, limit, sort);
  }

  const regex = new RegExp(escapeRegex(trimmedKeyword), "i");
  const filter = {
    isPublic: true,
    $or: [{ name: regex }, { info: regex }],
  };

  return getPagedPublicEntriesByFilter({ cursor, filter, limit, sort });
};

export const findPublicEntryById = async (id) => {
  const collection = getCollection("anyInformation");

  return collection.findOne({
    _id: new ObjectId(id),
    isPublic: true,
  });
};
