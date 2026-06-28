const { getCollections } = require("../config/db");

// Use as: router.get('/admin-route', verifyToken, verifyAdmin, handler)
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded?.email;
  const { usersCollection } = getCollections();
  const user = await usersCollection.findOne({ email });

  if (!user || user.role !== "Admin") {
    return res.status(403).send({ message: "forbidden access" });
  }

  next();
};

module.exports = verifyAdmin;
