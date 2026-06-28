const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

// Called right after a successful Firebase login/register on the client.
router.post("/jwt", (req, res) => {
  const { email } = req.body;
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, cookieOptions).send({ success: true });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", cookieOptions).send({ success: true });
});

module.exports = router;
