import nodemailer from "nodemailer";

const sendMail = async (to, subject, data) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.Gmail,
                pass: process.env.Password,
            },
        });

        const mailOptions = {
            from: process.env.Gmail,
            to,
            subject,
            text: `Hello ${data.username},\n\nYour OTP for LearnNepal account verification is: ${data.otp}\n\nThis OTP is valid for 15 days.`,
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully to:", to);
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email");
    }
};

export default sendMail;