import express from "express";
import { addLectures, createCourse, deleteCourse, deleteLecture, getAdminStats } from "../controllers/admin.js";
import { isAdmin, isAuth } from "../middlewares/isAuth.js";
import { uploadFiles } from "../middlewares/multer.js";

const router = express.Router();

// Routes for creating courses, adding lectures, and deleting them
router.get("/admin/stats", isAuth, isAdmin, getAdminStats);
router.post("/admin/course/new", uploadFiles, createCourse);
router.post("/course/:id", isAuth, isAdmin, uploadFiles, addLectures);
router.delete("/course/:id", isAuth, isAdmin, deleteCourse);
router.delete("/lecture/:id", isAuth, isAdmin, deleteLecture);

export default router;
