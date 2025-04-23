import express from "express";
import { createPaymentIntent } from "../controllers/payment.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

// Route to create a payment intent
router.post("/create-payment-intent", isAuth, createPaymentIntent);

export default router;