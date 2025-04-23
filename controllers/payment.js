import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is required in environment variables");
}

const stripe = new Stripe(stripeSecretKey);

// Utility function for input validation
const validatePaymentInput = (amount) => {
  if (!amount || isNaN(amount) || amount <= 0) {
    throw new Error("Invalid amount provided. Amount must be a positive number.");
  }

  const amountInCents = Math.round(amount * 100);
  if (amountInCents < 50) { 
    throw new Error("Amount too small. Minimum amount is 0.50 USD.");
  }

  return amountInCents;
};


export const createPaymentIntent = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.userId;

    
    const amountInCents = validatePaymentInput(amount);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      metadata: { userId: userId.toString() },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error in createPaymentIntent:", error.message);
    res.status(error.message.includes("Invalid amount") || error.message.includes("Amount too small") ? 400 : 500).json({
      success: false,
      error: error.message,
    });
  }
};