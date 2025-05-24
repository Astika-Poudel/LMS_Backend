import express from "express";
import { fetchTutors, getTutorStats, getTutorCourses, assignTutorToCourse, removeTutorFromCourse } from "../controllers/tutor.js";
import { isAuth, isAdmin } from "../middlewares/isAuth.js";
import { submitTutorRating, fetchTutorRatings, fetchAllTutorRatings } from "../controllers/tutor.js";

const router = express.Router();

router.get("/tutor/stats", isAuth, getTutorStats);
router.get("/tutor/courses", isAuth, getTutorCourses);
router.get("/tutors", isAuth, isAdmin, fetchTutors);
router.put("/tutor/course/:courseId/assign-tutor", isAuth, isAdmin, assignTutorToCourse);
router.put("/tutor/course/:courseId/remove-tutor", isAuth, isAdmin, removeTutorFromCourse);
router.post("/submit-rating", submitTutorRating);
router.get("/ratings", fetchTutorRatings);
router.get("/:courseId", fetchTutorRatings);
router.get("/ratings/all", fetchAllTutorRatings);

export default router;




