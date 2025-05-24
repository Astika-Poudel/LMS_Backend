import express from "express";
import {register,  fetchTutors, verifyUser, loginUser, myProfile, fetchAllUsers, updateUserRole, deleteUser, fetchUserById,  updateProfile,  changePassword, uploadProfilePicture} from "../controllers/user.js";
import { uploadFiles } from "../middlewares/multer.js";
import { isAuth, isAdmin } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify", verifyUser);
router.post("/login", loginUser);
router.get("/me", isAuth, myProfile);
router.get("/users/tutors", isAuth, isAdmin, fetchTutors);
router.get("/users", isAuth, isAdmin, fetchAllUsers);
router.put("/users/:userId/role", isAuth, isAdmin, updateUserRole);
router.delete("/users/:userId", isAuth, isAdmin, deleteUser);
router.get("/users/:userId", isAuth, fetchUserById);
router.put("/profile", isAuth, updateProfile);
router.put("/change-password", isAuth, changePassword);
router.put("/upload-profile-picture", isAuth, uploadFiles, uploadProfilePicture);

router.get("/user/check-token", isAuth, (req, res) => {
    res.status(200).json({
        valid: true,
        user: req.user,
    });
});

export default router;