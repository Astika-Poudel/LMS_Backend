import express from "express";
import {
  getForumPosts,
  getForumPostById,
  createForumPost,
  addComment,
  addReaction,
  getTaggableUsers,
  deleteForumPost,
  editForumPost,
} from "../controllers/forum.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.get("/forum/:courseId/users", isAuth, getTaggableUsers);
router.get("/forum/:courseId", isAuth, getForumPosts);
router.get("/forum/:courseId/:postId", isAuth, getForumPostById);
router.post("/forum/:courseId", isAuth, createForumPost);
router.post("/forum/:courseId/:postId/comment", isAuth, addComment);
router.post("/forum/:courseId/:postId/reaction", isAuth, addReaction);
router.delete("/forum/:courseId/:postId", isAuth, deleteForumPost);
router.put("/forum/:courseId/:postId", isAuth, editForumPost);

export default router;