import TryCatch from "../middlewares/TryCatch.js";
import { Quiz } from "../models/Quiz.js";
import { Courses } from "../models/Courses.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";

export const createQuiz = TryCatch(async (req, res) => {
    const { title, description, courseId, questionsPool, questionCount, type } = req.body;
    const tutorId = req.user._id;

    if (!type || !["beginner", "advanced"].includes(type)) {
        return res.status(400).json({ message: "Quiz type must be 'beginner' or 'advanced'" });
    }

    const course = await Courses.findById(courseId);
    if (!course || course.Tutor.toString() !== tutorId.toString()) {
        return res.status(404).json({ message: "Course not found or not assigned to you" });
    }

    const quiz = await Quiz.create({
        title,
        description,
        course: courseId,
        createdBy: tutorId,
        questionsPool,
        questionCount,
    });

    const updateField = type === "advanced" ? "advancedQuiz" : "beginnerQuiz";
    await Courses.findByIdAndUpdate(courseId, { [updateField]: quiz._id });

    res.status(201).json({ success: true, message: "Quiz created", quiz });
});

export const submitQuiz = TryCatch(async (req, res) => {
    const { quizId } = req.params;
    const { answers } = req.body;
    const studentId = req.user._id;

    const quiz = await Quiz.findById(quizId).populate("course");
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const existingSubmission = quiz.submissions.find(sub => sub.student.toString() === studentId.toString());
    if (existingSubmission && existingSubmission.score >= quiz.course.passingScore) {
        return res.status(400).json({ message: "You have already passed this quiz" });
    }

    const selectedQuestions = quiz.questionsPool
        .sort(() => 0.5 - Math.random())
        .slice(0, quiz.questionCount);

    let correctAnswers = 0;
    answers.forEach((answer, idx) => {
        const question = selectedQuestions[answer.questionIndex];
        const correctOption = question.options.findIndex(opt => opt.isCorrect);
        if (correctOption === answer.selectedOption) correctAnswers++;
    });
    const score = (correctAnswers / selectedQuestions.length) * 100;

    if (existingSubmission) {
        existingSubmission.answers = answers;
        existingSubmission.score = Math.max(existingSubmission.score, score);
        existingSubmission.submittedAt = Date.now();
    } else {
        quiz.submissions.push({ student: studentId, answers, score });
    }
    await quiz.save();

    const course = quiz.course;
    const updateField = quiz._id.toString() === course.beginnerQuiz?.toString()
        ? "courseProgress.$.beginnerQuizScore"
        : "courseProgress.$.advancedQuizScore";

    const user = await User.findOneAndUpdate(
        { _id: studentId, "courseProgress.course": course._id },
        { $set: { [updateField]: score } },
        { new: true }
    );

    const allSubmissions = quiz.submissions.filter(sub => sub.score >= course.passingScore);
    await Courses.findByIdAndUpdate(course._id, {
        averageQuizScore: allSubmissions.length ? allSubmissions.reduce((sum, sub) => sum + sub.score, 0) / allSubmissions.length : 0,
    });

    const progress = user.courseProgress.find(p => p.course.toString() === course._id.toString());
    if (
        progress.completedBeginnerLectures &&
        progress.beginnerQuizScore >= course.passingScore &&
        progress.completedAdvancedLectures &&
        progress.advancedQuizScore >= course.passingScore
    ) {
        await User.updateOne(
            { _id: studentId, "courseProgress.course": course._id },
            { $set: { "courseProgress.$.certificateAwarded": true } }
        );
        await Notification.create({
            recipient: studentId,
            message: `Congratulations! You've earned a certificate for completing ${course.title}!`,
            courseId: course._id,
        });
    } else if (quiz._id.toString() === course.beginnerQuiz?.toString() && score >= course.passingScore) {
        await Notification.create({
            recipient: studentId,
            message: `You've passed the beginner quiz for ${course.title}! Advanced lectures are now unlocked.`,
            courseId: course._id,
        });
    }

    res.json({ success: true, score, questions: selectedQuestions });
});

export const getQuiz = TryCatch(async (req, res) => {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const selectedQuestions = quiz.questionsPool
        .sort(() => 0.5 - Math.random())
        .slice(0, quiz.questionCount);

    res.json({ success: true, quiz: { ...quiz.toJSON(), questions: selectedQuestions } });
});

export const getAllQuizzes = TryCatch(async (req, res) => {
    const quizzes = await Quiz.find({ createdBy: req.user._id }).populate("course");
    res.status(200).json({ success: true, quizzes });
});