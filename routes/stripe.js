import express from "express";
import { createPaymentIntent, initiateEsewaPayment, verifyEsewaPayment } from "../controllers/payment.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

// Route to create a payment intent for Stripe
router.post("/create-payment-intent", isAuth, createPaymentIntent);

// eSewa Payment Initiation
router.post("/initiate-esewa", isAuth, initiateEsewaPayment);

// eSewa Payment Verification
router.get("/verify-esewa", isAuth, verifyEsewaPayment);

export default router;