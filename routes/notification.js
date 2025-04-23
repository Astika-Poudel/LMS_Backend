import express from "express";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../controllers/notification.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.get("/notifications", isAuth, getUserNotifications);
router.patch("/notifications/:id/read", isAuth, markNotificationAsRead);
router.patch("/notifications/mark-all-read", isAuth, markAllNotificationsAsRead);

export default router;