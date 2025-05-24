import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
    getAllCourses,
    getSingleCourse,
    fetchLecture,
    fetchLectures,
    getStudentCourseProgress,
    markLectureWatched,
    getCourseQuizzes,
    getAllStudentsProgress,
} from "../controllers/course.js";

import { submitCourseRating, getCourseRatings } from "../controllers/courserating.js";

const router = express.Router();

router.get("/course/all", getAllCourses);
router.get("/course/:id", getSingleCourse);
router.get("/lectures/:id", fetchLectures);
router.get("/lecture/:id", fetchLecture);
router.get("/student/course/progress/:courseId", isAuth, getStudentCourseProgress);
router.post("/course/mark-watched/:courseId/:lectureId", isAuth, markLectureWatched);
router.get("/course/:id/quizzes", getCourseQuizzes);
router.get("/course/:id/students/progress", isAuth, getAllStudentsProgress);
router.post("/course/rating/submit", isAuth, submitCourseRating);
router.get("/course/ratings/:courseId", getCourseRatings);

export default router;