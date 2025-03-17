"use server";

import { drizzle } from "drizzle-orm/mysql2";
import { units, timeslots } from "../../../db/schema"; 
import { eq } from "drizzle-orm";

export default async function downloadUnit(unitCode: string) {
  const db = drizzle(process.env.DATABASE_URL!); // Connect to database

  try {
    // Fetch the unit name from the units table
    const unitQuery = await db
      .select()
      .from(units)
      .where(eq(units.unitCode, unitCode))
      .execute();

    if (unitQuery.length === 0) {
      return { success: false, message: "Unit not found." };
    }

    const unitName = unitQuery[0].unitName;

    // Fetch the course data from the courses table
    const courseQuery = await db
      .select()
      .from(timeslots)
      .where(eq(timeslots.unitId, unitCode))
      .execute();

    return { success: true, unitName, courseData: courseQuery };
  } catch (error) {
    console.error("Download unit error:", error);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}