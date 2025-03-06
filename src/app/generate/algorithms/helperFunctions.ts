import {
  Course,
  CourseList,
  CourseTimes,
  FilteredCourseList,
} from "./interfaces";

/// ----------------------------------------------------------------------------------------------------- ///
///
///                              STAGE 1 - FILTER BY UNAVAILABLE TIMES
///                       will remove all timeslots outside of available times
///
/// ----------------------------------------------------------------------------------------------------- ///

export function filterByAvailability(
  courseList: CourseList,
  studyTimes: { [key: string]: string[] }
): FilteredCourseList | null {
  ///
  /// Function to filter courses based on the user's available times.
  ///
  /// Inputs:
  ///   - courseList: The list of courses to filter.
  ///   - studyTimes: A dictionary mapping days to the user's available times.
  /// Outputs:
  ///   - FilteredCourseList: The filtered list of courses based on the user's availability.
  ///   - If any unit has no timeslots left after filtering, returns null.
  ///

  const filteredCourseList: FilteredCourseList = {};

  // Iterate over each unit in the courseList
  for (const unitCode in courseList) {
    const unit = courseList[unitCode];
    const filteredCourses: Course[] = [];

    console.log("HERE IS THE ACTUAL UNIT CODE!!!!", unit);

    // Iterate over each course in the unit
    for (const course of unit.courses) {
      const courseDayAbbr = course.day; // e.g., 'TUE'
      const fullDayName = dayMap[courseDayAbbr];

      if (!fullDayName) {
        console.warn(`Unrecognized day abbreviation: ${courseDayAbbr}`);
        continue; // Skip this course or handle appropriately
      }

      // Get the user's available times for the course day
      const availableTimes = studyTimes[fullDayName];

      if (!availableTimes || availableTimes.length === 0) {
        // No availability on this day; exclude the course
        continue;
      }

      // Parse the course's start and end times into minutes
      const { start: courseStart, end: courseEnd } =
        parseCourseTimeRangeInMinutes(course.time);

      // Generate all 30-minute increments between courseStart and courseEnd
      const courseTimes = generateCourseTimeSlots(courseStart, courseEnd);

      // Check if all of these times are within the user's available times
      const isWithinAvailability = courseTimes.every((timeStr) =>
        availableTimes.includes(timeStr)
      );
      console.log(
        "Course Times:",
        courseTimes,
        "\nAvailable Times:",
        availableTimes,
        "\nIs the course time within availability?",
        isWithinAvailability
      );

      if (isWithinAvailability) {
        // All times are within availability; include the course
        filteredCourses.push(course);
      }
      // Else, do not include the course
    }

    // If any activity has no timeslots left, return null
    if (filteredCourses.length === 0) {
      return null;
    } else {
      // Include the unit with its filtered courses
      filteredCourseList[unitCode] = {
        unitName: unit.unitName,
        courses: filteredCourses,
      };
    }
  }

  // Return the filtered course list
  return filteredCourseList;
}

/// ----------------------------------------------------------------------------------------------------- ///
///
///                              STAGE 2 - GROUP ACTIVITIES BY UNIT
///                       will group timeslots by activity for each unit
///
/// ----------------------------------------------------------------------------------------------------- ///

export function groupActivitiesByUnit(
  courseList: Record<string, { unitName: string; courses: Course[] }>
): Array<{
  unitCode: string;
  unitName: string;
  activities: Array<{
    activityType: string;
    courses: Course[];
  }>;
}> {
  //// Function to transform the course list into an array of units with their activities and courses
  ///
  /// inputs:
  ///   courseList: Record<string, { unitName: string; courses: Course[] }>
  /// outputs:
  ///   Array<{ unitCode: string; unitName: string; activities: Array<{ activityType: string; courses: Course[] }> }>
  ///

  return Object.entries(courseList).map(([unitCode, unitData]) => {
    // Group courses by activity type (e.g., group all lectures together)
    const activityGroups = unitData.courses.reduce((groups, course) => {
      // Initialize the group if it doesn't exist, then add the course to it
      (groups[course.activity] ||= []).push(course);
      return groups;
    }, {} as Record<string, Course[]>);

    // Return the unit with its activities and corresponding courses
    return {
      unitCode,
      unitName: unitData.unitName,
      activities: Object.entries(activityGroups).map(
        ([activityType, courses]) => ({
          activityType,
          courses,
        })
      ),
    };
  });
}

/// ----------------------------------------------------------------------------------------------------- ///
///
///                              STAGE 3 - INITIALISE SCHEDULE DATA STRUCTYRES
///                 will initialise data structured for each day of the week along with a
//                                 new dictionary for the final schedule
///
/// ----------------------------------------------------------------------------------------------------- ///

export function initializeScheduleData(): {
  scheduledTimesPerDay: CourseTimes;
  finalSchedule: FilteredCourseList;
} {
  ///
  /// Inputs:
  ///   None
  /// Outputs:
  ///   An object containing:
  ///     - scheduledTimesPerDay: A record of arrays representing scheduled times for each weekday.
  ///     - finalSchedule: An object to store the final schedule.
  ///

  return {
    scheduledTimesPerDay: {
      MON: [],
      TUE: [],
      WED: [],
      THU: [],
      FRI: [],
    },
    finalSchedule: {},
  };
}

/// ----------------------------------------------------------------------------------------------------- ///
///
///                                     OTHER HELPER FUNCTIONS
///                  these are used to support the main functions of our algorithm
///
/// ----------------------------------------------------------------------------------------------------- ///

export function convertTo24Hour(time12h: string): string {
  //// Helper function to convert 12-hour time to 24-hour time format
  ///
  /// inputs:
  ///   time12h: string - A string representing the time in 12-hour format (e.g., "2:30pm")
  /// outputs:
  ///   string - The corresponding time in 24-hour format (e.g., "14:30:00")
  ///

  const match = time12h.trim().match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) {
    throw new Error(`Invalid time format: ${time12h}`);
  }

  let [, hourStr, minuteStr, modifier] = match;
  let hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10);

  if (modifier.toLowerCase() === "pm" && hours !== 12) {
    hours += 12;
  } else if (modifier.toLowerCase() === "am" && hours === 12) {
    hours = 0;
  }

  const hoursStr = hours.toString().padStart(2, "0");
  const minutesStr = minutes.toString().padStart(2, "0");

  return `${hoursStr}:${minutesStr}:00`;
}

export function parseCourseTime(timeStr: string): Date {
  //// Function to parse course time strings into Date objects
  ///
  /// inputs:
  ///   timeStr: string - A string representing the time in 12-hour format (e.g., "2:30pm")
  /// outputs:
  ///   Date - A Date object corresponding to the time on a fixed date (e.g., January 1, 1970)
  ///

  return new Date(`1970-01-01T${convertTo24Hour(timeStr)}`);
}

const dayMap: { [key: string]: string } = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

function parseTimeStringToMinutes(timeStr: string): number {
  // Helper function to parse time strings into minutes since midnight
  ////
  //// Function to parse time strings into minutes since midnight
  ////
  //// inputs:
  ////   timeStr: string - Time string in format "HH:MM" or "HH:MMam/pm"
  //// outputs:
  ////   number - Time in minutes since midnight
  ////

  let time = timeStr.trim();
  let isAmPm = false;
  let ampm = "";

  if (time.toLowerCase().endsWith("am") || time.toLowerCase().endsWith("pm")) {
    isAmPm = true;
    ampm = time.slice(-2).toLowerCase();
    time = time.slice(0, -2).trim();
  }

  const [hourStr, minuteStr = "0"] = time.split(":");
  let hour = parseInt(hourStr, 10);
  let minute = parseInt(minuteStr, 10);

  if (isAmPm) {
    if (ampm === "pm" && hour !== 12) {
      hour += 12;
    } else if (ampm === "am" && hour === 12) {
      hour = 0;
    }
  }

  return hour * 60 + minute;
}

function parseCourseTimeRangeInMinutes(timeRange: string): {
  start: number;
  end: number;
} {
  //// Function to parse course time ranges into start and end times in minutes
  ////
  //// inputs:
  ////   timeRange: string - Time range string in format "HH:MMam/pm - HH:MMam/pm"
  //// outputs:
  ////   { start: number; end: number } - Start and end times in minutes since midnight
  ////
  const [startStr, endStr] = timeRange.split("-").map((t) => t.trim());
  const start = parseTimeStringToMinutes(startStr);
  const end = parseTimeStringToMinutes(endStr);
  return { start, end };
}

function generateCourseTimeSlots(startTime: number, endTime: number): string[] {
  //// Function to generate 30-minute time slots between start and end times
  ////
  //// inputs:
  ////   startTime: number - Start time in minutes since midnight
  ////   endTime: number - End time in minutes since midnight
  //// outputs:
  ////   string[] - Array of time strings in "HH:MM" format representing 30-minute increments
  ////
  const times: string[] = [];

  // Ensure that we start from the exact start time
  let currentTime = startTime;

  while (currentTime < endTime) {
    const timeStr = formatTimeMinutesToString(currentTime);
    times.push(timeStr);
    currentTime += 30; // Increment by 30 minutes
  }

  return times;
}

function formatTimeMinutesToString(timeInMinutes: number): string {
  //// Function to format time in minutes to a string "HH:MM" with leading zeros
  ////
  //// inputs:
  ////   timeInMinutes: number - Time in minutes since midnight
  //// outputs:
  ////   string - Time string in "HH:MM" format
  ////
  const hour = Math.floor(timeInMinutes / 60);
  const minute = timeInMinutes % 60;
  const hourStr = hour.toString(); // Removed padStart for hours
  const minuteStr = minute.toString().padStart(2, "0"); // Keep leading zero for minutes
  return `${hourStr}:${minuteStr}`;
}
