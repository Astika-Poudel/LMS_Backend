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
    email:{
        type: String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: true,
    },
    role:{
        type: String,
        enum: ["admin", "Student", "Tutor"],
        default: "Student",
    },
    subscription:[
        {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Course",
       },
    ],
}, 
   {
     timestamps: true,
   }
);

export const User = mongoose.model("User", schema);