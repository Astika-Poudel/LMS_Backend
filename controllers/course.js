import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";


// Example for /api/course/all
export const getAllCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find().populate("Tutor");
  res.status(200).json({ success: true, courses });
});

export const getSingleCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id).populate("Lectures"); // Populate lectures

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  res.json({
    success: true,
    course,
  });
});

export const fetchLectures = TryCatch(async (req, res) => {
  const { id } = req.params;

  console.log("Fetching lectures for course ID:", id); // Add this line

  if (!id) {
    return res.status(400).json({ message: "Course ID is required" });
  }

  const lectures = await Lecture.find({ course: id });

  console.log("Lectures found:", lectures); // Add this line

  if (!lectures || lectures.length === 0) {
    return res.status(404).json({ message: "No lectures found for this course" });
  }

  res.status(200).json({
    success: true,
    lectures,
  });
});


// Fetch a single lecture by ID
export const fetchLecture = TryCatch(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Lecture ID is required" });
  }

  const lecture = await Lecture.findById(id);

  if (!lecture) {
    return res.status(404).json({ message: "Lecture not found" });
  }

  res.status(200).json({
    success: true,
    lecture,
  });
});
