import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { getMedicineLogsForDateLocal, getMedicinesForUserLocal } from "@/data/db";
import { useEffect } from "react";

interface Medicine {
  id: string;
  name: string;
  frequency: number;
  timing: string;
  duration_days: number;
  start_date: string;
}

interface MedicineLog {
  id: string;
  medicine_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "pending" | "taken" | "skipped";
  taken_at?: string | null;
}

interface TodaysMedicinesProps {
  userId: string;
  medicines: Medicine[];
}

export function TodaysMedicines({ userId, medicines }: TodaysMedicinesProps) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: todaysLogs } = useQuery({
    queryKey: ["medicine-logs", userId, today],
    queryFn: async () => {
      // returns logs that belong to user's medicines for today
      return await getMedicineLogsForDateLocal(userId, today);
    },
  });

  const markAsTaken = async (logId: string) => {
    // simple local update: set status to taken and taken_at
    const db = await import("@/data/db");
    await (db.db as any).medicine_logs.update(logId, {
      status: "taken",
      taken_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["medicine-logs", userId, today] });
    queryClient.invalidateQueries({ queryKey: ["medicines", userId] });
  };

  const getMedicineName = (medicineId: string) => {
    return medicines.find((m) => m.id === medicineId)?.name || "Unknown";
  };

  const getTimingLabel = (medicineId: string) => {
    const timing = medicines.find((m) => m.id === medicineId)?.timing;
    if (timing === "before_meal") return "Before Meal";
    if (timing === "after_meal") return "After Meal";
    return "Anytime";
  };

  const pendingCount = todaysLogs?.filter((log) => log.status === "pending").length || 0;
  const takenCount = todaysLogs?.filter((log) => log.status === "taken").length || 0;

  return (
    <Card className="mb-6 shadow-[var(--shadow-card)] border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Today's Medicines</CardTitle>
            <div className="text-sm text-muted-foreground">
              {pendingCount} pending, {takenCount} taken
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{today}</Badge>
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {todaysLogs && todaysLogs.length > 0 ? (
          <div className="space-y-3">
            {todaysLogs.map((log: MedicineLog) => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div>
                  <div className="font-semibold">{getMedicineName(log.medicine_id)}</div>
                  <div className="text-xs text-muted-foreground">
                    {getTimingLabel(log.medicine_id)} — {log.scheduled_time}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => markAsTaken(log.id)} disabled={log.status === "taken"}>
                    Mark Taken
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No medicines scheduled for today</div>
        )}
      </CardContent>
    </Card>
  );
}