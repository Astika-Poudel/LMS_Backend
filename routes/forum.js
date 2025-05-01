import express from "express";
import { getForumPosts, createForumPost, addComment, addReaction, getTaggableUsers } from "../controllers/forum.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.get("/forum/:courseId", isAuth, getForumPosts);
router.post("/forum/:courseId", isAuth, createForumPost);
router.post("/forum/:courseId/:postId/comment", isAuth, addComment);
router.post("/forum/:courseId/:postId/reaction", isAuth, addReaction);
router.get("/forum/:courseId/users", isAuth, getTaggableUsers);

export default router;