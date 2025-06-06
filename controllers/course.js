import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { Quiz } from "../models/Quiz.js";

export const getAllCourses = TryCatch(async (req, res) => {
    const courses = await Courses.find().populate("Tutor");
    res.status(200).json({ success: true, courses });
});

export const getSingleCourse = TryCatch(async (req, res) => {
    const course = await Courses.findById(req.params.id).populate("Tutor");
    if (!course) {
        return res.status(404).json({ message: "Course not found" });
    }
    res.json({ success: true, course });
});

export const fetchLectures = TryCatch(async (req, res) => {
    const { id } = req.params;
    console.log("Fetching lectures for course ID:", id);

    if (!id) {
        return res.status(400).json({ message: "Course ID is required" });
    }

    const course = await Courses.findById(id);
    if (!course) {
        return res.status(404).json({ message: "Course not found" });
    }

    const lectures = await Lecture.find({ course: id });
    console.log("Lectures found:", lectures);

    res.status(200).json({ success: true, lectures: lectures || [] });
});

export const fetchLecture = TryCatch(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: "Lecture ID is required" });
    }

    const lecture = await Lecture.findById(id);
    if (!lecture) {
        return res.status(404).json({ message: "Lecture not found" });
    }

    res.status(200).json({ success: true, lecture });
});

export const getStudentCourseProgress = TryCatch(async (req, res) => {
    const { courseId } = req.params;
    console.log("Received request for courseId:", courseId);
    console.log("req.userId:", req.userId);

    if (!req.userId) {
        return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
        console.error("User not found for ID:", req.userId);
        return res.status(404).json({ message: "User not found" });
    }

    const course = await Courses.findById(courseId);
    if (!course) {
        console.error("Course not found for ID:", courseId);
        return res.status(404).json({ message: "Course not found" });
    }

    if (!user.enrolledCourses.some((c) => c.toString() === courseId)) {
        console.log("User not enrolled in course:", courseId);
        return res.status(404).json({ message: "User not enrolled in this course" });
    }

    let progress = user.courseProgress.find((p) => p.course.toString() === courseId);
    if (!progress) {
        progress = {
            course: courseId,
            watchedBeginnerLectures: [],
            completedBeginnerLectures: false,
            beginnerQuizScore: null,
            watchedAdvancedLectures: [],
            completedAdvancedLectures: false,
            advancedQuizScore: null,
            certificateAwarded: false,
        };
        user.courseProgress.push(progress);
        await user.save();
    }

    const populatedUser = await User.findById(req.userId).populate({
        path: "courseProgress.course",
        match: { _id: courseId },
        populate: [
            { path: "beginnerLectures" },
            { path: "advancedLectures" },
            { path: "beginnerQuiz" },
            { path: "advancedQuiz" },
        ],
    });

    progress = populatedUser.courseProgress.find((p) => p.course?._id.toString() === courseId);
    res.json({ success: true, progress: progress || {} });
});

export const markLectureWatched = TryCatch(async (req, res) => {
    const { courseId, lectureId } = req.params;
    const user = await User.findById(req.userId);

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const course = await Courses.findById(courseId).populate("beginnerLectures advancedLectures");
    if (!course) {
        return res.status(404).json({ message: "Course not found" });
    }

    const lecture = await Lecture.findById(lectureId);
    if (!lecture || lecture.course.toString() !== courseId) {
        return res.status(404).json({ message: "Lecture not found in this course" });
    }

    const progress = user.courseProgress.find((p) => p.course.toString() === courseId);
    if (!progress) {
        return res.status(404).json({ message: "Progress not found for this course" });
    }

    const isBeginner = course.beginnerLectures.some((l) => l._id.toString() === lectureId);
    const watchedField = isBeginner ? "watchedBeginnerLectures" : "watchedAdvancedLectures";
    const completedField = isBeginner ? "completedBeginnerLectures" : "completedAdvancedLectures";
    const lectureArray = isBeginner ? course.beginnerLectures : course.advancedLectures;

    if (!progress[watchedField].some((l) => l.lecture.toString() === lectureId)) {
        progress[watchedField].push({ lecture: lectureId, watchedAt: new Date() });
        if (progress[watchedField].length === lectureArray.length) {
            progress[completedField] = true;
            await Notification.create({
                recipient: user._id,
                message: `You've completed all ${isBeginner ? "beginner" : "advanced"} lectures for ${course.title}!`,
                courseId: course._id,
            });
        }
        await user.save();

        const enrolledStudents = course.enrolledStudents.length;
        const completedStudents = await User.countDocuments({
            "courseProgress.course": course._id,
            "courseProgress.certificateAwarded": true,
        });
        await Courses.findByIdAndUpdate(course._id, {
            completionRate: enrolledStudents ? (completedStudents / enrolledStudents) * 100 : 0,
        });
    }

    res.json({ message: "Lecture marked as watched" });
});

export const getCourseQuizzes = TryCatch(async (req, res) => {
    const { id } = req.params;
    const course = await Courses.findById(id).populate("beginnerQuiz advancedQuiz");
    if (!course) {
        return res.status(404).json({ message: "Course not found" });
    }

    const quizzes = [];
    if (course.beginnerQuiz) quizzes.push(course.beginnerQuiz);
    if (course.advancedQuiz) quizzes.push(course.advancedQuiz);

    res.status(200).json({ success: true, quizzes });
});

// Updated: Fetch progress of all students enrolled in a course (for tutors)
export const getAllStudentsProgress = TryCatch(async (req, res) => {
    const { id } = req.params; // Course ID
    const tutorId = req.userId; // From auth middleware (req.userId is set by isAuth)

    if (!tutorId) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // Fetch the course and populate enrolled students
    const course = await Courses.findById(id)
        .populate("enrolledStudents")
        .populate("beginnerLectures")
        .populate("advancedLectures")
        .populate("beginnerQuiz")
        .populate("advancedQuiz");

    if (!course) {
        return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Log tutor and course details for debugging
    console.log("Authenticated Tutor ID:", tutorId);
    console.log("Raw Course Tutor:", course.Tutor); // Added for debugging
    console.log("Course Tutor ID:", course.Tutor?.toString()); // Added for debugging
    console.log("Course ID:", id);

    // Check if the authenticated user is the tutor of this course
    if (!course.Tutor || course.Tutor.toString() !== tutorId.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized: You are not the tutor of this course" });
    }

    // Fetch progress for all enrolled students
    const students = await User.find({ _id: { $in: course.enrolledStudents } })
        .select("firstname lastname email courseProgress")
        .populate({
            path: "courseProgress.course",
            match: { _id: id },
            populate: [
                { path: "beginnerLectures" },
                { path: "advancedLectures" },
                { path: "beginnerQuiz" },
                { path: "advancedQuiz" },
            ],
        });

    // Calculate progress for each student
    const studentsWithProgress = students.map((student) => {
        const progress = student.courseProgress.find((p) => p.course?._id.toString() === id) || {
            watchedBeginnerLectures: [],
            watchedAdvancedLectures: [],
            beginnerQuizScore: null,
            advancedQuizScore: null,
        };

        // Calculate progress percentage
        const totalLectures = (course.beginnerLectures?.length || 0) + (course.advancedLectures?.length || 0);
        const watchedLectures = progress.watchedBeginnerLectures.length + progress.watchedAdvancedLectures.length;
        const progressPercentage = totalLectures ? Math.round((watchedLectures / totalLectures) * 100) : 0;

        // Calculate quizzes completed
        const totalQuizzes = (course.beginnerQuiz ? 1 : 0) + (course.advancedQuiz ? 1 : 0);
        const quizzesCompleted = (progress.beginnerQuizScore !== null ? 1 : 0) + (progress.advancedQuizScore !== null ? 1 : 0);

        return {
            _id: student._id,
            name: `${student.firstname} ${student.lastname}`,
            email: student.email,
            progress: progressPercentage,
            quizzesCompleted: quizzesCompleted,
            totalQuizzes: totalQuizzes,
        };
    });

    res.status(200).json({ success: true, students: studentsWithProgress });
});