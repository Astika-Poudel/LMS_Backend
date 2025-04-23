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
    questionsPool: [{
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
    questionCount: {
        type: Number,
        default: 12,
    },
    submissions: [{
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        answers: [{
            questionIndex: Number,
            selectedOption: Number,
        }],
        score: {
            type: Number,
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