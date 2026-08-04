import { MongoClient } from "mongodb";

const dbname = "contacts-api";
const URI = "mongodb+srv://userNameOP:17102006om@cluster0.05uptec.mongodb.net/";

if (!URI) {
  throw new Error("MONGO_URI is missing..");
}

let actuallDB;

async function createIndexes() {
  const infoCollection = actuallDB.collection("anyInformation");
  const usersCollection = actuallDB.collection("users");
  const foldersCollection = actuallDB.collection("folders");

  try {
    await infoCollection.dropIndex("shortId_1");
  } catch {
    // Index didn't exist yet, ignore
  }

  try {
    await foldersCollection.dropIndex("shortId_1");
  } catch {
    // Index didn't exist yet, ignore
  }

  await Promise.all([
    infoCollection.createIndex({ email: 1, _id: -1 }),
    infoCollection.createIndex({ isPublic: 1, _id: -1 }),
    infoCollection.createIndex({ email: 1, folderId: 1, _id: -1 }),
    infoCollection.createIndex({ shortId: 1 }, { unique: true, sparse: true }),
    usersCollection.createIndex({ email: 1 }, { unique: true }),
    foldersCollection.createIndex({ email: 1, name: 1 }, { unique: true }),
    foldersCollection.createIndex({ shortId: 1 }, { unique: true, sparse: true }),
  ]);

  console.log("Database indexes are ready");
}

export async function connectDB() {
  try {
    if (actuallDB) return actuallDB;

    const client = new MongoClient(URI);
    console.log("Connecting to MongoDB...");

    await client.connect();
    actuallDB = client.db(dbname);

    console.log(`MongoDB is connected to database: ${dbname}`);
    await createIndexes();

    return actuallDB;
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

export function getCollection(collectionName = "anyInformation") {
  if (!actuallDB) {
    throw new Error("Database not connected. Please call connectDB() first.");
  }

  return actuallDB.collection(collectionName);
}
