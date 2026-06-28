const express = require("express");
const router = express.Router();
const { getCollections } = require("../config/db");
const verifyToken = require("../middlewares/verifyToken");

// Called on register and on first-time Google login.
// Idempotent: won't create a duplicate if the email already exists.
router.post("/users", async (req, res) => {
  const { usersCollection } = getCollections();
  const newUser = req.body;

  const existing = await usersCollection.findOne({ email: newUser.email });
  if (existing) {
    return res.send({ message: "user already exists", inserted: false });
  }

  const result = await usersCollection.insertOne(newUser);
  res.send(result);
});

// Public — Home page "Top Creators" section.
// Aggregation: group approved prompts by creator, count + sum copies, join
// with the users collection for name/photo, sort by prompt count, top 6.
router.get("/users/top-creators", async (req, res) => {
  const { promptsCollection } = getCollections();

  const topCreators = await promptsCollection
    .aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: "$creatorEmail",
          promptCount: { $sum: 1 },
          totalCopies: { $sum: "$copyCount" },
        },
      },
      { $sort: { promptCount: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "email",
          as: "creator",
        },
      },
      { $unwind: "$creator" },
      {
        $project: {
          _id: 0,
          email: "$_id",
          promptCount: 1,
          totalCopies: 1,
          name: "$creator.name",
          photoURL: "$creator.photoURL",
        },
      },
    ])
    .toArray();

  res.send(topCreators);
});

// Profile page — full user doc plus a computed total prompt count.
router.get("/users/:email", verifyToken, async (req, res) => {
  const { usersCollection, promptsCollection } = getCollections();
  const user = await usersCollection.findOne({ email: req.params.email });
  if (!user) return res.status(404).send({ message: "user not found" });

  const totalPrompts = await promptsCollection.countDocuments({
    creatorEmail: req.params.email,
  });

  res.send({ ...user, totalPrompts });
});

// Used by useUserRole on the client to decide which dashboard links/routes to show.
router.get("/users/role/:email", verifyToken, async (req, res) => {
  const { usersCollection } = getCollections();
  const user = await usersCollection.findOne({ email: req.params.email });

  if (!user) {
    return res.status(404).send({ message: "user not found" });
  }

  res.send({ role: user.role });
});

module.exports = router;
