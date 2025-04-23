import express from "express";
import dotenv from "dotenv";
import { connectDb } from "./database/db.js";
import userRoutes from "./routes/user.js";
import courseRoutes from "./routes/course.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/stripe.js";
import enrollRoutes from "./routes/enroll.js";
import cors from "cors";
import notificationRoutes from "./routes/notification.js";
import { Server } from "socket.io";
import http from "http";
import tutorRoutes from "./routes/tutor.js";
import quizRoutes from "./routes/quiz.js";
import path from "path";
import { isAuth } from "./middlewares/isAuth.js";
import tutorratingRoutes from "./routes/tutorrating.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use("/uploads", express.static("uploads"));

app.use("/api", (req, res, next) => {
    console.log(`Request received: ${req.method} ${req.url}`);
    next();
});

app.use("/api", userRoutes);
app.use("/api", courseRoutes);
app.use("/api", isAuth, adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api", enrollRoutes);
app.use("/api", notificationRoutes);
app.use("/api", tutorRoutes);
app.use("/api", quizRoutes);
app.use("/api/tutor-ratings",tutorratingRoutes);

app.get("/api/test", (req, res) => {
    res.json({ message: "API is working" });
});

const __dirname = path.resolve();

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    socket.on("join", (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room`);
    });
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

app.set("io", io);

const port = process.env.PORT || 7001;

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    connectDb();
});