const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { getCollections } = require("../config/db");
const verifyToken = require("../middlewares/verifyToken");
const verifyAdmin = require("../middlewares/verifyAdmin");

// ---------------- All Users ----------------
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  const { usersCollection } = getCollections();
  const { search, page = 1, limit = 10 } = req.query;

  const query = search
    ? { $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }] }
    : {};

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const totalCount = await usersCollection.countDocuments(query);
  const users = await usersCollection
    .find(query)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .toArray();

  res.send({ users, totalCount });
});

router.patch("/users/role/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { usersCollection } = getCollections();
  const { role } = req.body;

  if (!["User", "Creator", "Admin"].includes(role)) {
    return res.status(400).send({ message: "invalid role" });
  }

  const result = await usersCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { role } }
  );
  res.send(result);
});

router.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { usersCollection } = getCollections();
  const result = await usersCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send(result);
});

// ---------------- All Prompts (moderation) ----------------
router.get("/prompts/admin/all", verifyToken, verifyAdmin, async (req, res) => {
  const { promptsCollection } = getCollections();
  const { status, page = 1, limit = 10 } = req.query;

  const query = status ? { status } : {};
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const totalCount = await promptsCollection.countDocuments(query);
  const prompts = await promptsCollection
    .find(query)
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .toArray();

  res.send({ prompts, totalCount });
});

router.patch("/prompts/approve/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { promptsCollection } = getCollections();
  const result = await promptsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: "approved" }, $unset: { rejectionFeedback: "" } }
  );
  res.send(result);
});

router.patch("/prompts/reject/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { promptsCollection } = getCollections();
  const { feedback } = req.body;
  const result = await promptsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: "rejected", rejectionFeedback: feedback || "" } }
  );
  res.send(result);
});

router.patch("/prompts/feature/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { promptsCollection } = getCollections();
  const prompt = await promptsCollection.findOne({ _id: new ObjectId(req.params.id) });
  if (!prompt) return res.status(404).send({ message: "prompt not found" });

  const result = await promptsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { featured: !prompt.featured } }
  );
  res.send(result);
});

// ---------------- All Payments ----------------
router.get("/payments", verifyToken, verifyAdmin, async (req, res) => {
  const { paymentsCollection } = getCollections();
  const payments = await paymentsCollection.find().sort({ date: -1 }).toArray();
  res.send(payments);
});

// ---------------- Reported Prompts ----------------
router.get("/reports", verifyToken, verifyAdmin, async (req, res) => {
  const { reportsCollection } = getCollections();

  const reports = await reportsCollection
    .aggregate([
      { $addFields: { promptObjectId: { $toObjectId: "$promptId" } } },
      {
        $lookup: {
          from: "prompts",
          localField: "promptObjectId",
          foreignField: "_id",
          as: "prompt",
        },
      },
      { $unwind: { path: "$prompt", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          reason: 1,
          description: 1,
          reportedBy: 1,
          status: 1,
          createdAt: 1,
          promptId: 1,
          "prompt.title": 1,
          "prompt.creatorEmail": 1,
        },
      },
    ])
    .toArray();

  res.send(reports);
});

router.patch("/reports/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { reportsCollection, promptsCollection } = getCollections();
  const { action } = req.body; // "remove" | "warn" | "dismiss"
  const report = await reportsCollection.findOne({ _id: new ObjectId(req.params.id) });
  if (!report) return res.status(404).send({ message: "report not found" });

  if (action === "remove") {
    await promptsCollection.deleteOne({ _id: new ObjectId(report.promptId) });
  }

  const statusMap = { remove: "resolved", warn: "resolved", dismiss: "dismissed" };
  const result = await reportsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: statusMap[action] || "resolved", actionTaken: action } }
  );
  res.send(result);
});

// ---------------- Platform Analytics ----------------
router.get("/admin/analytics", verifyToken, verifyAdmin, async (req, res) => {
  const { usersCollection, promptsCollection, reviewsCollection } = getCollections();

  const [totalUsers, totalPrompts, totalReviews, copiesAgg] = await Promise.all([
    usersCollection.countDocuments(),
    promptsCollection.countDocuments(),
    reviewsCollection.countDocuments(),
    promptsCollection
      .aggregate([{ $group: { _id: null, totalCopies: { $sum: "$copyCount" } } }])
      .toArray(),
  ]);

  res.send({
    totalUsers,
    totalPrompts,
    totalReviews,
    totalCopies: copiesAgg[0]?.totalCopies || 0,
  });
});

module.exports = router;
