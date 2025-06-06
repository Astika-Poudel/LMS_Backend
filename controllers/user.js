import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sendMail from "../middlewares/sendMail.js";
import TryCatch from "../middlewares/TryCatch.js";
import mongoose from "mongoose";

// Register a new user
export const register = TryCatch(async (req, res) => {
    const { firstname, lastname, username, email, password, role } = req.body;

    if (!firstname || !lastname || !username || !email || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (existingUser) {
        return res.status(400).json({
            message: "User with this email or username already exists",
        });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = {
        firstname,
        lastname,
        username,
        email,
        password: hashPassword,
        role,
        image: "default-profile.png",
    };

    const otp = Math.floor(Math.random() * 1000000);

    const activationToken = jwt.sign(
        { user, otp },
        process.env.Activation_Secret,
        { expiresIn: "15d" }
    );

    const data = { username, otp };
    await sendMail(email, "LearnNepal - Verify Your Account", data);

    res.status(200).json({
        message: "OTP sent to your email",
        activationToken,
    });
});

// Verify user OTP
export const verifyUser = TryCatch(async (req, res) => {
    const { otp, activationToken } = req.body;

    const verify = jwt.verify(activationToken, process.env.Activation_Secret);

    if (!verify) {
        return res.status(400).json({ message: "OTP Expired" });
    }

    if (verify.otp !== parseInt(otp)) {
        return res.status(400).json({ message: "Wrong OTP" });
    }

    const newUser = await User.create({
        firstname: verify.user.firstname,
        lastname: verify.user.lastname,
        username: verify.user.username,
        email: verify.user.email,
        password: verify.user.password,
        role: verify.user.role,
        image: verify.user.image,
    });

    res.status(201).json({ message: "User Registered Successfully", user: newUser });
});

// Login user (updated with 401 status and logging)
export const loginUser = TryCatch(async (req, res) => {
    const { username_or_email, password } = req.body;

    if (!username_or_email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    console.log("Login attempt:", { username_or_email }); // Debug log

    const user = await User.findOne({
        $or: [{ email: username_or_email }, { username: username_or_email }],
    });

    if (!user) {
        console.log("User not found:", username_or_email); // Debug log
        return res.status(401).json({ message: "No user found with this email or username" });
    }

    const matchPassword = await bcrypt.compare(password, user.password);
    if (!matchPassword) {
        console.log("Password mismatch for user:", username_or_email); // Debug log
        return res.status(401).json({ message: "Wrong Password" });
    }

    const token = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, { expiresIn: "15d" });

    res.status(200).json({
        message: `Welcome back ${user.username}`,
        token,
        user: user.toJSON(),
    });
});

// Other functions (kept for completeness)
export const myProfile = TryCatch(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
});

export const updateProfile = TryCatch(async (req, res) => {
    const { username, firstname, lastname, email } = req.body;
    const userId = req.user._id;

    const existingUser = await User.findOne({
        $or: [{ email }, { username }],
        _id: { $ne: userId },
    });

    if (existingUser) {
        return res.status(400).json({
            message: "Username or email already taken by another user",
        });
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { username, firstname, lastname, email },
        { new: true }
    ).select("-password");

    if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
});

export const changePassword = TryCatch(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const matchPassword = await bcrypt.compare(currentPassword, user.password);
    if (!matchPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
});

export const uploadProfilePicture = TryCatch(async (req, res) => {
    const userId = req.user._id;
    const image = req.file ? req.file.filename : null;

    if (!image) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { image },
        { new: true }
    ).select("-password");

    if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Profile picture updated successfully", user: updatedUser });
});

export const fetchAllUsers = TryCatch(async (req, res) => {
    const users = await User.find({}).select("-password");
    res.status(200).json(users);
});

export const fetchTutors = TryCatch(async (req, res) => {
    const tutors = await User.find({ role: "Tutor" }).select("firstname lastname _id");
    res.status(200).json({ success: true, tutors });
});

export const updateUserRole = TryCatch(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!["Student", "Tutor", "Admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true }
    ).select("-password");

    if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Role updated successfully", user: updatedUser });
});

export const deleteUser = TryCatch(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
});

export const fetchUserById = TryCatch(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  const user = await User.findById(userId).select("firstname lastname image role averageTutorRating tutorRatingCount");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({ success: true, user });
});

