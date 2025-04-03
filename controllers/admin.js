import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { promisify } from "util";
import fs from "fs";

// Promisify the unlink method from fs for asynchronous file deletion
const unlinkAsync = promisify(fs.unlink);

// Get Admin Stats
export const getAdminStats = TryCatch(async (req, res) => {
  const totalUsers = await User.countDocuments();

  // Count the number of users with the role "student" (case-insensitive)
  const totalStudents = await User.countDocuments({
    role: { $regex: "^student$", $options: "i" }
  });

  // Count the number of users with the role "tutor" (case-insensitive)
  const totalTutors = await User.countDocuments({
    role: { $regex: "^tutor$", $options: "i" }
  });

  // Count the number of enrolled students (users with at least one course in enrolledCourses)
  const totalEnrolledStudents = await User.countDocuments({
    enrolledCourses: { $exists: true, $not: { $size: 0 } }
  });

  res.status(200).json({
    totalUsers,
    totalStudents,
    totalTutors,
    totalEnrolledStudents, // Add the number of enrolled students to the response
  });
});

// Modified createCourse function
export const createCourse = TryCatch(async (req, res) => {
  const { title, description, category, duration, price, Tutor } = req.body;
  const image = req.file;
  const imagePath = image.path.replace(/\\/g, '/');  // Normalize path for Windows

  if (!image) {
    return res.status(400).json({ message: "Image file is required" });
  }

  // Create the course
  const newCourse = await Courses.create({
    title,
    description,
    category,
    image: imagePath,
    duration,
    price,
    Tutor
  });
  const [firstname, lastname] = Tutor.split(" ");
  const tutorUser = await User.findOne({
    firstname,
    lastname: lastname || "", // Handle cases where lastname might be missing
    role: { $regex: "^tutor$", $options: "i" },
  });

  if (tutorUser) {
    const notification = await Notification.create({
      recipient: tutorUser._id,
      message: `LearnNepal has assigned you to the course "${title}"`,
      courseId: newCourse._id,
    });

    const io = req.app.get("io");
    io.to(tutorUser._id.toString()).emit("newNotification", notification);
    console.log(`Notification sent to tutor ${tutorUser._id}:`, notification);
  } else {
    console.log(`Tutor not found: ${Tutor}`);
  }

  res.status(201).json({
    message: "Course Created Successfully",
    course: newCourse,
  });
});


export const editCourse = TryCatch(async (req, res) => {
  const { id } = req.params;
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
      } catch (error) {
        console.error("Error deleting old image:", error);
      }
    }
    updateData.image = req.file.path.replace(/\\/g, '/');
  }

  // Update the course
  const updatedCourse = await Courses.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  // If the tutor has changed, send a notification to the new tutor
  if (Tutor && Tutor !== course.Tutor) {
    const [firstname, lastname] = Tutor.split(" ");
    const tutorUser = await User.findOne({
      firstname,
      lastname: lastname || "",
      role: { $regex: "^tutor$", $options: "i" },
    });

    if (tutorUser) {
      const notification = await Notification.create({
        recipient: tutorUser._id,
        message: `You have been assigned to tutor the course "${updatedCourse.title}"`,
        courseId: updatedCourse._id
      });
    
      const io = req.app.get("io");
      io.to(tutorUser._id.toString()).emit("newNotification", notification);
      console.log(`Notification sent to tutor ${tutorUser._id}:`, notification);
    }
  }

  res.status(200).json({
    success: true,
    message: "Course updated successfully",
    course: updatedCourse,
  });
});

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
    video: file?.path.replace(/\\/g, '/'), // Normalize path
    course: course._id, // Link the lecture to the course
  });

  // **Update the course to include the new lecture**
  await Courses.findByIdAndUpdate(course._id, {
    $push: { Lectures: lecture._id }
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
  
// Remove the lecture from the course's Lectures array
await Courses.findByIdAndUpdate(lecture.course, {
  $pull: { Lectures: lecture._id }
});
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

// Edit Lecture
export const editLecture = TryCatch(async (req, res) => {
  const { id } = req.params;
  console.log("Editing lecture with ID:", id);
  console.log("Request body:", req.body);
  console.log("File:", req.file);

  if (!id) {
    return res.status(400).json({ message: "Lecture ID is required" });
  }

  const { title, description } = req.body;

  // Ensure the lecture exists
  const lecture = await Lecture.findById(id);
  if (!lecture) {
    return res.status(404).json({ message: "Lecture with the specified ID does not exist" });
  }

  // Prepare update object
  const updateData = {
    title: title || lecture.title,
    description: description || lecture.description,
  };

  // Handle video file update if a new file is uploaded
  if (req.file) {
    // If there's an existing video, delete it
    if (lecture.video) {
      try {
        await unlinkAsync(lecture.video);
        console.log("Old video deleted successfully");
      } catch (error) {
        console.error("Error deleting old video:", error);
        // Continue with the update even if old video deletion fails
      }
    }
    // Set the new video path
    updateData.video = req.file.path.replace(/\\/g, '/');
  }

  console.log("Update data:", updateData);

  // Update the lecture in the database
  const updatedLecture = await Lecture.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!updatedLecture) {
    return res.status(404).json({ message: "Lecture update failed" });
  }

  console.log("Lecture updated successfully:", updatedLecture);

  res.status(200).json({
    success: true,
    message: "Lecture updated successfully",
    lecture: updatedLecture,
  });
});