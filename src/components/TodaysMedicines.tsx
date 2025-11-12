import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Pill, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getMedicineLogsForDateLocal, updateMedicineLogStatusLocal } from "@/data/db";

interface Medicine {
  id: string;
  name: string;
  frequency: number;
  timing: "before_meal" | "after_meal" | "anytime";
  start_date: string;
  duration_days: number;
  is_active: boolean;
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

type FilterOption = "whole_day" | "until_noon" | "until_evening" | "until_midnight";

export function TodaysMedicines({ userId, medicines }: TodaysMedicinesProps) {
  const queryClient = useQueryClient();
  const todayISO = new Date().toISOString().split("T")[0];
  const [filter, setFilter] = useState<FilterOption>("whole_day");

  const { data: logs = [], refetch } = useQuery({
    queryKey: ["medicine_logs", userId, todayISO],
    queryFn: () => getMedicineLogsForDateLocal(userId, todayISO),
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    refetch();
  }, [medicines, refetch]);

const markTaken = useMutation({
  mutationFn: async ({ logId }: { logId: string }) => {
    const takenAt = new Date().toISOString(); // fine
    await updateMedicineLogStatusLocal(logId, "taken", takenAt);
    return { takenAt };
  },
  onSuccess: () => {
    refetch();
    toast.success("Medicine marked as taken!");
  },
  onError: () => toast.error("Failed to mark as taken"),
});


  const getMedicineName = (medicineId: string) => {
    const med = medicines.find((m) => m.id === medicineId && m.is_active);
    return med?.name || "Unknown";
  };

  const getTimingLabel = (timing: string) => {
    switch (timing) {
      case "before_meal": return "before meal";
      case "after_meal": return "after meal";
      default: return "anytime";
    }
  };

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const isOffSchedule = (log: MedicineLog) => {
    if (log.status !== "taken" || !log.taken_at) return false;
    const [h, m] = log.scheduled_time.split(":").map(Number);
    const scheduled = new Date();
    scheduled.setHours(h, m, 0, 0);
    const taken = new Date(log.taken_at);
    const diffMs = taken.getTime() - scheduled.getTime();
    return diffMs < -2 * 60 * 60 * 1000 || diffMs > 60 * 60 * 1000;
  };

  const isMissed = (log: MedicineLog) => {
    if (log.status === "taken") return false;
    const [h, m] = log.scheduled_time.split(":").map(Number);
    const scheduled = new Date();
    scheduled.setHours(h, m, 0, 0);
    const now = new Date();
    return now.getTime() - scheduled.getTime() > 60 * 60 * 1000; // missed if 1h passed
  };

  if (logs.length === 0) {
    return (
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Today's Medicines</CardTitle>
          <CardDescription>No medicines scheduled for today</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Apply filter
  const filterEndHour = {
    whole_day: 24,
    until_noon: 12,
    until_evening: 18,
    until_midnight: 24,
  }[filter];

  const filteredLogs = logs.filter(log => {
    const [h] = log.scheduled_time.split(":").map(Number);
    return h < filterEndHour;
  });

  // Group logs by medicine
  const groupedLogs: Record<string, MedicineLog[]> = {};
  filteredLogs.forEach(log => {
    if (!groupedLogs[log.medicine_id]) groupedLogs[log.medicine_id] = [];
    groupedLogs[log.medicine_id].push(log);
  });

  // Sort logs by scheduled_time
  Object.keys(groupedLogs).forEach(medId => {
    groupedLogs[medId].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  });

  return (
    <Card className="shadow-[var(--shadow-card)] mb-6">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <CardTitle>Today's Medicines</CardTitle>
          <CardDescription>Mark when you take your dose</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border rounded p-1 text-sm"
            value={filter}
            onChange={e => setFilter(e.target.value as FilterOption)}
          >
            <option value="whole_day">Whole Day</option>
            <option value="until_noon">Until Noon (12PM)</option>
            <option value="until_evening">Until Evening (6PM)</option>
            <option value="until_midnight">Until Midnight (12AM)</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedLogs).map(([medId, medLogs]) => {
          const medName = getMedicineName(medId);
          return (
            <div key={medId} className="space-y-2">
              <p className="font-medium text-sm border-b pb-1">{medName}</p>
              <div className="space-y-1">
                {medLogs.map((log, idx) => {
                  const isTaken = log.status === "taken";
                  const offSchedule = isOffSchedule(log);
                  const missed = isMissed(log);
                  const doseLabel = `Dose ${idx + 1}`;
                  const scheduledTime = formatTime12(log.scheduled_time);
                  const takenTime = log.taken_at && !isNaN(new Date(log.taken_at).getTime())
  ? new Date(log.taken_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  : new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });


                  let message = "";
                  if (missed) {
                    message = `${doseLabel} was missed (scheduled at ${scheduledTime})`;
                  } else if (offSchedule && takenTime) {
                    message = `${doseLabel} was taken off-schedule at ${takenTime} instead of ${scheduledTime}`;
                  } else if (isTaken && takenTime) {
                    message = `${doseLabel} taken at ${takenTime}`;
                  } else {
                    message = `${doseLabel} at ${scheduledTime}`;
                  }

                  return (
                    <div
                      key={log.id}
                      className={`flex items-center justify-between p-2 rounded border transition-all ${
                        missed
                          ? "border-red-500/40 bg-red-50/60 text-red-700"
                          : isTaken
                            ? offSchedule
                              ? "border-yellow-500/40 bg-yellow-50/60 text-yellow-700"
                              : "border-green-500/40 bg-green-50/60 text-green-700"
                            : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 text-xs">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-primary/10">
                          <Pill className="w-4 h-4 text-primary" />
                        </div>
                        <div>{message}</div>
                      </div>
                      {!isTaken && !missed && (
                        <Button
                          size="sm"
                          onClick={() => markTaken.mutate({ logId: log.id })}
                          disabled={markTaken.isPending}
                          className="h-7 text-xs"
                        >
                          {markTaken.isPending ? "Marking..." : "Mark Taken"}
                        </Button>
                      )}
                      {missed && <XCircle className="w-5 h-5 text-red-600" />}
                      {isTaken && offSchedule && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                      {isTaken && !offSchedule && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
