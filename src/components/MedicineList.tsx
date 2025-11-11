import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Pill, Trash2, Calendar, CheckCircle2 } from "lucide-react";
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
  onEdit: (medicine: Medicine) => void; // REQUIRED now
}

export function MedicineList({ userId, medicines, onEdit }: MedicineListProps) {
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
    switch (timing) {
      case "before_meal":
        return "Before Meal";
      case "after_meal":
        return "After Meal";
      default:
        return "Anytime";
    }
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
        const isCompleted = daysRemaining <= 0 || !medicine.is_active;
        const isActive = medicine.is_active && daysRemaining > 0;

        return (
          <div
            key={medicine.id}
            className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
              isCompleted
                ? "bg-muted/50 border-border/50 opacity-70"
                : "bg-card border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isActive ? "bg-primary/10" : "bg-muted"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Pill className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${isCompleted ? "text-muted-foreground" : ""}`}>
                  {medicine.name}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {medicine.frequency}x daily
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getTimingLabel(medicine.timing)}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {isCompleted
                      ? "Completed"
                      : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Edit Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(medicine)}
                className="h-8 w-8 p-0"
                disabled={deleteMedicine.isPending}
              >
                <Edit className="h-4 w-4" />
              </Button>

              {/* Delete Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm(`Remove "${medicine.name}"?`)) {
                    deleteMedicine.mutate(medicine.id);
                  }
                }}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={deleteMedicine.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}