import mongoose from "mongoose";

export const connectDb = async () => {
    try {
        await mongoose.connect(process.env.DB, {
        });
        console.log("Database Connected");
    } catch (error) {
        console.error("Database Connection Error:", error.message);
        process.exit(1); // Exit process with failure code
    }

    mongoose.connection.on("disconnected", () => {
        console.log("MongoDB disconnected");
    });

    process.on("SIGINT", async () => {
        await mongoose.connection.close();
        console.log("MongoDB connection closed due to app termination");
        process.exit(0);
    });
};
