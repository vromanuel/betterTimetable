"use client";

import React, { useState, useEffect } from "react";
import checkUnit from "../generate/download_data/checkUnits";
import uploadUnit from "../generate/download_data/uploadUnit";
import downloadUnit from "../generate/download_data/downloadUnits";
import TimetableView from "./timetableView"; // Adjust the import path as needed

// Define a color palette to assign colors to units dynamically
const colorPalette = [
  "bg-blue-1000",
  "bg-red-1000",
  "bg-green-1000",
  "bg-yellow-1000",
  "bg-purple-1000",
  "bg-orange-1000",
  "bg-pink-1000",
];

// -----------------------------------------------------------------------
// Data type definitions
// -----------------------------------------------------------------------

export interface Course {
  id: string;
  unitCode: string;
  unitName: string;
  classType: string;
  activity: string;
  day: string;
  time: string;
  room: string;
  teachingStaff: string;
}

interface CourseData {
  unitName: string;
  courses: Course[];
}

// -----------------------------------------------------------------------
// Details Component
// -----------------------------------------------------------------------
const Details = () => {
  const [courseList, setCourseList] = useState<{ [key: string]: CourseData }>({});
  const [unitCode, setUnitCode] = useState("");
  const [teachingPeriods, setTeachingPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [loading, setLoading] = useState(false);
  const [validPeriods, setValidPeriods] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Record<string, Record<string, Course>>>({});
  const [unitColors, setUnitColors] = useState<{ [unitCode: string]: string }>({});
  
  // Track which units' timeslots are visible
  const [visibleUnits, setVisibleUnits] = useState<{ [unitCode: string]: boolean }>({});

  // Fetch teaching periods on component mount
  useEffect(() => {
    const fetchTeachingPeriods = async () => {
      try {
        const response = await fetch("/api/teaching-data");
        const data = await response.json();
        if (!data || data.error) {
          setError("Failed to fetch teaching periods");
        } else {
          setTeachingPeriods(data);
        }
      } catch {
        setError("Failed to fetch teaching periods");
      }
    };
    fetchTeachingPeriods();
  }, []);


  useEffect(() => {
    console.log("UNITS FOR MANNY", selectedCourses);
  }, []);


  // Handlers for adding a unit
  const handleSearch = async () => {
    if (!unitCode) {
      setError("Please enter a unit code");
      return;
    }
    if (courseList[unitCode.toUpperCase()]) {
      setError("Unit already added");
      return;
    }
    setLoading(true);
    setError(null);
    setValidPeriods([]);
    try {
      const formattedUnitCode = unitCode.toUpperCase();
      let validResults: any[] = [];
      for (let period of teachingPeriods) {
        const response = await fetch(
          `/api/course-data?unitCode=${formattedUnitCode}&teachingPeriod=${period.value}`
        );
        const data = await response.json();
        if (Object.keys(data).length === 0) continue;
        if (data && !data.error) {
          validResults.push({ text: period.text, value: period.value });
        }
      }
      setValidPeriods(validResults);
      if (validResults.length === 0) {
        setError("No valid periods found for this unit.");
      } else {
        setShowDialog(true);
      }
    } catch (err) {
      setError("Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };
// Modify the handleAddUnit function to assign unique colors dynamically
const handleAddUnit = async () => {
  if (selectedPeriod) {
    const formattedUnitCode = unitCode.toUpperCase();
    try {
      const dbResponse = await checkUnit(formattedUnitCode);
      let unitData: CourseData;
      if (dbResponse.exists) {
        const courseResponse = await downloadUnit(formattedUnitCode);
        if (courseResponse.success) {
          unitData = {
            unitName: courseResponse.unitName,
            courses: courseResponse.courseData,
          };
        } else {
          setError("Invalid unit data received.");
          setShowDialog(false);
          setUnitCode("");
          setSelectedPeriod("");
          return;
        }
      } else {
        const response = await fetch(
          `/api/course-data?unitCode=${formattedUnitCode}&teachingPeriod=${selectedPeriod}`
        );
        const data = await response.json();
        unitData = data[formattedUnitCode];
        uploadUnit(formattedUnitCode, unitData.courses, unitData.unitName).catch((err) => {
          console.error("Failed to add unit to the database:", err);
        });
      }
      
      setCourseList((prev) => ({
        ...prev,
        [formattedUnitCode]: unitData,
      }));

      // PRINTING THE TIMESLOTS ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
      console.log("THIS IS THE COURSE LIST FOR MANNY", courseList);

      // Assign a unique color from the palette
      setUnitColors((prev) => {
        // Get the list of currently used colors
        const usedColors = Object.values(prev);

        // Find the first available (unused) color from the palette
        const availableColor = colorPalette.find((color) => !usedColors.includes(color)) || colorPalette[0];

        return {
          ...prev,
          [formattedUnitCode]: availableColor,
        };
      });

      // Set the unit's timeslots to be visible by default
      setVisibleUnits((prev) => ({
        ...prev,
        [formattedUnitCode]: true,
      }));

      setShowDialog(false);
      setUnitCode("");
      setSelectedPeriod("");
    } catch {
      setError("Failed to add the unit.");
    }
  } else {
    setError("Please select a valid teaching period.");
  }
};

const handleRemoveUnit = (unitCodeToRemove: string) => {
  setCourseList((prev) => {
    const updated = { ...prev };
    delete updated[unitCodeToRemove];
    return updated;
  });
  setSelectedCourses((prev) => {
    const updated = { ...prev };
    delete updated[unitCodeToRemove];
    return updated;
  });
  setUnitColors((prev) => {
    const updated = { ...prev };
    delete updated[unitCodeToRemove];
    return updated;
  });
  setVisibleUnits((prev) => {
    const updated = { ...prev };
    delete updated[unitCodeToRemove];
    return updated;
  });
};

  // Toggle the visibility of timeslots for a given unit
  const toggleUnitVisibility = (unitCode: string) => {
    setVisibleUnits((prev) => ({
      ...prev,
      [unitCode]: !prev[unitCode],
    }));
  };

  // Group courses by unit and activity
  const sidebarData: Record<string, Record<string, Course[]>> = Object.keys(courseList).reduce(
    (acc, unit) => {
      const courses = courseList[unit].courses;
      const groups = courses.reduce((groupAcc: Record<string, Course[]>, course) => {
        if (!groupAcc[course.activity]) {
          groupAcc[course.activity] = [];
        }
        groupAcc[course.activity].push(course);
        return groupAcc;
      }, {} as Record<string, Course[]>);
      acc[unit] = groups;
      return acc;
    },
    {} as Record<string, Record<string, Course[]>>
  );


  // PART THAT SELECTS THE UNITS -----------------------------------------------------------------------------------------------------------------------------------------------------------------
  const selectedCourseList = Object.keys(selectedCourses).reduce(
    (acc, unit) => {
      const selectedForUnit = Object.values(selectedCourses[unit]);
      if (selectedForUnit.length > 0) {
        acc[unit] = { unitName: courseList[unit].unitName, courses: selectedForUnit };
      }
      return acc;
    },
    {} as { [key: string]: { unitName: string; courses: Course[] } }
  );

  

  // Render the unit/timeslot selection UI
  return (
    <div className="flex flex-col md:flex-row bg-white">

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => {
            setShowDialog(false);
            setLoading(false); // Reset loading when popup is closed
          }}
        >
          <div
            className="bg-white border border-blue-1400 p-6 rounded-lg relative z-60"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the dialog
          >
            <button
              onClick={() => setShowDialog(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✖
            </button>
            <h2 className="text-xl mb-4 font-semibold text-blue-1300">Select a Teaching Period</h2>
            <select
              className="mb-4 px-6 py-2 rounded-lg bg-blue-1500 text-black"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="">Select period</option>
              {validPeriods.map((period: any) => (
                <option key={period.value} value={period.value}>
                  {period.text}
                </option>
              ))}
            </select>
            <div>
              <button
                onClick={handleAddUnit}
                className="px-6 py-2 bg-blue-1000 text-white hover:bg-blue-1100 rounded-full"
              >
                Add Unit
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="w-full md:w-1/4 p-6 bg-blue-1500 border-r border-gray-300">
      <div className="flex items-center justify-center w-full h-10 mb-6">
        {loading ? (
          <div className="text-blue-1300 font-bold text-xl">Searching...</div>
        ) : (
          <>
            <input
              type="text"
              className="px-6 py-2 mr-2 border text-gray-700 rounded-full bg-white border-blue-1400 w-full"
              placeholder="Enter unit code"
              value={unitCode}
              onChange={(e) => setUnitCode(e.target.value)}
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-1300 text-white rounded-full"
              disabled={loading}
            >
              Search
            </button>
          </>
        )}
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}

        <div>
          {Object.keys(sidebarData)
            .sort()
            .map((unit) => (
              <div key={unit} className="mb-3">
                <h3
                  className="text-lg text-white px-4 py-2 font-semibold bg-blue-1400 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleUnitVisibility(unit)} // Toggle on click
                >
                  <div className="flex items-center">
                    {/* Arrow that flips depending on visibility */}
                    <div
                      className={`mr-4 transform transition-transform ${
                        visibleUnits[unit] ? "rotate-180" : "mb-2"
                      }`}
                    >
                      <div className="w-2 h-2 border-solid border-r-2 border-b-2 border-white transform rotate-45"></div>
                    </div>
                    {unit}
                  </div>
                  <div className="flex items-center">
                    {/* Circle with the unit color */}
                    <div
                      className="unit-circle"
                      style={{ backgroundColor: unitColors[unit] || "white" }}
                    ></div>
                    <span
                      className="cursor-pointer text-white"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent toggle when clicking "✖"
                        handleRemoveUnit(unit);
                      }}
                    >
                      ✖
                    </span>
                  </div>
                </h3>
                {visibleUnits[unit] && (
                  <div className="max-h-[40vh] overflow-y-auto bg-white text-gray-600">
                  {Object.keys(sidebarData[unit]).map((activity) => (
                    <div key={activity} className="mb-4">
                      <p className="bg-gray-500 px-4 py-2 text-white">{activity.toUpperCase()}</p>
                      <ul className="list-none"> {/* Replaced list-disc with list-none */}
                        {sidebarData[unit][activity].map((course) => {
                          const isSelected =
                            selectedCourses[unit] &&
                            selectedCourses[unit][activity] &&
                            selectedCourses[unit][activity].id === course.id;
                          return (
                            <li
                              key={course.id}
                              onClick={() => {
                                setSelectedCourses((prev) => ({
                                  ...prev,
                                  [unit]: {
                                    ...prev[unit],
                                    [activity]: course,
                                  },
                                }));
                              }}
                              className={`px-4 py-2 cursor-pointer ${isSelected ? "bg-gray-300" : ""}`}
                            >
                              {course.day} {course.time}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>                
                )}
              </div>
            ))}
        </div>
      </section>

      <section className="w-full md:w-3/4 pr-6 pb-6">
        <TimetableView
          courseList={selectedCourseList}
          unitColors={unitColors}
          preferences={{ studyTimes: [] }} // Pass any preference settings here
        />
      </section>
    </div>
  );
};

export default Details;
