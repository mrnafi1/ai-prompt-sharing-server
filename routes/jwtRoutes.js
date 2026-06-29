const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Called right after a successful Firebase login/register on the client.
// Returns the token in the response body — the client stores it in
// localStorage and attaches it as a Bearer header on future requests.
// (We moved off httpOnly cookies because they get silently dropped by
// browsers when the client and server are on different domains.)
router.post("/jwt", (req, res) => {
  const { email } = req.body;
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.send({ token });
});

module.exports = router;
