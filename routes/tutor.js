import express from "express";
import { getTutorStats, getTutorCourses, assignTutorToCourse, removeTutorFromCourse } from "../controllers/tutor.js";
import { isAuth, isAdmin } from "../middlewares/isAuth.js";

const router = express.Router();

router.get("/tutor/stats", isAuth, getTutorStats);
router.get("/tutor/courses", isAuth, getTutorCourses);
router.put("/tutor/course/:courseId/assign-tutor", isAuth, isAdmin, assignTutorToCourse);
router.put("/tutor/course/:courseId/remove-tutor", isAuth, isAdmin, removeTutorFromCourse);

export default router;