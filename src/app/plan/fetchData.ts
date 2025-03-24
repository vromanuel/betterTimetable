"use server";
import { units, teachingPeriods, timeslots, timetables, timetableTimeslots } from "../../db/schema"; // Updated table schemas, including timeslots
import { drizzle } from "drizzle-orm/mysql2";
import { eq, inArray, sql } from "drizzle-orm";

// Define your base URL, either from an environment variable or fallback to localhost.
const baseUrl = process.env.HOST_URL || "http://localhost:3000";

export const fetchAvailablePeriods = async (
  unitCode, // The unit code as provided
  failed   // If "true", force the API fallback.
) => {
  const db = drizzle(process.env.DATABASE_URL!);

  try {
    // Attempt to retrieve the teaching periods via a join:
    // From timeslots -> units -> teachingPeriods. This returns the teaching periods for any scheduled timeslot of the unit.
    let joinedPeriods = await db
      .select({
        id: teachingPeriods.id,
        periodName: teachingPeriods.periodName,
      })
      .from(timeslots)
      .innerJoin(units, eq(timeslots.unitId, units.id))
      .innerJoin(teachingPeriods, eq(timeslots.teachingPeriodId, teachingPeriods.id))
      .where(eq(units.unitCode, unitCode));

    // Optionally, deduplicate teaching periods (if the unit has more than one timeslot with the same period)
    let uniquePeriods = [];
    const periodMap = new Map();
    for (const period of joinedPeriods) {
      if (!periodMap.has(period.id)) {
        periodMap.set(period.id, true);
        uniquePeriods.push(period);
      }
    }
    joinedPeriods = uniquePeriods;

    // If not forcing fallback ("failed" is not "true") and DB returned some teaching periods, use them.
    if (failed !== "true" && joinedPeriods.length > 0) {
      const formattedPeriods = joinedPeriods.map((period) => ({
        text: period.periodName,
        value: period.id,
      }));
      return { validPeriods: formattedPeriods, teachingPeriods: formattedPeriods };
    }

    // If no teaching periods were found (or if a fallback is forced), use the API to fetch teaching periods.
    const teachingPeriodsResponse = await fetch(`${baseUrl}/api/teaching-data`);
    const teachingPeriodsData = await teachingPeriodsResponse.json();

    if (!teachingPeriodsData || teachingPeriodsData.error) {
      throw new Error("Failed to fetch teaching periods");
    }

    // Use the API teaching periods data to validate course data for the unit.
    let validResults = [];
    let chosenCourseData = null; // Will store the first valid course data returned.
    for (let period of teachingPeriodsData) {
      const response = await fetch(
        `${baseUrl}/api/course-data?unitCode=${unitCode}&teachingPeriod=${period.value}`
      );
      const data = await response.json();
      // If we get valid course data from the API:
      if (Object.keys(data).length !== 0 && !data.error) {
        validResults.push({ text: period.text, value: period.value });
        if (!chosenCourseData) {
          // Assume the API returns data keyed by the uppercased unit code.
          chosenCourseData = data[unitCode.toUpperCase()];
        }
      }
    }

    // If we got valid course data from the API, insert/update our DB accordingly.
    if (validResults.length > 0 && chosenCourseData) {
      const chosenPeriod = validResults[0];
      const formattedUnitCode = unitCode.toUpperCase();

      // 1. Insert the teaching period if it doesn't exist.
      const existingTP = await db
        .select()
        .from(teachingPeriods)
        .where(eq(teachingPeriods.id, chosenPeriod.value));
      if (existingTP.length === 0) {
        await db.insert(teachingPeriods).values({
          id: chosenPeriod.value,
          periodName: chosenPeriod.text,
        });
      }

      // 2. Insert the unit record if it doesn't exist (note: we no longer store periodId in units).
      const existingUnit = await db
        .select()
        .from(units)
        .where(eq(units.unitCode, formattedUnitCode));
      if (existingUnit.length === 0) {
        await db.insert(units).values({
          unitCode: formattedUnitCode,
          unitName: chosenCourseData.unitName,
        });
      }

      // 3. Retrieve the unit record for timeslot insertion.
      const unitRecordArray = await db
        .select()
        .from(units)
        .where(eq(units.unitCode, formattedUnitCode));
      const insertedUnit = unitRecordArray[0];

      // 4. Insert timeslot entries for the course data.
      for (let course of chosenCourseData.courses) {
        await db.insert(timeslots).values({
          unitId: insertedUnit.id,              // Associate with the unit
          teachingPeriodId: chosenPeriod.value,  // Associate with the teaching period
          classType: course.classType,
          activity: course.activity,
          day: course.day,
          classTime: course.time,  // Map API `time` to DB `classTime`
          room: course.room,
          teachingStaff: course.teachingStaff,
        });
      }
    }

    // Return the API-derived teaching periods.
    return { validPeriods: validResults, teachingPeriods: teachingPeriodsData };
  } catch (error) {
    throw new Error(error.message || "Failed to fetch teaching or valid periods");
  }
};

export const fetchCourseData = async (unitCode) => {
  const db = drizzle(process.env.DATABASE_URL!);
  const formattedUnitCode = unitCode.toUpperCase();

  // Query the units table for the given unit.
  const unitRecords = await db
    .select()
    .from(units)
    .where(eq(units.unitCode, formattedUnitCode));

  if (unitRecords.length === 0) {
    throw new Error(`Unit ${formattedUnitCode} not found in the database.`);
  }
  const unit = unitRecords[0];

  // Query timeslots for all classes linked to this unit.
  const timeslotRecords = await db
    .select()
    .from(timeslots)
    .where(eq(timeslots.unitId, unit.id));

  // Map timeslot records to the expected CourseData format.
  const courses = timeslotRecords.map((record) => ({
    id: record.id,
    unitCode: unit.unitCode,
    unitName: unit.unitName,
    classType: record.classType,
    activity: record.activity,
    day: record.day,
    time: record.classTime, // Map DB field `classTime` to `time`
    room: record.room,
    teachingStaff: record.teachingStaff,
  }));

  return { unitName: unit.unitName, courses };
};







export const saveTimetable = async (userId, timetableName, timeslotIds) => {
  // Establish database connection
  const db = drizzle(process.env.DATABASE_URL!);
  try {
    // Insert a new timetable record
    await db.insert(timetables).values({
      userId: userId,
      timetableName: timetableName,
    });

    // Fetch the newly inserted timetable by chaining .where() clauses
    const [newTimetable] = await db
      .select()
      .from(timetables)
      .where(eq(timetables.userId, userId))
      .where(eq(timetables.timetableName, timetableName));

    if (timeslotIds.length > 0) {
      // Prepare join entries, ensuring both timetableId and timeslotId fields are provided.
      const timetableTimeslotEntries = timeslotIds.map((timeslotId) => ({
        timetableId: newTimetable.id,
        timeslotId: timeslotId,
      }));

      await db.insert(timetableTimeslots).values(timetableTimeslotEntries);
    }

    console.log("Here is the new timetable :)", newTimetable);

    return newTimetable;
  } catch (error) {
    console.error("Error saving timetable:", error);
    throw error;
  }
};















/**
 * Loads all saved timetables for the given user.
 * (Used to populate the dropdown list in your import dialog.)
 */
export const loadSavedTimetables = async (userId) => {
  try {
    const db = drizzle(process.env.DATABASE_URL!);
    const userTimetables = await db
      .select()
      .from(timetables)
      .where(eq(timetables.userId, userId));
      
    return userTimetables;
  } catch (err) {
    throw new Error(err.message);
  }
};



/**
 * Imports a timetable’s associated courses.
 * Given a selected timetable ID, queries the join table to extract timeslot IDs,
 * then returns the full timeslot details.
 */
export const importTimetable = async (selectedTimetableId) => {
  const db = drizzle(process.env.DATABASE_URL!);

  // 1. Query the join table to get timeslot associations for the given timetable.
  const timetableAssociations = await db
    .select()
    .from(timetableTimeslots)
    .where(eq(timetableTimeslots.timetableId, selectedTimetableId));

  // Extract the timeslot IDs from the associations.
  const importedTimeslotIds = timetableAssociations.map(
    (assoc) => assoc.timeslotId
  );

  // 2. Fetch all timeslots for the unit codes associated with the timetable.
  // Join with units to get full unit data.
  const rawCoursesWithUnits = await db
    .select({
      id: timeslots.id,
      unitId: timeslots.unitId,
      teachingPeriodId: timeslots.teachingPeriodId,
      classType: timeslots.type, // alias for the "type" field
      activity: timeslots.activity,
      day: timeslots.day,
      classTime: timeslots.classTime,
      room: timeslots.room,
      teachingStaff: timeslots.teachingStaff,
      unitCode: units.unitCode,
      unitName: units.unitName,
    })
    .from(timeslots)
    .innerJoin(units, eq(timeslots.unitId, units.id))
    .where(inArray(timeslots.id, importedTimeslotIds));

  // 3a. Use the unit codes from the associated timeslots to fetch all relevant timeslots.
  const unitCodes = [...new Set(rawCoursesWithUnits.map((course) => course.unitCode))];
  const allRelevantTimeslots = await db
    .select({
      id: timeslots.id,
      unitId: timeslots.unitId,
      teachingPeriodId: timeslots.teachingPeriodId,
      classType: timeslots.type,
      activity: timeslots.activity,
      day: timeslots.day,
      classTime: timeslots.classTime,
      room: timeslots.room,
      teachingStaff: timeslots.teachingStaff,
      unitCode: units.unitCode,
      unitName: units.unitName,
    })
    .from(timeslots)
    .innerJoin(units, eq(timeslots.unitId, units.id))
    .where(inArray(units.unitCode, unitCodes));

  // 3b. Format coursesWithUnits to match the desired format.
  const coursesWithUnits = {};
  allRelevantTimeslots.forEach((timeslot) => {
    const unitKey = timeslot.unitCode;
    if (!coursesWithUnits[unitKey]) {
      coursesWithUnits[unitKey] = {
        unitName: timeslot.unitName,
        courses: [],
      };
    }
    coursesWithUnits[unitKey].courses.push({
      id: timeslot.id,
      unitId: timeslot.unitId,
      teachingPeriodId: timeslot.teachingPeriodId,
      classType: timeslot.classType,
      activity: timeslot.activity,
      day: timeslot.day,
      time: timeslot.classTime, // map 'classTime' to 'time'
      room: timeslot.room,
      teachingStaff: timeslot.teachingStaff,
    });
  });

  // 3c. Format the courses grouped by activity (formatted version) remains unchanged.
  const formatted = {};
  rawCoursesWithUnits.forEach((timeslot) => {
    const unitKey = timeslot.unitCode;
    if (!formatted[unitKey]) {
      formatted[unitKey] = {
        unitName: timeslot.unitName,
        courses: {},
      };
    }
    formatted[unitKey].courses[timeslot.activity] = {
      id: timeslot.id,
      unitCode: timeslot.unitCode,
      unitName: timeslot.unitName,
      activity: timeslot.activity,
      day: timeslot.day,
      time: timeslot.classTime,
      room: timeslot.room,
      teachingStaff: timeslot.teachingStaff,
    };
  });

  return { coursesWithUnits, formatted };
};
