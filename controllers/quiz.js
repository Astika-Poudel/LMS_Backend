import TryCatch from "../middlewares/TryCatch.js";
import { Quiz } from "../models/Quiz.js";
import { Courses } from "../models/Courses.js";
import { User } from "../models/User.js";

// Create a new quiz
export const createQuiz = TryCatch(async (req, res) => {
  const { title, description, courseId, dueDate, questions } = req.body;
  const tutorId = req.user._id;

  const course = await Courses.findById(courseId);
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const quiz = await Quiz.create({
    title,
    description,
    course: courseId,
    createdBy: tutorId,
    dueDate,
    questions,
  });

  res.status(201).json({
    success: true,
    message: "Quiz created successfully",
    quiz,
  });
});

// Get quizzes for a specific course
export const getCourseQuizzes = TryCatch(async (req, res) => {
  const { courseId } = req.params;
  const quizzes = await Quiz.find({ course: courseId }).populate("course", "title");
  res.json({ success: true, quizzes });
});

// Get all quizzes created by the tutor
export const getTutorQuizzes = TryCatch(async (req, res) => {
  const tutorId = req.user._id;
  const quizzes = await Quiz.find({ createdBy: tutorId }).populate("course", "title");
  res.json({ success: true, quizzes });
});

// Submit quiz answers and auto-grade
export const submitQuiz = TryCatch(async (req, res) => {
  const { quizId } = req.params;
  const { answers } = req.body; // Array of { questionIndex, selectedOption }
  const studentId = req.user._id;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });

  // Check if student already submitted
  if (quiz.submissions.some(sub => sub.student.toString() === studentId)) {
    return res.status(400).json({ message: "You have already submitted this quiz" });
  }

  // Calculate score
  let correctAnswers = 0;
  answers.forEach((answer) => {
    const question = quiz.questions[answer.questionIndex];
    const correctOption = question.options.findIndex(opt => opt.isCorrect);
    if (correctOption === answer.selectedOption) correctAnswers++;
  });
  const score = (correctAnswers / quiz.questions.length) * 100;

  // Save submission
  const submission = { student: studentId, answers, score };
  quiz.submissions.push(submission);
  await quiz.save();

  // Update student's quiz history
  await User.findByIdAndUpdate(studentId, {
    $push: { quizHistory: { quiz: quizId, score, submittedAt: new Date() } },
  });

  res.json({ success: true, score });
});

// Get student's quiz history
export const getQuizHistory = TryCatch(async (req, res) => {
  const studentId = req.user._id;
  const user = await User.findById(studentId).populate("quizHistory.quiz", "title course");
  res.json({ success: true, quizHistory: user.quizHistory });
});