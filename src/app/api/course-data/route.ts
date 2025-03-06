"use server";

import axios from "axios";
import * as cheerio from "cheerio"; // Use named import
import { v4 as uuidv4 } from "uuid"; // Import UUID for unique IDs
import { NextResponse } from "next/server";

// Add courses to global storage in nested dictionary format
export async function GET(request: { url: string | URL }) {
  try {
    // Get the search parameters from the request URL
    const url = new URL(request.url);
    const unitCode = url.searchParams.get("unitCode");
    const teachingPeriod = url.searchParams.get("teachingPeriod");

    const qut_data = `https://qutvirtual3.qut.edu.au/qvpublic/ttab_unit_search_p.process_search?p_unit=${unitCode}&p_unit_description=&p_time_period_id=${teachingPeriod}&p_arg_names=Class+timetable+search&p_arg_values=%2Fttab_unit_search_p.show_search_adv%3F`;
    const { data } = await axios.get(qut_data);
    const $ = cheerio.load(data);

    // Extract the unit name
    const unitName = $("h2").eq(1).text().trim();
    if (!unitName) {
      // If unit name is not found, return an empty response instead of null
      return NextResponse.json({});
    }

    const courses: {
      id: string; // Generate unique ID
      unitCode: string | null;
      unitName: string;
      classType: string;
      activity: string;
      day: string;
      time: string;
      room: string;
      teachingStaff: string;
    }[] = []; // Initialize an empty array for courses

    // Extract timetable data
    $("table.qv_table tr").each((index, element) => {
      if (index === 0) return; // Skip header row

      const course = {
        id: uuidv4(), // Generate unique ID
        unitCode: unitCode,
        unitName: unitName,
        classType: $(element).find("td").eq(0).text().trim(),
        activity: $(element).find("td").eq(1).text().trim(),
        day: $(element).find("td").eq(2).text().trim(),
        time: $(element).find("td").eq(3).text().trim(),
        room: $(element).find("td").eq(4).text().trim(),
        teachingStaff: $(element).find("td").eq(5).text().trim(),
      };

      courses.push(course); // Add the course to the array
    });

    // If no courses are found, return an empty response instead of null
    if (courses.length === 0) {
      console.log("No data found");
      return NextResponse.json({});
    }

    // Ensure unitCode is valid (fallback to empty string if null)
    const validUnitCode = unitCode ?? "null"; // Use a fallback value if null

    // Return the array of courses directly, using the valid unit code as the property name
    return NextResponse.json({ [validUnitCode]: { unitName, courses } });
  } catch (error) {
    // If any error occurs, return an empty response instead of a 500 error
    return NextResponse.json({});
  }
}
