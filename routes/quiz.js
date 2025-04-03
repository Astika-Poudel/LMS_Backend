import express from "express";
import { createQuiz, getCourseQuizzes, getTutorQuizzes, submitQuiz, getQuizHistory } from "../controllers/quiz.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/quiz/new", isAuth, createQuiz); // Tutor creates quiz
router.get("/course/:courseId/quizzes", isAuth, getCourseQuizzes); // Quizzes for a course
router.get("/tutor/quizzes", isAuth, getTutorQuizzes); // All tutor's quizzes
router.post("/quiz/:quizId/submit", isAuth, submitQuiz); // Student submits quiz
router.get("/quiz/history", isAuth, getQuizHistory); // Student quiz history

export default router;