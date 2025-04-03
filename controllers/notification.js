// controllers/notification.js
import TryCatch from "../middlewares/TryCatch.js";
import { Notification } from "../models/Notification.js";

export const getUserNotifications = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const notifications = await Notification.find({ recipient: userId }).sort({
    createdAt: -1,
  });

  if (!notifications) {
    return res.status(404).json({
      success: false,
      message: "No notifications found",
    });
  }

  res.status(200).json({
    success: true,
    notifications,
  });
});

export const markNotificationAsRead = TryCatch(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findByIdAndUpdate(
    id,
    { read: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Notification marked as read",
    notification,
  });
});
