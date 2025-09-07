import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth"; // You'll need to create this utility function

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ message: "Token and new password are required." }, { status: 400 });
    }

    const db = await getDatabase();
    const user = await db.collection('users').findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }, // Check if token is not expired
    });

    if (!user) {
      return NextResponse.json({ message: "Invalid or expired token." }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword, resetToken: null, resetTokenExpiry: null } }
    );

    return NextResponse.json({ message: "Password reset successfully." });

  } catch (error) {
    console.error("Reset password API error:", error);
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}