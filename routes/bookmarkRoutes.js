const express = require("express");
const router = express.Router();
const { getCollections } = require("../config/db");
const verifyToken = require("../middlewares/verifyToken");

// Toggle: removes the bookmark if it already exists, otherwise adds it.
// Prevents duplicates by checking before inserting.
router.post("/bookmarks", verifyToken, async (req, res) => {
  const { bookmarksCollection } = getCollections();
  const { promptId } = req.body;
  const userEmail = req.decoded.email;

  const existing = await bookmarksCollection.findOne({ userEmail, promptId });

  if (existing) {
    await bookmarksCollection.deleteOne({ _id: existing._id });
    return res.send({ bookmarked: false });
  }

  await bookmarksCollection.insertOne({ userEmail, promptId, createdAt: new Date() });
  res.send({ bookmarked: true });
});

// Used by Saved Prompts page — joins bookmark records with full prompt data.
router.get("/bookmarks/:email", verifyToken, async (req, res) => {
  const { bookmarksCollection } = getCollections();

  const bookmarks = await bookmarksCollection
    .aggregate([
      { $match: { userEmail: req.params.email } },
      {
        $addFields: { promptObjectId: { $toObjectId: "$promptId" } },
      },
      {
        $lookup: {
          from: "prompts",
          localField: "promptObjectId",
          foreignField: "_id",
          as: "prompt",
        },
      },
      { $unwind: "$prompt" },
      {
        $project: {
          _id: 1,
          promptId: 1,
          createdAt: 1,
          "prompt.title": 1,
          "prompt.category": 1,
          "prompt.aiTool": 1,
          "prompt.copyCount": 1,
          "prompt.creatorName": 1,
        },
      },
    ])
    .toArray();

  res.send(bookmarks);
});

// Lightweight check used by PromptDetails to render the bookmark button state.
router.get("/bookmarks/check/:promptId", verifyToken, async (req, res) => {
  const { bookmarksCollection } = getCollections();
  const existing = await bookmarksCollection.findOne({
    userEmail: req.decoded.email,
    promptId: req.params.promptId,
  });
  res.send({ bookmarked: !!existing });
});

module.exports = router;
