import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["like", "upvote"], default: "like" },
});

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  taggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  reactions: [reactionSchema],
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  createdAt: { type: Date, default: Date.now },
});

const forumPostSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Courses", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  taggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  reactions: [reactionSchema],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const ForumPost = mongoose.model("ForumPost", forumPostSchema);
export const Comment = mongoose.model("Comment", commentSchema);