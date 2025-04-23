import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const isAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Please login - Invalid or missing Authorization header" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Please login - No token provided" });
        }

        const decodedData = jwt.verify(token, process.env.Jwt_Sec);
        if (!decodedData || !decodedData._id) {
            return res.status(401).json({ message: "Invalid token - Unable to decode" });
        }

        const user = await User.findById(decodedData._id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found for the provided token" });
        }

        req.user = user;
        req.userId = user._id;
        next();
    } catch (error) {
        console.error("isAuth Error:", error.message);
        res.status(401).json({ message: error.message === "jwt expired" ? "Token expired, please login again" : "Invalid or expired token" });
    }
};

export const isAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== "Admin") {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: "Error checking admin status" });
    }
};

export default isAuth;