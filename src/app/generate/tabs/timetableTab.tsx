"use client";

import React, { useState } from "react";
import filterCourseList from "../algorithms/coreAlgorithm";
import { Course, TimetableViewProps } from "../algorithms/interfaces";

// TimetableView Component: Generates and displays the timetable based on courses and preferences
const TimetableView: React.FC<TimetableViewProps> = ({
  courseList,
  unitColors,
  preferences,
  setTab,
}) => {
  // Filter the course list based on user preferences to generate a conflict-free timetable
  const timetableData = filterCourseList(courseList, preferences.studyTimes);

  return (
    <>
      {/* Header with Back button and title */}
      <div className="flex items-center w-full mb-4">
        {/* Back button to return to Preferences tab */}
        <button
          onClick={() => setTab("preferences")}
          className="px-6 py-2 bg-blue-1000 text-white hover:bg-blue-1100 rounded-full"
        >
          Back
        </button>

        {/* Title of the page */}
        <h1 className="text-3xl font-bold mx-auto">Your Timetable</h1>
      </div>

      {/* Divider */}
      <div className="border-b border-gray-500 w-full my-4"></div>

      {/* Display message if no timetable could be generated */}
      {!timetableData && (
        <div className="text-red-500 text-center mb-4">
          Unable to create a conflict-free timetable with the selected
          preferences.
        </div>
      )}

      {/* Display the timetable (even if empty) */}
      <Timetable courses={timetableData || {}} unitColors={unitColors} />
    </>
  );
};

// Timetable Component: Renders the timetable grid with courses placed appropriately
interface TimetableProps {
  courses: Record<string, { unitName: string; courses: Course[] }>; // Filtered list of courses to display
  unitColors: { [unitCode: string]: string }; // Mapping of unit codes to their assigned colors
}

// Constants for days of the week and their full names
const daysOfWeek = ["MON", "TUE", "WED", "THU", "FRI"];
const daysFullNames: { [key: string]: string } = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
};

// Time slots from 8 AM to 8 PM (assuming 13 hours total)
const hours = Array.from({ length: 13 }, (_, i) => i + 8);

// Helper function to format 24-hour time to 12-hour format (e.g., 13 -> "1 PM")
const format12Hour = (hour: number) => {
  const suffix = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${formattedHour} ${suffix}`;
};

// Parses time strings (e.g., "9AM - 11AM") into numeric 24-hour start and end times
const parseTime = (timeStr: string) => {
  const [start, end] = timeStr.split(" - ").map((t) => t.trim());
  const to24Hour = (t: string) => {
    let [hourStr, modifier] = [t.slice(0, -2), t.slice(-2)];
    let [hour, min] = hourStr.split(":").map(Number);
    if (isNaN(min)) min = 0;
    hour = hour % 12;
    if (modifier.toLowerCase() === "pm") hour += 12;
    return hour + min / 60;
  };
  return { start: to24Hour(start), end: to24Hour(end) };
};

// Groups courses by day and start time without merging overlapping activities
const groupClassesByDay = (courses: Course[]) => {
  const timetable: { [day: string]: { [hour: number]: Course[] } } = {};

  // Initialize the timetable object with empty objects for each day
  daysOfWeek.forEach((day) => {
    timetable[day] = {};
  });

  // If there are no courses, return the empty timetable
  if (!courses || courses.length === 0) {
    return timetable;
  }

  // Loop through each course and place it in the timetable based on day and start time
  courses.forEach((course) => {
    const { start } = parseTime(course.time);

    if (!timetable[course.day][start]) {
      timetable[course.day][start] = [];
    }

    timetable[course.day][start].push(course);
  });

  return timetable;
};

const Timetable: React.FC<TimetableProps> = ({ courses, unitColors }) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Combine all courses into a single array
  const allCourses = Object.values(courses).flatMap(
    (courseUnit) => courseUnit.courses
  );

  // Group the courses by day and time
  const timetable = groupClassesByDay(allCourses);

  // Time slots from 8 AM to 9 PM in half-hour increments
  const timeSlots = Array.from(
    { length: (21 - 8) * 2 + 1 }, // This resulted in 27 slots
    (_, i) => 8 + i * 0.5
  );

  return (
    <div className="w-full overflow-x-auto">
      {/* Header row with day names */}
      <div className="mt-6 grid grid-cols-[1fr_2fr_2fr_2fr_2fr_2fr] gap-2 text-white bg-gray-900 p-4 rounded-lg">
        {/* Empty corner cell */}
        <div></div>
        {/* Day names */}
        {daysOfWeek.map((day) => (
          <div key={day} className="text-center font-bold">
            {daysFullNames[day]}
          </div>
        ))}
      </div>

      {/* Timetable grid */}
      <div className="grid grid-cols-[1fr_2fr_2fr_2fr_2fr_2fr] gap-2 relative">
        {/* Time column */}
        <div className="flex flex-col text-white relative">
          {timeSlots.map((time) => (
            <div
              key={time}
              className="relative h-8 border-b border-gray-900 bg-gray-900"
            >
              {/* Display time labels only on the hour */}
              {Number.isInteger(time) && (
                <div className="absolute top-0 left-0 w-full text-center">
                  {format12Hour(time)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Columns for each day */}
        {daysOfWeek.map((day) => (
          <div key={day} className="relative border-l border-gray-700">
            {/* Rows for each time slot */}
            {timeSlots.map((time, idx) => (
              <div key={time} className="relative h-8 border-b border-gray-600">
                {/* Place courses that start at this time */}
                {timetable[day][time]?.map((course, index, arr) => {
                  const { start, end } = parseTime(course.time);
                  const duration = end - start; // Duration in hours

                  // Calculate height based on duration (1 hour = 4rem)
                  const height = duration * 4; // Each half-hour slot is h-4 (2rem)

                  // Width adjusts if multiple courses overlap at the same time
                  const width = 100 / arr.length;
                  // Position courses side by side if overlapping
                  const leftPosition = index * width;

                  // Get the assigned color for the course's unit
                  const courseColor = unitColors[course.unitCode];

                  return (
                    <div
                      key={course.id}
                      className={`absolute text-xs p-1 rounded-md shadow-md cursor-pointer ${courseColor}`}
                      style={{
                        top: 0,
                        left: `${leftPosition}%`,
                        width: `${width}%`,
                        height: `${height}rem`,
                        backgroundColor: courseColor, // Ensure background covers grid lines
                        zIndex: 10, // Bring entries above grid lines
                      }}
                    >
                      {/* Course details */}
                      <div>
                        <strong>{course.unitCode}</strong> - {course.activity}
                      </div>
                      {course.room}
                      <br />
                      {course.time}
                    </div>
                  );
                })}
              </div>
            ))}
            {/* Overlay grid lines */}
            <div className="absolute inset-0 grid grid-rows-[repeat(26,_1fr)]">
              {timeSlots.map((_, idx) => (
                <div key={idx} className="border-b border-gray-600 h-8"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimetableView;
