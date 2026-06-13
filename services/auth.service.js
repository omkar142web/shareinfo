import { ObjectId } from "mongodb";

import { getCollection } from "../config/mongodb.js";

const getPagedCollection = async ({
  collectionName = "anyInformation",
  cursor = null,
  filter = {},
  limit = 20,
}) => {
  const collection = getCollection(collectionName);
  const query = cursor
    ? { ...filter, _id: { $lt: new ObjectId(cursor) } }
    : filter;
  const rawItems = await collection
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();
  const hasMore = rawItems.length > limit;
  const items = hasMore ? rawItems.slice(0, limit) : rawItems;
  const nextCursor =
    hasMore && items.length > 0
      ? items[items.length - 1]._id.toString()
      : null;

  return { items, nextCursor, hasMore };
};

export const getPagedUserData = async (email, cursor, limit = 20) => {
  return getPagedCollection({
    cursor,
    filter: { email },
    limit,
  });
};

export const getPagedAllData = async (cursor, limit = 20) => {
  return getPagedCollection({ cursor, limit });
};

export const getPagedUsers = async (cursor, limit = 20) => {
  return getPagedCollection({
    collectionName: "users",
    cursor,
    limit,
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
  return await getCollection('users').find().sort({ _id: -1 }).toArray();
};
//

// GET USER BY EMAIL
export const findUserByEmail = async (email) => {
  const collection = getCollection('users');
  return await collection.findOne({ email });
};

// CREATE USER
export const createUser = async (userData) => {
  const collection = getCollection('users');
  return await collection.insertOne(userData);
};

// UPDATE USER
export const updateUser = async (email, updateData) => {
  const collection = getCollection('users');
  return await collection.updateOne({ email }, { $set: updateData });
};

// DELETE USER
export const deleteUser = async (email) => {
  const collection = getCollection('users');
  return await collection.deleteOne({ email });
};
