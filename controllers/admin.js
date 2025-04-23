import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { promisify } from "util";
import fs from "fs";

const unlinkAsync = promisify(fs.unlink);

export const getAdminStats = TryCatch(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: { $regex: "^student$", $options: "i" } });
    const totalTutors = await User.countDocuments({ role: { $regex: "^tutor$", $options: "i" } });
    const totalEnrolledStudents = await User.countDocuments({ enrolledCourses: { $exists: true, $not: { $size: 0 } } });

    res.status(200).json({ totalUsers, totalStudents, totalTutors, totalEnrolledStudents });
});

export const createCourse = TryCatch(async (req, res) => {
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    const { title, description, category, duration, price, Tutor } = req.body;
    const image = req.file;

    if (!image) {
        return res.status(400).json({ message: "Image file is required" });
    }

    const imagePath = image.path.replace(/\\/g, '/');

    if (!title || !description || !category || !duration || !price) {
        return res.status(400).json({ message: "All fields (title, description, category, duration, price) are required" });
    }

    let tutorId = null;
    if (Tutor) {
        const [firstname, lastname] = Tutor.split(" ");
        const tutorUser = await User.findOne({
            firstname,
            lastname: lastname || "",
            role: { $regex: "^tutor$", $options: "i" },
        });
        if (!tutorUser) {
            console.log(`Tutor not found: ${Tutor}`);
        } else {
            tutorId = tutorUser._id;
        }
    }

    const newCourse = await Courses.create({
        title,
        description,
        category,
        image: imagePath,
        duration: Number(duration),
        price: Number(price),
        Tutor: tutorId,
    });

    if (tutorId) {
        const tutorUser = await User.findById(tutorId);
        const notification = await Notification.create({
            recipient: tutorUser._id,
            message: `LearnNepal has assigned you to the course "${title}"`,
            courseId: newCourse._id,
        });
        const io = req.app.get("io");
        io.to(tutorUser._id.toString()).emit("newNotification", notification);
        console.log(`Notification sent to tutor ${tutorUser._id}:`, notification);
    }

    res.status(201).json({
        message: "Course Created Successfully",
        course: newCourse,
    });
});

export const editCourse = TryCatch(async (req, res) => {
    const { id } = req.params;
    const { title, description, category, duration, price, Tutor } = req.body;

    const course = await Courses.findById(id).populate('Tutor'); // Populate Tutor to get the full user object
    if (!course) {
        return res.status(404).json({ message: "Course not found" });
    }

    let tutorId = course.Tutor?._id || null;
    if (Tutor && Tutor !== `${course.Tutor?.firstname} ${course.Tutor?.lastname}`) {
        const [firstname, lastname] = Tutor.split(" ");
        const tutorUser = await User.findOne({
            firstname,
            lastname: lastname || "",
            role: { $regex: "^tutor$", $options: "i" },
        });
        if (tutorUser) {
            tutorId = tutorUser._id;
        } else {
            return res.status(404).json({ message: `Tutor ${Tutor} not found` });
        }
    }

    const updateData = {
        title: title || course.title,
        description: description || course.description,
        category: category || course.category,
        duration: duration ? Number(duration) : course.duration,
        price: price ? Number(price) : course.price,
        Tutor: tutorId,
    };

    if (req.file) {
        if (course.image) {
            try {
                await unlinkAsync(course.image);
            } catch (error) {
                console.error("Error deleting old image:", error);
            }
        }
        updateData.image = req.file.path.replace(/\\/g, '/');
    }

    const updatedCourse = await Courses.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('Tutor');

    if (tutorId && tutorId !== course.Tutor?._id) {
        const tutorUser = await User.findById(tutorId);
        if (tutorUser) {
            const notification = await Notification.create({
                recipient: tutorUser._id,
                message: `You have been assigned to tutor the course "${updatedCourse.title}"`,
                courseId: updatedCourse._id,
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

export const addLectures = TryCatch(async (req, res) => {
    const course = await Courses.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "No Course with this id" });

    const { title, description, type } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: "Video file is required" });
    if (!type || !["beginner", "advanced"].includes(type)) {
        return res.status(400).json({ message: "Lecture type must be 'beginner' or 'advanced'" });
    }

    const lecture = await Lecture.create({
        title,
        description,
        video: file.path.replace(/\\/g, '/'),
        course: course._id,
    });

    const updateField = type === "advanced" ? "advancedLectures" : "beginnerLectures";
    await Courses.findByIdAndUpdate(course._id, {
        $push: { [updateField]: lecture._id },
    });

    res.status(201).json({ message: "Lecture Added", lecture });
});

export const deleteLecture = TryCatch(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ message: "Lecture not found" });

    try {
        await unlinkAsync(lecture.video);
        console.log("Video deleted");
    } catch (error) {
        console.error("Error deleting video:", error);
    }

    await Courses.findByIdAndUpdate(lecture.course, {
        $pull: { beginnerLectures: lecture._id, advancedLectures: lecture._id },
    });
    await lecture.deleteOne();

    res.json({ message: "Lecture Deleted" });
});

export const deleteCourse = TryCatch(async (req, res) => {
    const course = await Courses.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lectures = await Lecture.find({ course: course._id });
    await Promise.all(
        lectures.map(async (lecture) => {
            try {
                await unlinkAsync(lecture.video);
                console.log("Video deleted");
            } catch (error) {
                console.error("Error deleting video:", error);
            }
        })
    );

    try {
        await unlinkAsync(course.image);
        console.log("Image deleted");
    } catch (error) {
        console.error("Error deleting image:", error);
    }

    await Lecture.find({ course: req.params.id }).deleteMany();
    await course.deleteOne();
    await User.updateMany({}, { $pull: { subscription: req.params.id } });

    res.json({ message: "Course Deleted" });
});

export const editLecture = TryCatch(async (req, res) => {
    const { id } = req.params;
    console.log("Editing lecture with ID:", id);
    console.log("Request body:", req.body);
    console.log("File:", req.file);

    if (!id) return res.status(400).json({ message: "Lecture ID is required" });

    const { title, description, type } = req.body;
    const lecture = await Lecture.findById(id);
    if (!lecture) return res.status(404).json({ message: "Lecture with the specified ID does not exist" });

    const course = await Courses.findById(lecture.course);
    let currentType = null;
    if (course.beginnerLectures.includes(lecture._id)) {
        currentType = "beginner";
    } else if (course.advancedLectures.includes(lecture._id)) {
        currentType = "advanced";
    }

    const updateData = {
        title: title || lecture.title,
        description: description || lecture.description,
    };

    if (req.file) {
        if (lecture.video) {
            try {
                await unlinkAsync(lecture.video);
                console.log("Old video deleted successfully");
            } catch (error) {
                console.error("Error deleting old video:", error);
            }
        }
        updateData.video = req.file.path.replace(/\\/g, '/');
    }

    const updatedLecture = await Lecture.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updatedLecture) return res.status(404).json({ message: "Lecture update failed" });

    if (type && type !== currentType && ["beginner", "advanced"].includes(type)) {
        const removeField = currentType === "advanced" ? "advancedLectures" : "beginnerLectures";
        const addField = type === "advanced" ? "advancedLectures" : "beginnerLectures";

        await Courses.findByIdAndUpdate(lecture.course, {
            $pull: { [removeField]: lecture._id },
            $push: { [addField]: lecture._id },
        });
    }

    console.log("Lecture updated successfully:", updatedLecture);
    res.status(200).json({ success: true, message: "Lecture updated successfully", lecture: updatedLecture });
});