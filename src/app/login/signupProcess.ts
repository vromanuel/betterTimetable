// src/app/api/auth.ts
"use server";

import { drizzle } from "drizzle-orm/mysql2";
import { users, sessions } from "../../db/schema"; // Adjust path based on your schema location
import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers"; // Import cookies to set the session token in the response cookies

export default async function signup(
  username: string,
  password: string,
  email: string,
  title: string,
  firstName: string,
  lastName: string
) {
  const db = drizzle(process.env.DATABASE_URL!);

  try {
    // Checking if the username already exists
    const existingUserQuery = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)
      .execute();

    const existingUser = existingUserQuery[0];

    if (existingUser) {
      return { success: false, message: "Username already exists." };
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert the new user into the users table
    await db
      .insert(users)
      .values({
        username,
        passwordHash,
        email,
        title,
        firstName,
        lastName,
        admin: false,
      })
      .$returningId();

    // Grab the new user ID
    const userQuery = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)
      .execute();

    const user = userQuery[0];

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

    return { success: true };
  } catch (error) {
    console.error("Signup error:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}
