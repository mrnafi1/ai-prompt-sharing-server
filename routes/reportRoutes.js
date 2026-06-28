const express = require("express");
const router = express.Router();
const { getCollections } = require("../config/db");
const verifyToken = require("../middlewares/verifyToken");

router.post("/reports", verifyToken, async (req, res) => {
  const { reportsCollection } = getCollections();
  const report = {
    ...req.body,
    reportedBy: req.decoded.email,
    status: "pending",
    createdAt: new Date(),
  };
  const result = await reportsCollection.insertOne(report);
  res.send(result);
});

// GET /reports and the moderation actions (remove/warn/dismiss) are added
// on Day 4 for the Admin > Reported Prompts page.

module.exports = router;
