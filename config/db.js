const { MongoClient, ServerApiVersion } = require("mongodb");

// Paste your full Atlas connection string into .env as MONGODB_URI.
// (Building it from separate DB_USER/DB_PASS assumes a hostname that
// doesn't match your actual cluster — just use the URI Atlas gives you.)
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

// Call once at server startup (see index.js).
async function connectDB() {
  if (db) return db;
  await client.connect();
  db = client.db("promptMarketplaceDB");
  console.log("Connected to MongoDB");
  return db;
}

// Call from any route/middleware after connectDB() has resolved.
function getCollections() {
  if (!db) {
    throw new Error("Database not connected yet — connectDB() must run first");
  }
  return {
    usersCollection: db.collection("users"),
    promptsCollection: db.collection("prompts"),
    reviewsCollection: db.collection("reviews"),
    reportsCollection: db.collection("reports"),
    paymentsCollection: db.collection("payments"),
    bookmarksCollection: db.collection("bookmarks"),
  };
}

module.exports = { connectDB, getCollections };
