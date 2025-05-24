import mongoose from "mongoose";

const schema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true,
    },
    lastname: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["Student", "Tutor", "Admin"],
        default: "Student",
        required: true,
    },
    image: {
        type: String,
        default: "default-profile.png", // Default profile picture
    },
    quizHistory: [{
        quiz: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quiz",
        },
        score: Number,
        submittedAt: Date,
    }],
    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Courses",
    }],
    courseProgress: [{
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Courses",
            required: true,
        },
        watchedBeginnerLectures: [{
            lecture: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Lecture",
            },
            watchedAt: Date,
        }],
        completedBeginnerLectures: {
            type: Boolean,
            default: false,
        },
        beginnerQuizScore: {
            type: Number,
            default: null,
        },
        watchedAdvancedLectures: [{
            lecture: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Lecture",
            },
            watchedAt: Date,
        }],
        completedAdvancedLectures: {
            type: Boolean,
            default: false,
        },
        advancedQuizScore: {
            type: Number,
            default: null,
        },
        certificateAwarded: {
            type: Boolean,
            default: false,
        },
    }],
    tutorRatings: [
    {
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Courses",
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: {
        type: String,
        trim: true,
      },
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  studentRatings: [
    {
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Courses",
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: {
        type: String,
        trim: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  averageTutorRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  tutorRatingCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

export const User = mongoose.model("User", schema);