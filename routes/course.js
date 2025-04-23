import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { getAllCourses, getSingleCourse, fetchLecture, fetchLectures, getStudentCourseProgress, markLectureWatched, getCourseQuizzes } from "../controllers/course.js";

const router = express.Router();

router.get("/course/all", getAllCourses);
router.get("/course/:id", getSingleCourse);
router.get("/lectures/:id", fetchLectures);
router.get("/lecture/:id", fetchLecture);
router.get("/student/course/progress/:courseId",isAuth, getStudentCourseProgress);
router.post("/course/mark-watched/:courseId/:lectureId", isAuth, markLectureWatched);
router.get("/course/:id/quizzes", getCourseQuizzes); // New route

export default router;