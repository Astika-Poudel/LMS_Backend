import Stripe from "stripe";
import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";

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

// Stripe Payment Intent
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
    console.error("Error in createPaymentIntent:", error.message, error.stack);
    res.status(
      error.message.includes("Invalid amount") || error.message.includes("Amount too small") ? 400 : 500
    ).json({
      success: false,
      error: error.message,
    });
  }
};

// Utility function to generate HMAC SHA256 signature
const generateHmacSha256Hash = (data, secret) => {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(data);
  return hmac.digest("base64");
};

// eSewa Payment Initiation
export const initiateEsewaPayment = async (req, res) => {
  try {
    const { amount, courseId } = req.body;
    const userId = req.userId;

    // Validate input
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount provided. Amount must be a positive number.",
      });
    }
    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: "Course ID is required.",
      });
    }

    // Format amount to ensure consistency (e.g., "10.00")
    const formattedAmount = parseFloat(amount).toFixed(2);

    // Generate unique transaction UUID
    const transactionUuid = `${courseId}-${Date.now()}`;

    // Prepare payment data
    const paymentData = {
      amount: formattedAmount,
      tax_amount: "0",
      total_amount: formattedAmount,
      transaction_uuid: transactionUuid,
      product_code: process.env.ESEWA_MERCHANT_ID,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: process.env.ESEWA_SUCCESS_URL,
      failure_url: process.env.ESEWA_FAILURE_URL,
      signed_field_names: "total_amount,transaction_uuid,product_code",
    };

    // Generate signature
    const dataToSign = `total_amount=${paymentData.total_amount},transaction_uuid=${paymentData.transaction_uuid},product_code=${paymentData.product_code}`;
    const signature = generateHmacSha256Hash(dataToSign, process.env.ESEWA_SECRET_KEY);

    // Add signature to payment data
    paymentData.signature = signature;

    // Log payment data for debugging
    console.log("Initiating eSewa Payment:");
    console.log("Payment Data:", paymentData);
    console.log("Data to Sign:", dataToSign);
    console.log("Generated Signature:", signature);
    console.log("Success URL:", process.env.ESEWA_SUCCESS_URL);

    // Respond with payment data to be used in the frontend form
    res.status(200).json({
      success: true,
      paymentData,
      paymentUrl: process.env.ESEWA_PAYMENT_URL,
    });
  } catch (error) {
    console.error("Error in initiateEsewaPayment:", error.message, error.stack);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to initiate eSewa payment.",
    });
  }
};

// eSewa Payment Verification
export const verifyEsewaPayment = async (req, res) => {
  try {
    const { transaction_uuid, amount, refId } = req.query;

    // Log incoming query parameters
    console.log("Verifying eSewa Payment:");
    console.log("Query Params:", { transaction_uuid, amount, refId });

    // Validate inputs
    if (!transaction_uuid || !amount || !refId) {
      return res.status(400).json({
        success: false,
        error: "Missing required transaction details.",
      });
    }

    // Format amount to match the initiation format
    const formattedAmount = parseFloat(amount).toFixed(2);

    // Extract courseId from transaction_uuid (format: courseId-timestamp)
    const courseId = transaction_uuid.split("-")[0];

    // Prepare verification data
    // Adjust these keys based on eSewa's API requirements
    const verificationData = {
      amt: formattedAmount,
      scd: process.env.ESEWA_MERCHANT_ID,
      pid: transaction_uuid, // This might need to be transaction_code or similar
      rid: refId,
    };

    console.log("Verification Data:", verificationData);

    // Make verification request to eSewa
    const response = await axios.get("https://rc-epay.esewa.com.np/api/epay/transaction", {
      params: verificationData,
    }).catch(error => {
      console.error("eSewa Verification Error Response:", error.response?.data);
      throw error;
    });

    console.log("eSewa Verification Response:", response.data);

    if (response.data.status === "SUCCESS") {
      res.status(200).json({
        success: true,
        message: "Payment verified successfully.",
        courseId, // Return courseId for enrollment
        transactionDetails: response.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Payment verification failed.",
      });
    }
  } catch (error) {
    console.error("Error in verifyEsewaPayment:", error.message, error.stack);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to verify payment.",
    });
  }
};