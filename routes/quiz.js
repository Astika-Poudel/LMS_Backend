import express from "express";
import { createQuiz, submitQuiz, getQuiz, getAllQuizzes } from "../controllers/quiz.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/quiz/new", isAuth, createQuiz);
router.post("/quiz/:quizId/submit", isAuth, submitQuiz);
router.get("/quiz/:quizId", isAuth, getQuiz);
router.get("/quiz/all", isAuth, getAllQuizzes);

export default router;