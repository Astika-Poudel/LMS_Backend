import multer from "multer";
import { v4 as uuid } from "uuid";

// Configure multer storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads");  // Ensure 'uploads' folder exists and is writable
  },
  filename(req, file, cb) {
    const id = uuid();
    const extName = file.originalname.split(".").pop();
    cb(null, `${id}.${extName}`);
  },
});

// Multer middleware to handle single file uploads
export const uploadFiles = multer({ storage }).single("file");
