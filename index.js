import express from "express";
import dotenv from "dotenv";
import { connectDb } from "./database/db.js";
import userRoutes from "./routes/user.js";

dotenv.config();

const app = express();

//using middleware
app.use(express.json());

const port = process.env.PORT;

app.get("/", (req, res) => {
    res.send("Server is working");
});

// importing routes
app.use("/api",userRoutes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    connectDb();
});
