"use server";

import axios from "axios";
import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { DateTime } from "luxon"; // Import luxon for time zone handling

export async function GET() {
  try {
    const response = await axios.get(
      "https://qutvirtual3.qut.edu.au/qvpublic/ttab_unit_search_p.show_search_adv"
    );
    const $ = cheerio.load(response.data);

    // Get the current year in Brisbane time
    const currentYear = DateTime.now().setZone("Australia/Brisbane").year;

    // Select all option elements within the teaching period dropdown
    const options: { text: string; value: string }[] = [];
    $('select[name="p_time_period_id"] option').each((i, element) => {
      const text = $(element).text().trim();
      const value = $(element).attr("value");
      if (text && value) {
        options.push({ text, value });
      }
    });

    // Filter the options to keep only those that contain the current year
    const filteredOptions = options.filter((option) => {
      const yearMatch = option.text.match(/\d{4}/); // Match the year (e.g., 2025)
      return yearMatch && parseInt(yearMatch[0], 10) === currentYear;
    });

    // Remove the details within parentheses from the text
    const cleanedOptions = filteredOptions.map((option) => {
      const cleanedText = option.text.replace(/\s?\(.*\)/, ""); // Remove text inside parentheses and the parentheses
      return { ...option, text: cleanedText }; // Return the option with cleaned text
    });

    // Return the cleanedOptions array directly
    return NextResponse.json(cleanedOptions);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
