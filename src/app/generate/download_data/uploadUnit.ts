"use server";

import { drizzle } from "drizzle-orm/mysql2";
import { units, timeslots } from "../../../db/schema";
import { v4 as uuidv4 } from "uuid";

export default async function uploadUnit(unitCode: string, courseData: any[], unitName?: string) {
  const db = drizzle(process.env.DATABASE_URL!); // Connect to database

  try {
    // Insert the new unit into the units table
    await db
      .insert(units)
      .values({
        unitCode,
        unitName: unitName || "", // Use empty string if unitName is not provided
      })
      .execute();

    // Insert the course data into the courses table
    const courseValues = courseData.map(course => ({
      id: course.id || uuidv4(), // Generate a UUID if ID is not provided
      unitId: unitCode,
      classType: course.classType,
      activity: course.activity,
      day: course.day,
      classTime: course.time,
      room: course.room,
      teachingStaff: course.teachingStaff,
    }));

    console.log("Inserting into courses:", courseValues);

    await db
      .insert(timeslots)
      .values(courseValues)
      .execute();

    return { success: true };
  } catch (error) {
    console.error("Upload unit error:", error);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}