import TryCatch from "../middlewares/TryCatch.js";
import { Note } from "../models/Note.js";

// Create a new note
export const createNote = TryCatch(async (req, res) => {
  const { title, description, lectureId, courseId } = req.body;
  const userId = req.userId;

  if (!title || !description || !lectureId || !courseId) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const note = await Note.create({
    title,
    description,
    lectureId,
    courseId,
    userId,
  });

  res.status(201).json({ success: true, message: "Note created successfully", note });
});

// Fetch all notes for a user in a course
export const getNotes = TryCatch(async (req, res) => {
  const { courseId } = req.params;
  const userId = req.userId;

  const notes = await Note.find({ userId, courseId }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, notes });
});

// Update a note
export const updateNote = TryCatch(async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  const userId = req.userId;

  const note = await Note.findOne({ _id: id, userId });
  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }

  note.title = title || note.title;
  note.description = description || note.description;
  await note.save();

  res.status(200).json({ success: true, message: "Note updated successfully", note });
});

// Delete a note
export const deleteNote = TryCatch(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  const note = await Note.findOneAndDelete({ _id: id, userId });
  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }

  res.status(200).json({ success: true, message: "Note deleted successfully" });
});