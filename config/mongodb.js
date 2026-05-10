import { MongoClient } from "mongodb";

const dbname = "contacts-api";
const URI = "mongodb+srv://userNameOP:17102006om@cluster0.05uptec.mongodb.net/";

if (!URI) {
  throw new Error("MONGO_URI is missing..");
}

let actuallDB;
export async function connectDB() {
  try {
    // Reuse existing connection
    if (actuallDB) return actuallDB;

    const client = new MongoClient(URI);
    console.log("Connecting to MongoDB...");

    await client.connect();
    actuallDB = client.db(dbname);

    console.log(`🍃 MongoDB is connected to database : ${dbname}`);

    // // CREATE INDEXES HERE
    // await createIndexes();
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

// async function createIndexes() {
//   const usersCollection = actuallDB.collection("users");

//   // UNIQUE EMAIL INDEX
//   await usersCollection.createIndex(
//     { email: 1 },
//     { unique: true }
//   );

//   console.log("✅ User indexes created");
// }

export function getCollection(collectionName = "anyInformation") {
  if (!actuallDB) {
    throw new Error("Database not connected. Please call connectDB() first.");
  }
  let actualCollection = actuallDB.collection(collectionName);
  return actualCollection;
}
