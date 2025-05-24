import TryCatch from "../middlewares/TryCatch.js";
import { CourseRating } from "../models/CourseRating.js";
import { Courses } from "../models/Courses.js";
import { User } from "../models/User.js";

export const submitCourseRating = TryCatch(async (req, res) => {
  const { courseId, rating, feedback, studentId } = req.body;

  if (!courseId || !rating || !studentId) {
    return res.status(400).json({ message: "Course ID, rating, and student ID are required" });
  }

  const course = await Courses.findById(courseId);
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const student = await User.findById(studentId);
  if (!student || student.role.toLowerCase() !== "student") {
    return res.status(404).json({ message: "Student not found" });
  }

  const existingRating = await CourseRating.findOne({ courseId, studentId });
  if (existingRating) {
    return res.status(400).json({ message: "You have already rated this course" });
  }

  const courseRating = await CourseRating.create({
    courseId,
    studentId,
    rating,
    feedback,
  });

  // Update student's ratings
  await User.findByIdAndUpdate(studentId, {
    $push: {
      studentRatings: {
        courseId,
        rating,
        feedback,
        createdAt: courseRating.createdAt,
      },
    },
  });

  // Update course average rating
  const ratings = await CourseRating.find({ courseId });
  const totalRatings = ratings.length;
  const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

  await Courses.findByIdAndUpdate(courseId, {
    averageRating: Number(averageRating.toFixed(1)),
    ratingCount: totalRatings,
  });

  res.status(201).json({
    success: true,
    message: "Course rating submitted successfully",
    rating: courseRating,
  });
});

export const getCourseRatings = TryCatch(async (req, res) => {
  const { courseId } = req.params;

  const ratings = await CourseRating.find({ courseId }).populate(
    "studentId",
    "firstname lastname"
  );

  res.status(200).json({
    success: true,
    ratings,
  });
});