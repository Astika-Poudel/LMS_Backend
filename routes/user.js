import express from "express";
import { verifyUser, loginUser, register, myProfile, fetchAllUsers, updateUserRole, deleteUser, fetchTutors } from "../controllers/user.js";
import { isAuth, isAdmin } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/user/register", register);
router.post("/user/verify", verifyUser);
router.post("/user/login", loginUser);
router.get("/user/me", isAuth, myProfile);
router.get("/users", isAuth, isAdmin, fetchAllUsers); // Admin only
router.get("/users/tutors", isAuth, isAdmin, fetchTutors); // Admin only - New route
router.put("/users/:userId/role", isAuth, isAdmin, updateUserRole); // Admin only
router.delete("/users/:userId", isAuth, isAdmin, deleteUser); // Admin only

router.get("/user/check-token", isAuth, (req, res) => {
    res.status(200).json({
        valid: true,
        user: req.user,
    });
});

export default router;