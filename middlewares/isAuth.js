import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const isAuth = async (req, res, next) => {
  try {
    console.log("isAuth: Headers received:", req.headers);
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("isAuth: No valid authorization header found!");
      return res.status(401).json({ message: "Please Login - Invalid auth header" });
    }
    
    const token = authHeader.split(" ")[1];
    console.log("isAuth: Token from header:", token);
    
    if (!token) {
      console.log("isAuth: No token found!");
      return res.status(401).json({ message: "Please Login - No token" });
    }
    
    try {
      const decodedData = jwt.verify(token, process.env.Jwt_Sec);
      console.log("isAuth: Decoded data:", decodedData);
      
      const user = await User.findById(decodedData._id);
      if (!user) {
        console.log("isAuth: User not found in database!");
        return res.status(401).json({ message: "User not found" });
      }
      
      console.log("isAuth: User found:", user);
      req.user = user;
      next();
    } catch (jwtError) {
      console.log("isAuth: JWT Verification Error:", jwtError.message);
      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (error) {
    console.error("isAuth: Error in middleware:", error);
    res.status(500).json({ message: "Login First - General Error" });
  }
};