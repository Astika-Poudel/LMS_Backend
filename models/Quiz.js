import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Courses",
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  questions: [{
    type: {
      type: String,
      enum: ["multiple-choice", "true-false"],
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    options: [{
      text: String,
      isCorrect: Boolean,
    }],
  }],
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    answers: [{
      questionIndex: Number,
      selectedOption: Number, // Index of selected option
    }],
    score: {
      type: Number, // Percentage
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Quiz = mongoose.model("Quiz", quizSchema);