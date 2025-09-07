import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const db = await getDatabase();
    const { email } = await req.json();

    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "Email not found" }, { status: 404 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000;

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { resetToken: token, resetTokenExpiry: resetTokenExpiry } }
    );

    // Create a transporter using your email service
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Construct the reset password link
    const resetLink = `${req.headers.get('origin')}/auth/reset-password?token=${token}`;
    
    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset for CampusSync",
      html: `
        <p>You requested a password reset for your CampusSync account.</p>
        <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
        <p>This link is valid for 1 hour.</p>
      `,
    });

    return NextResponse.json({ message: "Password reset link sent to your email." });
  } catch (error) {
    console.error("Forgot password API error:", error);
    return NextResponse.json({ message: "Something went wrong. Try again." }, { status: 500 });
  }
}