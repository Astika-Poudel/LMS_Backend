import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { enrollCourse, getEnrolledCourses } from "../controllers/enroll.js";

const router = express.Router();

router.post("/user/enroll/:courseId", isAuth, enrollCourse);
router.get("/user/enrolled", isAuth, getEnrolledCourses);

export default router;