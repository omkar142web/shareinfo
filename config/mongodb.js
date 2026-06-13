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

  await Promise.all([
    infoCollection.createIndex({ email: 1, _id: -1 }),
    usersCollection.createIndex({ email: 1 }, { unique: true }),
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
