import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

const router = express.Router();

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Use STRIPE_SECRET_KEY from .env

// Create a Payment Intent
router.post("/create-payment-intent", async (req, res) => {
  const { amount } = req.body; // Expecting amount in the request body

  if (!amount || isNaN(amount)) {
    return res.status(400).send({ error: "Invalid amount provided" });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents and round to avoid fractional cents
      currency: "usd",
    });

    res.status(200).send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error.message);
    res.status(500).send({ error: "Failed to create payment intent" });
  }
});

export default router;
