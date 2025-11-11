import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { deactivateMedicineLocal } from "@/data/db";

interface Medicine {
  id: string;
  name: string;
  frequency: number;
  timing: string;
  duration_days: number;
  start_date: string;
  is_active: boolean;
}

interface MedicineListProps {
  userId: string;
  medicines: Medicine[];
}

export function MedicineList({ userId, medicines }: MedicineListProps) {
  const queryClient = useQueryClient();

  const deleteMedicine = useMutation({
    mutationFn: async (medicineId: string) => {
      return await deactivateMedicineLocal(medicineId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", userId] });
      toast.success("Medicine removed");
    },
    onError: () => {
      toast.error("Failed to remove medicine");
    },
  });

  const getTimingLabel = (timing: string) => {
    if (timing === "before_meal") return "Before Meal";
    if (timing === "after_meal") return "After Meal";
    return "Anytime";
  };

  const getDaysRemaining = (startDate: string, durationDays: number) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + durationDays);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!medicines || medicines.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Pill className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No medicines added yet</p>
        <p className="text-sm mt-1">Click "Add Medicine" to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {medicines.map((medicine) => {
        const daysRemaining = getDaysRemaining(medicine.start_date, medicine.duration_days);
        return (
          <div
            key={medicine.id}
            className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 bg-card transition-all"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Pill className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{medicine.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {medicine.frequency}x daily
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getTimingLabel(medicine.timing)}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {daysRemaining > 0 ? `${daysRemaining} days left` : "Completed"}
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMedicine.mutate(medicine.id)}
              disabled={deleteMedicine.isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}