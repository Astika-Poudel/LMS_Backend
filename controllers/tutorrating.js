import TryCatch from "../middlewares/TryCatch.js";
import { TutorRating } from "../models/TutorRating.js";
import { Courses } from "../models/Courses.js";

export const submitTutorRating = TryCatch(async (req, res) => {
  const { courseId, rating, feedback } = req.body;
  const studentId = req.user._id;
  const course = await Courses.findById(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }
  const existingRating = await TutorRating.findOne({ courseId, studentId });
  if (existingRating) {
    return res.status(400).json({ success: false, message: "You have already rated this tutor for this course" });
  }

  const tutorRating = new TutorRating({
    courseId,
    tutorId: course.Tutor,
    studentId,
    rating,
    feedback,
  });

  await tutorRating.save();

  res.status(200).json({ success: true, message: "Rating and feedback submitted successfully" });
});

export const getTutorRatings = TryCatch(async (req, res) => {
  const { courseId } = req.params;
  
  const ratings = await TutorRating.find({ courseId }).populate('studentId', 'firstname lastname');
  
  res.status(200).json({ success: true, ratings });
});