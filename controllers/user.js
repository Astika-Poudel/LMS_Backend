import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sendMail from "../middlewares/sendMail.js";
import TryCatch from "../middlewares/TryCatch.js";

export const register = TryCatch(async (req, res) => {
    const { firstname, lastname, username, email, password, role } = req.body;

    if (!firstname || !lastname || !username || !email || !password) {
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
    };


    const otp = Math.floor(Math.random() * 1000000);

   
    const activationToken = jwt.sign(
        { user, otp },
        process.env.Activation_Secret,
        {
            expiresIn: "15d",
        }
    );

    const data = {
        username,
        otp,
    };

    await sendMail(email, "LearnNepal - Verify Your Account", data);

    res.status(200).json({
        message: "OTP sent to your email",
        activationToken,
    });
});

export const verifyUser = TryCatch(async (req, res) => {
    const { otp, activationToken } = req.body;

    const verify = jwt.verify(activationToken, process.env.Activation_Secret);

    if (!verify) {
        return res.status(400).json({
            message: "OTP Expired",
        });
    }

    if (verify.otp !== otp) {
        return res.status(400).json({
            message: "Wrong OTP",
        });
    }

    try {
        await User.create({
            firstname: verify.user.firstname,
            lastname: verify.user.lastname,
            username: verify.user.username,
            email: verify.user.email,
            password: verify.user.password,
            role: verify.user.role,
        });
    } catch (error) {
        console.error("Error creating user: ", error.message);
    }
    

    res.json({
        message: "User Registered Successfully",
    });
});

export const loginUser = TryCatch(async(req, res) => {
    const { username_or_email, password } = req.body;

    if (!username_or_email) 
        return res.status(400).json({
            message: "Please provide either an email or a username.",
        });

    const user = await User.findOne({
        $or: [{ email: username_or_email }, { username: username_or_email }]  
    });
    
    if (!user) 
        return res.status(400).json({
            message: "No user found with this email or username.",
        });

    const matchPassword = await bcrypt.compare(password, user.password);

    if (!matchPassword)
        return res.status(400).json({
            message: "Wrong Password",
        });

    const token = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, {
        expiresIn: "15d",
    });

    res.json({
        message: `Welcome back ${user.username}`,
        token,
        user,
    });
});

export const myProfile = TryCatch(async(req,res)=>{
    const user = await User.findById(req.user._id);

    res.json({ user });
});