import express from "express";
import { verifyUser, loginUser, register, myProfile } from "../controllers/user.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/user/register", register);
router.post("/user/verify", verifyUser);
router.post("/user/login", loginUser);
router.get("/user/me", isAuth, myProfile);

// Add the missing check-token endpoint
router.get("/user/check-token", isAuth, (req, res) => {
  try {
    // If isAuth middleware passes, token is valid and user is authenticated
    res.status(200).json({
      valid: true,
      user: req.user
    });
  } catch (error) {
    console.error("Error in check-token route:", error);
    res.status(500).json({
      valid: false,
      message: "Token validation failed"
    });
  }
});

export default router;