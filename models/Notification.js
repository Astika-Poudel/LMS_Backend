// models/Notification.js
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  message: {
    type: String,
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Courses"
  },
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export const Notification = mongoose.model("Notification", schema);