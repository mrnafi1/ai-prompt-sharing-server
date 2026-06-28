const { getCollections } = require("../config/db");

// Use as: router.post('/creator-route', verifyToken, verifyCreatorOrAdmin, handler)
const verifyCreatorOrAdmin = async (req, res, next) => {
  const email = req.decoded?.email;
  const { usersCollection } = getCollections();
  const user = await usersCollection.findOne({ email });

  if (!user || !["Creator", "Admin"].includes(user.role)) {
    return res.status(403).send({ message: "forbidden access" });
  }

  next();
};

module.exports = verifyCreatorOrAdmin;
