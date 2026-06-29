const jwt = require("jsonwebtoken");

// Reads the JWT from the Authorization header (Bearer <token>) and verifies it.
// We switched away from an httpOnly cookie because the client and server live
// on different domains (Vercel + Render) — browsers increasingly block
// cross-site cookies by default, which silently broke session persistence.
// A Bearer token in localStorage has no such restriction.
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

module.exports = verifyToken;
