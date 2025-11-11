import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Pill, CheckCircle2, AlertCircle } from "lucide-react";
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

export function TodaysMedicines({ userId, medicines }: TodaysMedicinesProps) {
  const queryClient = useQueryClient();
  const todayISO = new Date().toISOString().split("T")[0];

  // Use React Query with EXACT key used in useMedicineScheduler
  const { data: logs = [], refetch } = useQuery({
    queryKey: ["medicine_logs", userId, todayISO],
    queryFn: () => getMedicineLogsForDateLocal(userId, todayISO),
    staleTime: 1000 * 30, // 30 seconds
  });

  // Backup: re-fetch when medicines change
  useEffect(() => {
    refetch();
  }, [medicines, refetch]);

  // Mutation: Mark as taken
  const markTaken = useMutation({
    mutationFn: async ({ logId, scheduledTime }: { logId: string; scheduledTime: string }) => {
      const now = new Date();
      const takenAt = now.toISOString();

      const [h, m] = scheduledTime.split(":").map(Number);
      const scheduled = new Date();
      scheduled.setHours(h, m, 0, 0);

      const diffMs = now.getTime() - scheduled.getTime();
      const isEarly = diffMs < -2 * 60 * 60 * 1000;
      const isLate = diffMs > 60 * 60 * 1000;

      await updateMedicineLogStatusLocal(logId, "taken", takenAt);
      return { takenAt, isEarly, isLate };
    },
    onSuccess: () => {
      refetch(); // This line fixes the button
      toast.success("Medicine marked as taken!");
    },
    onError: () => {
      toast.error("Failed to mark as taken");
    },
  });

  // Helpers
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

  const formatTime12 = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getRelativeTime = (scheduledTime: string, timing: string) => {
    const [h, m] = scheduledTime.split(":").map(Number);
    const scheduled = new Date();
    scheduled.setHours(h, m, 0, 0);

    const now = new Date();
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const tomorrowMidnight = new Date(todayMidnight);
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);

    // Only show relative time if scheduled is TODAY
    if (scheduled >= todayMidnight && scheduled < tomorrowMidnight) {
      const diffHours = Math.round((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60));
      if (diffHours > 0) {
        return `${diffHours}h later, ${getTimingLabel(timing)}`;
      } else if (diffHours === 0) {
        const diffMins = Math.round((scheduled.getTime() - now.getTime()) / (1000 * 60));
        return diffMins > 0 ? `${diffMins}m later, ${getTimingLabel(timing)}` : `now, ${getTimingLabel(timing)}`;
      }
    }

    // For doses after midnight → just show time
    return null;
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

  return (
    <Card className="shadow-[var(--shadow-card)] mb-6">
      <CardHeader>
        <CardTitle>Today's Medicines</CardTitle>
        <CardDescription>Mark when you take your dose</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map((log) => {
            const med = medicines.find((m) => m.id === log.medicine_id);
            const medName = getMedicineName(log.medicine_id);
            const isTaken = log.status === "taken";
            const offSchedule = isOffSchedule(log);
            const relativeHint = !isTaken && med ? getRelativeTime(log.scheduled_time, med.timing) : null;

            return (
              <div
                key={log.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isTaken
                    ? offSchedule
                      ? "border-yellow-500/40 bg-yellow-50/60"
                      : "border-green-500/40 bg-green-50/60"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/10">
                    <Pill className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{medName}</p>
                    <p className="text-xs text-muted-foreground">
                      {relativeHint || (
                      isTaken ? (
                        <span className={offSchedule ? "text-yellow-700" : "text-green-700"}>
                          {offSchedule ? "Taken off-schedule" : "Taken"} at {formatTime12(log.taken_at!)}
                        </span>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {log.scheduled_time.substring(0, 5)} ({getTimingLabel(med?.timing || "anytime")})
                        </>
                      )
                    )}
                    </p>
                  </div>
                </div>

                {isTaken ? (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5" disabled>
                    {offSchedule ? (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    <span className="text-xs">
                      {offSchedule ? "Off-schedule" : "Taken"}
                    </span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => markTaken.mutate({ logId: log.id, scheduledTime: log.scheduled_time })}
                    disabled={markTaken.isPending}
                    className="h-8 text-xs"
                  >
                    {markTaken.isPending ? "Marking..." : "Mark Taken"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}