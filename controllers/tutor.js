// controllers/tutor.js
import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";

export const getTutorStats = TryCatch(async (req, res) => {
  const tutorId = req.user._id;
  const assignedCourses = await Courses.countDocuments({ Tutor: tutorId });
  const courses = await Courses.find({ Tutor: tutorId });
  const totalStudents = courses.reduce(
    (acc, course) => acc + (course.enrolledStudents?.length || 0),
    0
  );
  res.status(200).json({
    success: true,
    stats: { assignedCourses, totalStudents },
  });
});

export const getTutorCourses = TryCatch(async (req, res) => {
  const tutorId = req.user._id;
  const courses = await Courses.find({ Tutor: tutorId }).populate("Tutor");
  res.status(200).json({ success: true, courses });
});

export const assignTutorToCourse = TryCatch(async (req, res) => {
  const { courseId } = req.params;
  const { tutorId } = req.body; // Change to expect tutorId instead of tutorName

  const course = await Courses.findById(courseId);
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const tutorUser = await User.findOne({ _id: tutorId, role: { $regex: "^tutor$", $options: "i" } });
  if (!tutorUser) {
    return res.status(404).json({ message: "Tutor not found" });
  }

  course.Tutor = tutorId;
  await course.save();

  const notification = await Notification.create({
    recipient: tutorUser._id,
    message: `You have been assigned to tutor the course "${course.title}"`,
    courseId: course._id,
  });

  const io = req.app.get("io");
  io.to(tutorUser._id.toString()).emit("newNotification", notification);

  res.status(200).json({
    success: true,
    message: "Tutor assigned successfully",
  });
});

export const removeTutorFromCourse = TryCatch(async (req, res) => {
  const { courseId } = req.params;
  const course = await Courses.findById(courseId);
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }
  course.Tutor = null;
  await course.save();
  res.status(200).json({ success: true, message: "Tutor removed successfully" });
});