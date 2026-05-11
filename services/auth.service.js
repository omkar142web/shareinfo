import { getCollection } from "../config/mongodb.js";

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
