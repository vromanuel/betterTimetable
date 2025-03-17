// This file is crucial for formatting the drizzle schema

import { mysqlTable, mysqlSchema, varchar, boolean, text, int, timestamp, time, primaryKey } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

//Schema overview
//users(_id#, _userName, title, firstName, lastName, email, admin)
//userPwdResets(_id#, userId#, code, expiresAt)
//sessions(_id#, userId#, expiresAt)
//units(_id#, unitCode, unitName)
//teachingPeriods(_id#, periodName)
//classes(_id#, unitId#, periodId#, classTyhpe, activity, day, time, room, teachingStaff)
//userClasses(userId#, classId#)

// Users Table
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  username: varchar("username", { length: 255 }).unique(),
  passwordHash: text("passwordHash"),
  title: varchar("title", { length: 50 }),
  firstName: varchar("firstName", { length: 255 }),
  lastName: varchar("lastName", { length: 255 }),
  email: varchar("email", { length: 255 }),
  admin: boolean("admin").default(false),
});

// Password Resets Table
export const userPwdResets = mysqlTable("user_pwd_resets", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("userId", { length: 36 }).notNull(),
  code: varchar("code", { length: 255 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

// Sessions Table
export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("userId", { length: 36 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

// Units Table
export const units = mysqlTable("units", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  unitCode: varchar("unitCode", { length: 255 }).unique(),
  unitName: varchar("unitName", { length: 255 }),
  periodId: varchar("periodId", { length: 36 }).notNull().references(() => teachingPeriods.id),
});

//teachingPeriods table
export const teachingPeriods = mysqlTable("teachingPeriods", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  periodName: varchar("periodName", { length: 255 })
});

// timeslots table
export const timeslots = mysqlTable("timeslots", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  unitId: varchar("unitId", { length: 36 }).notNull().references(() => units.id),
  classType: varchar("classType", { length: 255 }),
  activity: varchar("activity", { length: 255 }),
  day: varchar("day", { length: 255 }),
  classTime: time("classTime"),
  room: varchar("room", { length: 255 }),
  teachingStaff: varchar("teachingStaff", { length: 255 })
});

//userClasses table
export const userClasses = mysqlTable("userClasses", {
  userId: varchar("userId", { length: 36 }).notNull().references(() => users.id),
  classId: varchar("classId", { length: 36 }).notNull().references(() => timeslots.id)
});