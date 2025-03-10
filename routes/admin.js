import express from "express";
import { addLectures, createCourse, deleteCourse, deleteLecture, getAdminStats, editCourse, editLecture } from "../controllers/admin.js";
import {  isAuth } from "../middlewares/isAuth.js";
import { uploadFiles } from "../middlewares/multer.js";

const router = express.Router();

// Routes for creating courses, adding lectures, and deleting them
router.get("/admin/stats", isAuth,  getAdminStats);
router.post("/admin/course/new", uploadFiles, createCourse);
router.post("/admin/course/:id",  uploadFiles, addLectures);
router.delete("/course/:id", isAuth,  deleteCourse); 
router.put("/admin/course/edit/:id", isAuth,  uploadFiles, editCourse);
router.delete("/admin/lecture/:id", isAuth, deleteLecture);
router.put("/admin/lecture/edit/:id", isAuth,  uploadFiles, editLecture);


export default router;
