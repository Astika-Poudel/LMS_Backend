import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";

export const fetchTutors = TryCatch(async (req, res) => {
  const tutors = await User.find({ role: "Tutor" }).select("firstname lastname _id");
  res.status(200).json({ success: true, tutors });
});

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
  const { tutorId } = req.body;

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

export const submitTutorRating = TryCatch(async (req, res) => {
  const { courseId, rating, feedback, studentId } = req.body;

  if (!courseId || !rating || !studentId) {
    return res.status(400).json({ message: "Course ID, rating, and student ID are required" });
  }

  const course = await Courses.findById(courseId).populate("Tutor");
  if (!course || !course.Tutor) {
    return res.status(404).json({ message: "Course or tutor not found" });
  }

  const student = await User.findById(studentId);
  if (!student || student.role.toLowerCase() !== "student") {
    return res.status(404).json({ message: "Student not found" });
  }

  const tutor = await User.findById(course.Tutor._id);
  if (!tutor) {
    return res.status(404).json({ message: "Tutor not found" });
  }

  // Check if the student has already rated this tutor for this course
  const existingRating = tutor.tutorRatings.find(
    (r) => r.courseId.toString() === courseId && r.studentId.toString() === studentId
  );
  if (existingRating) {
    return res.status(400).json({ message: "You have already rated this tutor for this course" });
  }

  // Add the new rating to the tutor's ratings array
  const newRating = {
    courseId,
    rating,
    feedback,
    studentId,
    createdAt: new Date(),
  };

  // Update the tutor document atomically
  const updatedTutor = await User.findByIdAndUpdate(
    tutor._id,
    {
      $push: { tutorRatings: newRating },
      $set: {
        tutorRatingCount: tutor.tutorRatings.length + 1,
        averageTutorRating: Number(
          ((tutor.tutorRatings.reduce((sum, r) => sum + r.rating, 0) + rating) /
            (tutor.tutorRatings.length + 1)).toFixed(1)
        ),
      },
    },
    { new: true } // Return the updated document
  );

  if (!updatedTutor) {
    return res.status(500).json({ message: "Failed to update tutor ratings" });
  }

  res.status(201).json({
    success: true,
    message: "Tutor rating submitted successfully",
  });
});

export const fetchTutorRatings = TryCatch(async (req, res) => {
  const { courseId } = req.params;

  const course = await Courses.findById(courseId).populate("Tutor");
  if (!course || !course.Tutor) {
    return res.status(404).json({ message: "Course or tutor not found" });
  }

  const tutor = await User.findById(course.Tutor._id);
  const ratings = tutor.tutorRatings.filter(
    (rating) => rating.courseId.toString() === courseId
  );

  res.status(200).json({
    success: true,
    ratings,
  });
});

export const fetchAllTutorRatings = TryCatch(async (req, res) => {
  const { tutorId } = req.query;

  if (!tutorId) {
    return res.status(400).json({ message: "Tutor ID is required" });
  }

  const tutor = await User.findById(tutorId);
  if (!tutor) {
    return res.status(404).json({ message: "Tutor not found" });
  }

  const ratings = tutor.tutorRatings || [];

  res.status(200).json({
    success: true,
    ratings,
  });
});