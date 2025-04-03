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
        ref: "User"
       
    },
    Lectures: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lecture",
    }],
    enrolledStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
}, { timestamps: true });

export const Courses = mongoose.model("Courses", schema);