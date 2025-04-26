import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  lectureId: { type: mongoose.Schema.Types.ObjectId, ref: "Lecture", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Courses", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Note = mongoose.model("Note", noteSchema);