// hooks/useMedicineScheduler.ts
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMedicineLogsForDateLocal, createMedicineLogLocal } from "@/data/db";

interface Medicine {
  id: string;
  frequency: number;
  start_date: string;
  duration_days: number;
  is_active: boolean;
  timing: "before_meal" | "after_meal" | "anytime";
}

// Helper: get date-only (midnight) from ISO string
const dateOnly = (iso: string) => {
  const d = new Date(iso.split("T")[0] + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  return d;
};

export function useMedicineScheduler(userId: string, medicines: Medicine[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || medicines.length === 0) return;

    const todayISO = new Date().toISOString().split("T")[0];

    const createTodaysLogs = async () => {
      const createPromises: Promise<any>[] = [];

      for (const med of medicines) {
        if (!med.is_active) continue;

        const start = dateOnly(med.start_date);
        const end = new Date(start);
        end.setDate(end.getDate() + med.duration_days);
        const today = dateOnly(todayISO);

        if (today < start || today > end) continue;

        // Fetch existing logs for this medicine + today
        const existing = await getMedicineLogsForDateLocal(userId, todayISO);
        const existingTimes = new Set(
          existing
            .filter((l) => l.medicine_id === med.id)
            .map((l) => l.scheduled_time)
        );

        // Decide dose times based on frequency + timing
        const times: string[] = [];

        if (med.frequency <= 3 && med.timing !== "anytime") {
          // Fixed times: 8 AM, 2 PM, 8 PM
          const fixed = ["08:00:00", "14:00:00", "20:00:00"];
          times.push(...fixed.slice(0, med.frequency));
        } else {
          // Evenly spaced across 24h, starting at 8 AM
          const interval = 24 / med.frequency;
          let hour = 8; // start at 8 AM

          for (let i = 0; i < med.frequency; i++) {
            const h = Math.floor(hour);
            const m = Math.round((hour - h) * 60);
            const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
            times.push(time);
            hour += interval;
          }
        }

        // Create missing logs
        for (const time of times) {
          if (!existingTimes.has(time)) {
            createPromises.push(
              createMedicineLogLocal({
                medicine_id: med.id,
                scheduled_date: todayISO,
                scheduled_time: time,
                status: "pending",
              })
            );
          }
        }
      }

      if (createPromises.length > 0) {
        await Promise.all(createPromises);
        queryClient.invalidateQueries({
          queryKey: ["medicine-logs", userId, todayISO],
        });
      }
    };

    createTodaysLogs();
  }, [userId, medicines, queryClient]);
}