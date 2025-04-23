import express from "express";
import { submitTutorRating, getTutorRatings } from "../controllers/tutorrating.js";

const router = express.Router();

router.post("/submit-rating", submitTutorRating);
router.get("/:courseId", getTutorRatings);

export default router;