import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { createNote, getNotes, updateNote, deleteNote } from "../controllers/note.js";

const router = express.Router();

// Routes for note operations
router.post("/notes", isAuth, createNote);
router.get("/notes/:courseId", isAuth, getNotes);
router.put("/notes/:id", isAuth, updateNote);
router.delete("/notes/:id", isAuth, deleteNote);

export default router;