import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMedicinesForUserLocal, createMedicineLogLocal } from "@/data/db";

interface Medicine {
  id: string;
  frequency: number;
  start_date: string;
  duration_days: number;
}

// Helper: convert an ISO timestamp or date string to a Date at midnight (local)
function dateOnlyFromISO(iso: string) {
  // If iso already looks like YYYY-MM-DD, return that date at midnight
  const datePart = iso.split("T")[0];
  const d = new Date(datePart + "T00:00:00");
  // normalize to remove time component (UTC/local differences handled by using the date part)
  d.setHours(0, 0, 0, 0);
  return d;
}

// This hook automatically creates medicine logs for the current day (local DB)
export function useMedicineScheduler(userId: string, medicines: Medicine[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!medicines || medicines.length === 0) return;

    const createTodaysLogs = async () => {
      const todayISO = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

      for (const medicine of medicines) {
        // Convert start_date to date-only (midnight) for correct inclusive comparison
        const startDateOnly = dateOnlyFromISO(medicine.start_date);
        const endDateOnly = new Date(startDateOnly);
        endDateOnly.setDate(endDateOnly.getDate() + medicine.duration_days);

        // Create a date object for today's date at midnight
        const todayDate = dateOnlyFromISO(todayISO);

        // If today is before start date or after end date, skip
        if (todayDate < startDateOnly || todayDate > endDateOnly) {
          continue;
        }

        // Check if logs already exist for today in local DB
        const existingLogs = await (async () => {
          const logs = await (await import("@/data/db")).getMedicineLogsForDateLocal(userId, todayISO);
          return logs.filter((l: any) => l.medicine_id === medicine.id);
        })();

        if (existingLogs && existingLogs.length > 0) {
          continue; // Logs already created for today
        }

        // Create logs based on frequency
        const logsToCreate: Array<{
          medicine_id: string;
          scheduled_date: string;
          scheduled_time: string;
          status: string;
        }> = [];
        const hoursPerDay = 24;
        const interval = Math.max(1, Math.floor(hoursPerDay / Math.max(1, medicine.frequency)));

        for (let i = 0; i < medicine.frequency; i++) {
          // Spread scheduled times across the day starting at 8 AM
          const hour = Math.min(8 + i * interval, 22); // clamp between 8 and 22
          const scheduledTime = `${hour.toString().padStart(2, "0")}:00:00`;

          logsToCreate.push({
            medicine_id: medicine.id,
            scheduled_date: todayISO,
            scheduled_time: scheduledTime,
            status: "pending",
          });
        }

        // Insert logs
        for (const lg of logsToCreate) {
          await createMedicineLogLocal(lg as any);
        }
      }

      // Refresh the logs query
      queryClient.invalidateQueries({ queryKey: ["medicine-logs", userId, todayISO] });
    };

    createTodaysLogs();

    // Run once per day at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    const midnightTimer = setTimeout(() => {
      createTodaysLogs();

      // Set up daily interval
      const dailyInterval = setInterval(createTodaysLogs, 24 * 60 * 60 * 1000);

      return () => clearInterval(dailyInterval);
    }, timeUntilMidnight);

    return () => clearTimeout(midnightTimer);
  }, [userId, medicines, queryClient]);
}