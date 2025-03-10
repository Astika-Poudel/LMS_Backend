import express from "express";
import { getAllCourses, getSingleCourse , fetchLecture, fetchLectures} from "../controllers/course.js";


const router = express.Router();

router.get("/course/all", getAllCourses);
router.get("/course/:id", getSingleCourse);
router.get("/lectures/:id",  fetchLectures); // Correct route
router.get("/lecture/:id",  fetchLecture);  // Correct route

export default router;
