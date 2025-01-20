import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import { promisify } from "util";
import fs from "fs";

// Promisify the unlink method from fs for asynchronous file deletion
const unlinkAsync = promisify(fs.unlink);

// Get Admin Stats
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

// Create Course
export const createCourse = TryCatch(async (req, res) => {
  const { title, description, category, duration, price, Tutor } = req.body;
  const image = req.file;
  const imagePath = image.path.replace(/\\/g, '/');  // Normalize path for Windows

  if (!image) {
    return res.status(400).json({ message: "Image file is required" });
  }

  const newCourse = await Courses.create({
    title,
    description,
    category,
    image: imagePath,
    duration,
    price,
    Tutor
  });

  res.status(201).json({
    message: "Course Created Successfully",
    course: newCourse,
  });
});

export const editCourse = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Editing course with ID:", id);
    console.log("Request body:", req.body);
    console.log("File:", req.file);

    if (!id) {
      return res.status(400).json({ message: "Course ID is required" });
    }
    
    const { title, description, category, duration, price, Tutor } = req.body;
    
    // Ensure the course exists
    const course = await Courses.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Prepare update object
    const updateData = {
      title: title || course.title,
      description: description || course.description,
      category: category || course.category,
      duration: duration || course.duration,
      price: price || course.price,
      Tutor: Tutor || course.Tutor,
    };

    // Handle image update if new file is uploaded
    if (req.file) {
      // If there's an existing image, delete it
      if (course.image) {
        try {
          await unlinkAsync(course.image);
          console.log("Old image deleted successfully");
        } catch (error) {
          console.error("Error deleting old image:", error);
          // Continue with update even if old image deletion fails
        }
      }
      updateData.image = req.file.path.replace(/\\/g, '/');
    }

    console.log("Update data:", updateData);

    // Update the course
    const updatedCourse = await Courses.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course update failed" });
    }

    console.log("Course updated successfully:", updatedCourse);

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course: updatedCourse,
    });

  } catch (error) {
    console.error("Error in editCourse:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update course",
      error: error.message
    });
  }
};

// Add Lectures
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

// Delete Lecture
export const deleteLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);

  if (!lecture) {
    return res.status(404).json({ message: "Lecture not found" });
  }

  // Delete the video file
  try {
    await unlinkAsync(lecture.video);
    console.log("Video deleted");
  } catch (error) {
    console.error("Error deleting video:", error);
  }

  await lecture.deleteOne();

  res.json({ message: "Lecture Deleted" });
});

// Delete Course
// Delete Course
export const deleteCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const lectures = await Lecture.find({ course: course._id });

  // Delete associated lecture videos
  await Promise.all(
    lectures.map(async (lecture) => {
      try {
        await unlinkAsync(lecture.video);  // Delete video file
        console.log("Video deleted");
      } catch (error) {
        console.error("Error deleting video:", error);
      }
    })
  );

  // Delete course image
  try {
    await unlinkAsync(course.image);  // Delete image file
    console.log("Image deleted");
  } catch (error) {
    console.error("Error deleting image:", error);
  }

  // Delete lectures and course from DB
  await Lecture.find({ course: req.params.id }).deleteMany();
  await course.deleteOne();

  // Remove course from user subscriptions
  await User.updateMany({}, { $pull: { subscription: req.params.id } });

  res.json({
    message: "Course Deleted",
  });
});