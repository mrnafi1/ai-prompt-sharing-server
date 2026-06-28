const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const { getCollections } = require("../config/db");
const verifyToken = require("../middlewares/verifyToken");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// $5 one-time payment to unlock Premium.
router.post("/create-payment-intent", verifyToken, async (req, res) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 500, // cents
    currency: "usd",
    payment_method_types: ["card"],
  });
  res.send({ clientSecret: paymentIntent.client_secret });
});

// Called after Stripe confirms the card payment succeeded.
router.post("/payments", verifyToken, async (req, res) => {
  const { paymentsCollection, usersCollection } = getCollections();
  const { transactionId, email, amount } = req.body;

  await paymentsCollection.insertOne({ transactionId, email, amount, date: new Date() });
  await usersCollection.updateOne({ email }, { $set: { subscription: "Premium" } });

  res.send({ success: true });
});

module.exports = router;
