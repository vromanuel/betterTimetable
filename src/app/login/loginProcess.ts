"use server";

import { drizzle } from "drizzle-orm/mysql2";
import { users, sessions } from "../../db/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers"; // Import cookies to set the session token in the response cookies

export default async function login(username: string, password: string) {
  const db = drizzle(process.env.DATABASE_URL!);

  try {
    const userQuery = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)
      .execute();

    const user = userQuery[0];

    if (!user) {
      return { success: false, message: "Incorrect username or password." };
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return { success: false, message: "Incorrect username or password." };
    }

    console.log("Now creating session");

    // Generate a session token
    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Session valid for 24 hours

    // Store session in the database
    await db
      .insert(sessions)
      .values({
        id: sessionToken,
        userId: user.id,
        expiresAt: sql`${expiresAt}`,
      })
      .execute();

    console.log("Session created and token stored in database");

    // Set the session token in cookies
    const cookieStore = cookies(); // Get the cookie store
    cookieStore.set("sessionToken", sessionToken, {
      httpOnly: true, // For security, the cookie is not accessible via JavaScript
      maxAge: 24 * 60 * 60, // Expiration time of 24 hours in seconds
      path: "/", // The cookie will be available for the entire domain
      secure: process.env.NODE_ENV === "production", // Set `secure` flag in production (ensure cookies are only sent over HTTPS)
    });

    console.log("Session token stored in cookies");

    // Return session token (can also return some user info if needed)
    return { success: true, sessionToken };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}
