import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { enrollCourse, getEnrolledCourses } from "../controllers/enroll.js";

const router = express.Router();

// Route to enroll a user in a course
router.post("/user/enroll/:courseId", isAuth, enrollCourse);

// Route to get user's enrolled courses
router.get("/user/enrolled", isAuth, getEnrolledCourses);

export default router;