import TryCatch from "../middlewares/TryCatch.js";
import { User } from "../models/User.js";
import { Courses } from "../models/Courses.js";

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

  await User.findByIdAndUpdate(
    req.userId,
    { $push: { enrolledCourses: courseId } },
    { new: true }
  );

  await Courses.findByIdAndUpdate(
    courseId,
    { $push: { enrolledStudents: req.userId } },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Successfully enrolled in the course",
    course: course,
  });
});

// Get user's enrolled courses
export const getEnrolledCourses = TryCatch(async (req, res) => {
    // Find user and populate enrolled courses
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