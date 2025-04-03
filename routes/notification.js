// routes/notification.js
import express from "express";
import { getUserNotifications, markNotificationAsRead } from "../controllers/notification.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.get("/notifications", isAuth, getUserNotifications);
router.patch("/notifications/:id/read", isAuth, markNotificationAsRead); // Changed to DELETE method

export default router;