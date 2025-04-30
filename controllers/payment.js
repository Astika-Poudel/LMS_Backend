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
      error.message.includes("Invalid amount") ||
      error.message.includes("Amount too small")
        ? 400
        : 500
    ).json({
      success: false,
      error: error.message,
    });
  }
};

// HMAC SHA256 function with explicit encoding
const generateHmacSha256Hash = (data, secret) => {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(data, "utf-8");
  return hmac.digest("base64");
};

// eSewa Payment Initiation
export const initiateEsewaPayment = async (req, res) => {
  try {
    console.log("Request received: POST /payment/initiate-esewa");
    const { amount, courseId } = req.body;
    const userId = req.userId;

    // Basic validations
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

    // Format amount: omit decimal places for whole numbers, otherwise use one decimal place
    const parsedAmount = parseFloat(amount);
    const formattedAmount = Number.isInteger(parsedAmount)
      ? parsedAmount.toString() // e.g., "1300" for 1300
      : parsedAmount.toFixed(1); // e.g., "1300.5" for 1300.5

    const transactionUuid = `${courseId}-${Date.now()}`; // e.g., "course123-1698771234567"

    const paymentData = {
      amount: formattedAmount,
      tax_amount: "0",
      total_amount: formattedAmount,
      transaction_uuid: transactionUuid,
      product_code: process.env.ESEWA_MERCHANT_ID || "EPAYTEST",
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: process.env.ESEWA_SUCCESS_URL || "http://localhost:5173/payment-success",
      failure_url: process.env.ESEWA_FAILURE_URL || "http://localhost:5173/payment-failure",
      signed_field_names: "total_amount,transaction_uuid,product_code",
    };

    // Create exact string to sign
    const dataToSign = `total_amount=${paymentData.total_amount},transaction_uuid=${paymentData.transaction_uuid},product_code=${paymentData.product_code}`;
    console.log("Data to Sign:", dataToSign);
    console.log("Data to Sign Length:", dataToSign.length);
    console.log(
      "Data to Sign Char Codes:",
      dataToSign.split("").map((char) => char.charCodeAt(0))
    );
    console.log(
      "Secret Key (first 5 chars):",
      process.env.ESEWA_SECRET_KEY.trim().substring(0, 5) + "..."
    );

    const signature = generateHmacSha256Hash(
      dataToSign,
      process.env.ESEWA_SECRET_KEY.trim()
    );

    paymentData.signature = signature;

    console.log("=== eSewa Payment Data ===");
    console.log("Signed String:", dataToSign);
    console.log("Signature:", signature);
    console.log("Form Payload:", paymentData);

    res.status(200).json({
      success: true,
      paymentData,
      paymentUrl: process.env.ESEWA_PAYMENT_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    });
  } catch (error) {
    console.error("Error in initiateEsewaPayment:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to initiate eSewa payment.",
    });
  }
};

// eSewa Payment Verification
export const verifyEsewaPayment = async (req, res) => {
  try {
    const { data: encodedData } = req.query;

    console.log("Verifying eSewa Payment:");
    console.log("Query Params:", req.query);

    if (!encodedData) {
      return res.status(400).json({
        success: false,
        error: "Missing payment data from eSewa.",
      });
    }

    const decodedData = Buffer.from(encodedData, "base64").toString("utf-8");
    const parsedData = JSON.parse(decodedData);

    console.log("Decoded Data:", parsedData);

    const transaction_uuid = parsedData.transaction_uuid;
    const amount = parsedData.total_amount;
    const refId = parsedData.transaction_code;
    const status = parsedData.status;
    const product_code = parsedData.product_code;
    const signed_field_names = parsedData.signed_field_names;

    if (!transaction_uuid || !amount || !refId) {
      return res.status(400).json({
        success: false,
        error: "Missing required transaction details.",
      });
    }

    // Normalize total_amount by removing thousand separators
    const normalizedData = { ...parsedData };
    if (normalizedData.total_amount) {
      normalizedData.total_amount = normalizedData.total_amount.replace(/,/g, "");
    }

    const fields = signed_field_names.split(",");
    const dataToSign = fields
      .map((field) => `${field}=${normalizedData[field]}`)
      .join(",");
    console.log("Data to Sign for Verification:", dataToSign);

    const expectedSignature = generateHmacSha256Hash(dataToSign, process.env.ESEWA_SECRET_KEY.trim());

    console.log("Expected Signature:", expectedSignature);
    console.log("Received Signature:", parsedData.signature);

    if (parsedData.signature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        error: "Invalid signature. Payment verification failed.",
      });
    }

    const courseId = transaction_uuid.split("-")[0];

    if (parsedData.status === "COMPLETE" || parsedData.transaction_code) {
      res.status(200).json({
        success: true,
        message: "Payment verified successfully.",
        courseId,
        transactionDetails: parsedData,
      });
    } else {
      console.log("Verification Failed - Response:", parsedData);
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