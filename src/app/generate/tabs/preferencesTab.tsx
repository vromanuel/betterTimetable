"use client";

import React, { useState } from "react";
import { TimetableViewProps } from "../algorithms/interfaces";

const Preferences: React.FC<TimetableViewProps> = ({
  preferences,
  setPreferences,
  setTab,
}) => {
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Generate times from 8:00 AM to 8:30 PM in 30-minute intervals (26 slots)
  const times = Array.from({ length: 26 }, (_, i) => {
    const totalMinutes = 8 * 60 + i * 30; // Start at 8:00 AM
    const hour24 = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const period = hour24 >= 12 ? "PM" : "AM";
    const minuteStr = minute === 0 ? "00" : "30";
    const timeLabel = minute === 0 ? `${hour12} ${period}` : ""; // Label on the hour
    const timeValue = `${hour24}:${minuteStr}`; // Internal value

    return {
      label: timeLabel,
      value: timeValue,
    };
  });

  // State variables for drag selection
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<"select" | "deselect" | null>(
    null
  );
  const [draggedTimeslots, setDraggedTimeslots] = useState<{
    [day: string]: Set<string>;
  }>({});

  // Event handlers
  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    day: string,
    timeValue: string
  ) => {
    e.preventDefault();
    setIsDragging(true);

    const isSelected =
      preferences.studyTimes[day]?.includes(timeValue) ?? false;
    const action = isSelected ? "deselect" : "select";
    setDragAction(action);

    setDraggedTimeslots({
      [day]: new Set([timeValue]),
    });
  };

  const handleMouseEnter = (day: string, timeValue: string) => {
    if (isDragging && dragAction) {
      setDraggedTimeslots((prev) => {
        const updated = { ...prev };
        if (!updated[day]) {
          updated[day] = new Set();
        }
        updated[day].add(timeValue);
        return updated;
      });
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragAction) {
      updateStudyTimes();
    }
    resetDragState();
  };

  const handleTouchStart = (
    e: React.TouchEvent<HTMLDivElement>,
    day: string,
    timeValue: string
  ) => {
    e.preventDefault();
    setIsDragging(true);

    const isSelected =
      preferences.studyTimes[day]?.includes(timeValue) ?? false;
    const action = isSelected ? "deselect" : "select";
    setDragAction(action);

    setDraggedTimeslots({
      [day]: new Set([timeValue]),
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging && dragAction) {
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target) {
        const timeslotElement = target.closest("[data-day][data-time]");
        if (timeslotElement) {
          const day = timeslotElement.getAttribute("data-day")!;
          const timeValue = timeslotElement.getAttribute("data-time")!;

          setDraggedTimeslots((prev) => {
            const updated = { ...prev };
            if (!updated[day]) {
              updated[day] = new Set();
            }
            updated[day].add(timeValue);
            return updated;
          });
        }
      }
    }
  };

  const updateStudyTimes = () => {
    setPreferences((prevPreferences) => {
      const updatedStudyTimes = { ...prevPreferences.studyTimes };

      Object.entries(draggedTimeslots).forEach(([day, times]) => {
        const dayTimes = new Set(updatedStudyTimes[day] || []);

        times.forEach((time) => {
          if (dragAction === "select") {
            dayTimes.add(time);
          } else if (dragAction === "deselect") {
            dayTimes.delete(time);
          }
        });

        if (dayTimes.size > 0) {
          updatedStudyTimes[day] = Array.from(dayTimes).sort((a, b) => {
            const [hourA, minuteA] = a.split(":").map(Number);
            const [hourB, minuteB] = b.split(":").map(Number);
            return hourA * 60 + minuteA - (hourB * 60 + minuteB);
          });
        } else {
          delete updatedStudyTimes[day];
        }
      });

      return { ...prevPreferences, studyTimes: updatedStudyTimes };
    });
  };

  const resetDragState = () => {
    setIsDragging(false);
    setDragAction(null);
    setDraggedTimeslots({});
  };

  // Determine if at least one timeslot is selected
  const hasSelectedTimeslots = Object.values(preferences.studyTimes).some(
    (times) => times.length > 0
  );

  return (
    <>
      {/* Navigation and Title */}
      <div className="mt-6 flex items-center justify-between w-full">
        {/* Back Button */}
        <button
          onClick={() => setTab("units")}
          className="px-6 py-2 text-white rounded-full bg-blue-600 hover:bg-blue-700"
        >
          Back
        </button>

        {/* Page Title */}
        <h2 className="text-3xl text-white text-center flex-grow">
          Set Your Study Preferences
        </h2>

        {/* Next Button */}
        <button
          onClick={() => setTab("timetable")}
          className={`px-6 py-2 text-white rounded-full ${
            hasSelectedTimeslots
              ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
              : "bg-gray-500 cursor-not-allowed"
          }`}
          disabled={!hasSelectedTimeslots}
        >
          Next
        </button>
      </div>

      {/* Time Selection Grid */}
      <div className="w-full overflow-x-auto mt-6">
        <div className="grid grid-cols-[0.5fr_repeat(5,1fr)] gap-0.5">
          {/* Empty top-left corner */}
          <div className="bg-gray-900 p-2"></div>

          {/* Day Headers */}
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="bg-gray-900 p-2 text-white text-center font-semibold"
            >
              {day}
            </div>
          ))}

          {/* Time Rows */}
          {times.map(({ label, value }) => (
            <React.Fragment key={value}>
              {/* Time Label */}
              <div
                className="bg-gray-900 text-white text-center flex items-center justify-center"
                style={{ height: "20px" }}
              >
                {label}
              </div>

              {/* Day Columns */}
              {daysOfWeek.map((day) => (
                <div
                  key={`${day}-${value}`}
                  data-day={day}
                  data-time={value}
                  className={`p-2 cursor-pointer ${
                    preferences.studyTimes[day]?.includes(value) ||
                    draggedTimeslots[day]?.has(value)
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                  style={{ height: "20px" }}
                  onMouseDown={(e) => handleMouseDown(e, day, value)}
                  onMouseEnter={() => handleMouseEnter(day, value)}
                  onMouseUp={handleMouseUp}
                  onTouchStart={(e) => handleTouchStart(e, day, value)}
                  onTouchMove={(e) => handleTouchMove(e)}
                  onTouchEnd={handleMouseUp}
                ></div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};

export default Preferences;
