import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { promisify } from "util";
import { rm } from "fs";
import fs from "fs";
import { User } from "../models/User.js";

export const getAdminStats = TryCatch(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalStudents = await User.countDocuments({ 
    role: { $regex: "^student$", $options: "i" }
  });
  const totalTutors = await User.countDocuments({
    role: { $regex: "^tutor$", $options: "i" }
  });
  res.status(200).json({
    totalUsers,
    totalStudents,
    totalTutors,
  });
});



export const createCourse = TryCatch(async (req, res) => {
  const { title, description, category, duration, price, Tutor } = req.body;
  const image = req.file;

  console.log("Received image path:", image?.path);  

  if (!image) {
    return res.status(400).json({ message: "Image file is required" });
  }

  const newCourse = await Courses.create({
    title,
    description,
    category,
    image: image?.path,
    duration,
    price,
    Tutor
  });

  res.status(201).json({
    message: "Course Created Successfully",
    course: newCourse,
  });
});


export const addLectures = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  if (!course) {
    return res.status(404).json({ message: "No Course with this id" });
  }

  const { title, description } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "Video file is required" });
  }

  const lecture = await Lecture.create({
    title,
    description,
    video: file?.path,
    course: course._id,
  });

  res.status(201).json({
    message: "Lecture Added",
    lecture,
  });
});


export const deleteLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);

  if (!lecture) {
    return res.status(404).json({ message: "Lecture not found" });
  }

  rm(lecture.video, () => {
    console.log("Video deleted");
  });

  await lecture.deleteOne();

  res.json({ message: "Lecture Deleted" });
});


const unlinkAsync = promisify(fs.unlink);

export const deleteCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const lectures = await Lecture.find({ course: course._id });

  await Promise.all(
    lectures.map(async (lecture) => {
      await unlinkAsync(lecture.video);
      console.log("Video deleted");
    })
  );

  rm(course.image, () => {
    console.log("Image deleted");
  });

  await Lecture.find({ course: req.params.id }).deleteMany();
  await course.deleteOne();

  await User.updateMany({}, { $pull: { subscription: req.params.id } });

  res.json({
    message: "Course Deleted",
  });
});
