import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const isAuth = async (req, res, next) => {
    try {
        // Check for 'Authorization' header with 'Bearer <token>'
        const token = req.headers.authorization?.split(" ")[1]; // Get token from 'Authorization' header
        if (!token) 
            return res.status(403).json({
                message: "Please Login",
            });

        const decodedData = jwt.verify(token, process.env.Jwt_Sec);

        req.user = await User.findById(decodedData._id);

        next();
    } catch (error) {
        res.status(500).json({
            message: "Login First",
        });
    }
};
