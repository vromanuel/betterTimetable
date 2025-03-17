"use server";

import { drizzle } from "drizzle-orm/mysql2";
import { units } from "../../../db/schema";
import { eq, sql } from "drizzle-orm";

export default async function checkUnits(unitCode: string, unitName?: string) {
    const db = drizzle(process.env.DATABASE_URL!);

    try {
        // Check if unit already exists in the database
        const existingUnitQuery = await db
        .select()
        .from(units)
        .where(eq(units.unitCode, unitCode))
        .limit(1)
        .execute();

        const existingUnit = existingUnitQuery[0];

        if (existingUnit) {
            return { exists: true, unitData: existingUnit };
        }
        else {
            return { exists: false };
        }

    }  
    catch (error) {
        console.error("Error checking unit:", error);
        return { exists: false , message: "Something went wrong. Please try again"};
    }

}