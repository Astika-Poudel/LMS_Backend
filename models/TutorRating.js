import mongoose from "mongoose";

const tutorRatingSchema = new mongoose.Schema({
  courseId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true 
  },
  tutorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true
  },
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5 
  },
  feedback: { 
    type: String,
    default: ""
  },
  createdAt: { 
    type: Date,
    default: Date.now 
  },
});

export const TutorRating = mongoose.model("TutorRating", tutorRatingSchema);