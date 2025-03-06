import { parseCourseTime } from "./helperFunctions";
import {
  Course,
  ScheduledTime,
  CourseTimes,
  FilteredCourseList,
  UnitDomain,
  ActivityDomain,
} from "./interfaces";

/// -----------------------------------------------------------------------------------------------------
///
///                                      RECURSIVE FUNCTIONS
///         These are used to allocate timeslots without clashes, incorporating optimizations
///
/// -----------------------------------------------------------------------------------------------------

export default function scheduleUnits(
  unitDomains: UnitDomain[],
  scheduledTimesPerDay: CourseTimes,
  finalSchedule: FilteredCourseList
): boolean {
  //// Function to recursively schedule units using MRV heuristic
  ///
  /// inputs:
  ///   unitDomains: UnitDomain[] - Array of units with their current course options
  ///   scheduledTimesPerDay: CourseTimes - Current scheduled times per day
  ///   finalSchedule: FilteredCourseList - Accumulating final schedule
  /// outputs:
  ///   boolean - Returns true if scheduling was successful, false otherwise
  ///

  // Base case: all units have been scheduled
  if (unitDomains.length === 0) {
    return true;
  }

  // Select the next unit U with Minimum Remaining Values (MRV)
  const unitToSchedule = selectNextUnit(unitDomains);

  // Remove the selected unit from the domain list
  const remainingUnits = unitDomains.filter(
    (unit) => unit.unitCode !== unitToSchedule.unitCode
  );

  // Initialize the final schedule entry for the unit
  finalSchedule[unitToSchedule.unitCode] = {
    unitName: unitToSchedule.unitName,
    courses: [],
  };

  // Sort activities to prioritize those with fewer options (MRV within the unit)
  unitToSchedule.activities.sort((a, b) => a.courses.length - b.courses.length);

  // Schedule activities for the unit
  if (
    scheduleActivities(
      unitToSchedule,
      0,
      remainingUnits,
      scheduledTimesPerDay,
      finalSchedule
    )
  ) {
    return true;
  } else {
    // Conflict-directed backjumping
    return false;
  }
}

function selectNextUnit(units: UnitDomain[]): UnitDomain {
  //// Function to select the next unit to schedule using MRV heuristic
  ///
  /// inputs:
  ///   units: UnitDomain[] - Array of units with their current course options
  /// outputs:
  ///   UnitDomain - The unit selected to schedule next
  ///

  units.sort(
    (a, b) => totalDomainSize(a.activities) - totalDomainSize(b.activities)
  );
  return units[0];
}

function totalDomainSize(activities: ActivityDomain[]): number {
  //// Function to calculate the total number of course options across all activities
  ///
  /// inputs:
  ///   activities: ActivityDomain[] - Array of activities for a unit
  /// outputs:
  ///   number - The total number of course options
  ///

  return activities.reduce((acc, activity) => acc + activity.courses.length, 0);
}

function scheduleActivities(
  unit: UnitDomain,
  activityIndex: number,
  unitDomains: UnitDomain[],
  scheduledTimesPerDay: CourseTimes,
  finalSchedule: FilteredCourseList
): boolean {
  //// Function to recursively schedule activities of a unit
  ///
  /// inputs:
  ///   unit: UnitDomain - The unit being scheduled
  ///   activityIndex: number - The index of the activity to schedule
  ///   unitDomains: UnitDomain[] - Remaining units to schedule
  ///   scheduledTimesPerDay: CourseTimes - Current scheduled times per day
  ///   finalSchedule: FilteredCourseList - Accumulating final schedule
  /// outputs:
  ///   boolean - Returns true if scheduling was successful, false otherwise
  ///

  // Base case: all activities for this unit have been scheduled
  if (activityIndex >= unit.activities.length) {
    // Proceed to schedule the next unit
    return scheduleUnits(unitDomains, scheduledTimesPerDay, finalSchedule);
  }

  const activity = unit.activities[activityIndex];

  // Order courses by Least Constraining Value (LCV)
  const orderedCourses = orderCoursesByLCV(activity.courses, unitDomains);

  // Try each course option for the current activity
  for (const course of orderedCourses) {
    // Parse course times
    const { startTime, endTime } = parseCourseTimes(course.time);

    const scheduledTimes = scheduledTimesPerDay[course.day];

    // Check for time conflicts
    if (!hasTimeConflict(scheduledTimes, startTime, endTime)) {
      // Apply forward checking
      const prunedDomains = applyForwardChecking(
        unitDomains,
        course,
        startTime,
        endTime,
        course.day
      );

      if (domainsAreEmpty(prunedDomains)) {
        // Domains are empty after forward checking; undo and continue
        continue;
      }

      // Tentatively schedule the course
      finalSchedule[unit.unitCode].courses.push(course);
      scheduledTimes.push({
        start: startTime,
        end: endTime,
        unitCode: unit.unitCode,
        activity: course.activity,
      });

      // Recursively schedule the next activity
      if (
        scheduleActivities(
          unit,
          activityIndex + 1,
          prunedDomains,
          scheduledTimesPerDay,
          finalSchedule
        )
      ) {
        return true;
      }

      // Backtrack: remove the tentatively scheduled course and time
      finalSchedule[unit.unitCode].courses.pop();
      scheduledTimes.pop();
    }
  }

  // Unable to schedule this activity without conflicts
  return false;
}

function orderCoursesByLCV(
  courses: Course[],
  unitDomains: UnitDomain[]
): Course[] {
  //// Function to order courses based on Least Constraining Value heuristic
  ///
  /// inputs:
  ///   courses: Course[] - Array of possible courses for an activity
  ///   unitDomains: UnitDomain[] - Remaining units to schedule
  /// outputs:
  ///   Course[] - Ordered array of courses
  ///

  // Order the courses based on the least constraining value
  return courses.sort((a, b) => {
    const impactA = calculateImpact(a, unitDomains);
    const impactB = calculateImpact(b, unitDomains);
    return impactA - impactB;
  });
}

function calculateImpact(course: Course, unitDomains: UnitDomain[]): number {
  //// Function to calculate the impact of selecting a course on future options
  ///
  /// inputs:
  ///   course: Course - The course being considered
  ///   unitDomains: UnitDomain[] - Remaining units to schedule
  /// outputs:
  ///   number - The number of options eliminated by selecting this course
  ///

  // Calculate how many options will be eliminated in other units if this course is selected
  let impact = 0;

  const { startTime, endTime } = parseCourseTimes(course.time);
  const courseDay = course.day;

  for (const unit of unitDomains) {
    for (const activity of unit.activities) {
      for (const otherCourse of activity.courses) {
        if (otherCourse.day !== courseDay) continue;
        const { startTime: otherStart, endTime: otherEnd } = parseCourseTimes(
          otherCourse.time
        );
        if (startTime < otherEnd && endTime > otherStart) {
          impact++;
        }
      }
    }
  }

  return impact;
}

function applyForwardChecking(
  unitDomains: UnitDomain[],
  course: Course,
  startTime: Date,
  endTime: Date,
  day: string
): UnitDomain[] {
  //// Function to apply forward checking by pruning conflicting options in future units
  ///
  /// inputs:
  ///   unitDomains: UnitDomain[] - Remaining units to schedule
  ///   course: Course - The course being tentatively scheduled
  ///   startTime: Date - Start time of the course
  ///   endTime: Date - End time of the course
  ///   day: string - Day of the week for the course
  /// outputs:
  ///   UnitDomain[] - Pruned unit domains after forward checking
  ///

  // Create a deep copy of unitDomains to prune
  const prunedDomains = unitDomains.map((unit) => ({
    ...unit,
    activities: unit.activities.map((activity) => ({
      ...activity,
      courses: activity.courses.filter((c) => {
        if (c.day !== day) return true;
        const { startTime: cStart, endTime: cEnd } = parseCourseTimes(c.time);
        // Exclude courses that conflict with the current course
        return !(startTime < cEnd && endTime > cStart);
      }),
    })),
  }));

  return prunedDomains;
}

function domainsAreEmpty(unitDomains: UnitDomain[]): boolean {
  //// Function to check if any unit has no valid courses remaining
  ///
  /// inputs:
  ///   unitDomains: UnitDomain[] - Units with their current course options
  /// outputs:
  ///   boolean - Returns true if any unit has an empty domain, false otherwise
  ///

  // Check if any unit has no courses left to schedule
  for (const unit of unitDomains) {
    for (const activity of unit.activities) {
      if (activity.courses.length === 0) {
        return true;
      }
    }
  }
  return false;
}

function parseCourseTimes(timeRange: string): {
  startTime: Date;
  endTime: Date;
} {
  //// Function to parse course time strings into start and end Date objects
  ///
  /// inputs:
  ///   timeRange: string - Time range string (e.g., "9:00am - 10:30am")
  /// outputs:
  ///   { startTime: Date; endTime: Date } - Parsed start and end times
  ///

  const [startTimeStr, endTimeStr] = timeRange.split(" - ");
  const startTime = parseCourseTime(startTimeStr);
  const endTime = parseCourseTime(endTimeStr);
  return { startTime, endTime };
}

function hasTimeConflict(
  scheduledTimes: ScheduledTime[],
  startTime: Date,
  endTime: Date
): boolean {
  //// Function to check for time conflicts with already scheduled courses
  ///
  /// inputs:
  ///   scheduledTimes: ScheduledTime[] - Scheduled times for a specific day
  ///   startTime: Date - Start time of the course being considered
  ///   endTime: Date - End time of the course being considered
  /// outputs:
  ///   boolean - Returns true if there is a conflict, false otherwise
  ///

  for (const scheduled of scheduledTimes) {
    if (startTime < scheduled.end && endTime > scheduled.start) {
      return true;
    }
  }
  return false;
}
