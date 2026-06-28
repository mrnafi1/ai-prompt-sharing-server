const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { getCollections } = require("../config/db");
const verifyToken = require("../middlewares/verifyToken");

// ---- Create (Add Prompt — User/Creator dashboards) ----
router.post("/prompts", verifyToken, async (req, res) => {
  const { promptsCollection, usersCollection } = getCollections();
  const creatorEmail = req.body.creatorEmail || req.decoded.email;

  const owner = await usersCollection.findOne({ email: creatorEmail });
  if (owner?.subscription !== "Premium") {
    const existingCount = await promptsCollection.countDocuments({ creatorEmail });
    if (existingCount >= 3) {
      return res.status(403).send({
        message: "Free users can add up to 3 prompts. Upgrade to Premium to add more.",
      });
    }
  }

  const prompt = {
    ...req.body,
    copyCount: 0,
    status: "pending",
    createdAt: new Date(),
  };
  const result = await promptsCollection.insertOne(prompt);
  res.send(result);
});

// ---- Logged-in user's own prompts — My Prompts / Creator My Prompts tables ----
router.get("/prompts/user/:email", verifyToken, async (req, res) => {
  const { promptsCollection } = getCollections();
  const prompts = await promptsCollection
    .find({ creatorEmail: req.params.email })
    .sort({ createdAt: -1 })
    .toArray();
  res.send(prompts);
});

// ---- Creator analytics: summary cards + growth chart ----
router.get("/prompts/creator-stats/:email", verifyToken, async (req, res) => {
  const { promptsCollection, bookmarksCollection } = getCollections();
  const email = req.params.email;

  const myPrompts = await promptsCollection.find({ creatorEmail: email }).toArray();
  const promptIds = myPrompts.map((p) => p._id.toString());

  const totalBookmarks = await bookmarksCollection.countDocuments({
    promptId: { $in: promptIds },
  });

  const growth = await promptsCollection
    .aggregate([
      { $match: { creatorEmail: email } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  res.send({
    totalPrompts: myPrompts.length,
    totalCopies: myPrompts.reduce((sum, p) => sum + (p.copyCount || 0), 0),
    totalBookmarks,
    growth: growth.map((g) => ({ date: g._id, count: g.count })),
    copiesBreakdown: myPrompts.map((p) => ({ title: p.title, copies: p.copyCount || 0 })),
  });
});

// ---- Public listing: All Prompts page ----
// Server-side search + filter + sort + pagination, as required.
router.get("/prompts", async (req, res) => {
  const { promptsCollection } = getCollections();
  const { search, category, aiTool, difficulty, sort, page = 1, limit = 9 } = req.query;

  const query = { status: "approved" };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
      { aiTool: { $regex: search, $options: "i" } },
    ];
  }
  if (category) query.category = category;
  if (aiTool) query.aiTool = aiTool;
  if (difficulty) query.difficulty = difficulty;

  let sortQuery = { createdAt: -1 }; // default: Latest
  if (sort === "popular") sortQuery = { averageRating: -1 };
  if (sort === "copied") sortQuery = { copyCount: -1 };

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const totalCount = await promptsCollection.countDocuments(query);
  const prompts = await promptsCollection
    .find(query)
    .sort(sortQuery)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .toArray();

  res.send({ prompts, totalCount });
});

// ---- Featured prompts: Home page ----
router.get("/prompts/featured", async (req, res) => {
  const { promptsCollection } = getCollections();
  const prompts = await promptsCollection
    .find({ status: "approved", visibility: "public" })
    .sort({ copyCount: -1 })
    .limit(6)
    .toArray();
  res.send(prompts);
});

// ---- Single prompt — Prompt Details page (private route) ----
// Server enforces the premium gate, not just the UI: a non-premium user
// never receives promptContent in the response for a private prompt.
router.get("/prompts/:id", verifyToken, async (req, res) => {
  const { promptsCollection, usersCollection } = getCollections();
  const prompt = await promptsCollection.findOne({ _id: new ObjectId(req.params.id) });

  if (!prompt) {
    return res.status(404).send({ message: "prompt not found" });
  }

  const viewer = await usersCollection.findOne({ email: req.decoded.email });
  const isOwner = prompt.creatorEmail === req.decoded.email;
  const isPremium = viewer?.subscription === "Premium";
  const locked = prompt.visibility === "private" && !isPremium && !isOwner;

  if (locked) {
    return res.send({ ...prompt, promptContent: null, locked: true });
  }

  res.send({ ...prompt, locked: false });
});

// ---- Update / Delete (My Prompts tables) ----
// Only the prompt's own creator, or an Admin, may update/delete it.
router.patch("/prompts/:id", verifyToken, async (req, res) => {
  const { promptsCollection, usersCollection } = getCollections();
  const prompt = await promptsCollection.findOne({ _id: new ObjectId(req.params.id) });
  if (!prompt) return res.status(404).send({ message: "prompt not found" });

  const requester = await usersCollection.findOne({ email: req.decoded.email });
  const isOwner = prompt.creatorEmail === req.decoded.email;
  if (!isOwner && requester?.role !== "Admin") {
    return res.status(403).send({ message: "forbidden access" });
  }

  const updates = { ...req.body };
  delete updates._id;
  const result = await promptsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: updates }
  );
  res.send(result);
});

router.delete("/prompts/:id", verifyToken, async (req, res) => {
  const { promptsCollection, usersCollection } = getCollections();
  const prompt = await promptsCollection.findOne({ _id: new ObjectId(req.params.id) });
  if (!prompt) return res.status(404).send({ message: "prompt not found" });

  const requester = await usersCollection.findOne({ email: req.decoded.email });
  const isOwner = prompt.creatorEmail === req.decoded.email;
  if (!isOwner && requester?.role !== "Admin") {
    return res.status(403).send({ message: "forbidden access" });
  }

  const result = await promptsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send(result);
});

// ---- Copy Prompt action ----
router.patch("/prompts/:id/copy", verifyToken, async (req, res) => {
  const { promptsCollection } = getCollections();
  const result = await promptsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $inc: { copyCount: 1 } }
  );
  res.send(result);
});

module.exports = router;
