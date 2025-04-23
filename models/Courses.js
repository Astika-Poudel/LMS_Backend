import mongoose from "mongoose";

const schema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    Tutor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    beginnerLectures: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lecture",
    }],
    advancedLectures: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lecture",
    }],
    beginnerQuiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz",
    },
    advancedQuiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz",
    },
    passingScore: {
        type: Number,
        default: 70,
    },
    enrolledStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    completionRate: {
        type: Number,
        default: 0,
    },
    averageQuizScore: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

export const Courses = mongoose.model("Courses", schema);