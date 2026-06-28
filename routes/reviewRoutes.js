const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { getCollections } = require("../config/db");
const verifyToken = require("../middlewares/verifyToken");

// Public — Home page "Customer Reviews" section.
router.get("/reviews/recent", async (req, res) => {
  const { reviewsCollection } = getCollections();
  const reviews = await reviewsCollection
    .find()
    .sort({ date: -1 })
    .limit(6)
    .toArray();
  res.send(reviews);
});

// Submit a review — only reachable from Prompt Details, which is already a
// private route, so the user is guaranteed to be logged in here.
router.post("/reviews", verifyToken, async (req, res) => {
  const { reviewsCollection, promptsCollection } = getCollections();
  const review = { ...req.body, date: new Date() };

  await reviewsCollection.insertOne(review);

  // keep the prompt's averageRating in sync so "Most Popular" sort stays accurate
  const allReviewsForPrompt = await reviewsCollection
    .find({ promptId: review.promptId })
    .toArray();
  const averageRating =
    allReviewsForPrompt.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
    allReviewsForPrompt.length;

  await promptsCollection.updateOne(
    { _id: new ObjectId(review.promptId) },
    { $set: { averageRating } }
  );

  res.send({ success: true, averageRating });
});

router.get("/reviews/:promptId", async (req, res) => {
  const { reviewsCollection } = getCollections();
  const reviews = await reviewsCollection
    .find({ promptId: req.params.promptId })
    .sort({ date: -1 })
    .toArray();
  res.send(reviews);
});

router.get("/reviews/user/:email", verifyToken, async (req, res) => {
  const { reviewsCollection } = getCollections();
  const reviews = await reviewsCollection
    .find({ email: req.params.email })
    .sort({ date: -1 })
    .toArray();
  res.send(reviews);
});

module.exports = router;

