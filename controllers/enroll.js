import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { User } from "../models/User.js";

export const enrollCourse = TryCatch(async (req, res) => {
  const { courseId } = req.params;

  if (!courseId) {
    return res.status(400).json({
      success: false,
      message: "Course ID is required",
    });
  }

  console.log("User ID from request:", req.userId); // Debug log

  const course = await Courses.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found",
    });
  }

  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.enrolledCourses.includes(courseId)) {
    return res.status(400).json({
      success: false,
      message: "Already enrolled in this course",
    });
  }

  try {
    await Promise.all([
      User.findByIdAndUpdate(
        req.userId,
        { $addToSet: { enrolledCourses: courseId } },
        { new: true }
      ),
      Courses.findByIdAndUpdate(
        courseId,
        { $addToSet: { enrolledStudents: req.userId } },
        { new: true }
      ),
    ]);
  } catch (error) {
    console.error("Enrollment sync error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to enroll: Data sync error",
    });
  }

  res.status(200).json({
    success: true,
    message: "Successfully enrolled in the course",
    course: course,
  });
});

export const getEnrolledCourses = TryCatch(async (req, res) => {
  const user = await User.findById(req.userId).populate("enrolledCourses");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    courses: user.enrolledCourses,
  });
});