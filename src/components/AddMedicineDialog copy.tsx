import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import medicines from "@/data/medicines.json";
import { createMedicineLocal } from "@/data/db";

interface AddMedicineDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMedicineDialog({ userId, open, onOpenChange }: AddMedicineDialogProps) {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("2");
  const [timing, setTiming] = useState<"before_meal" | "after_meal" | "anytime">("after_meal");
  const [durationDays, setDurationDays] = useState("7");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const queryClient = useQueryClient();

  // Filter medicines based on input (match trade_name or company)
  const suggestions = useMemo(() => {
    if (!name) return [];
    const s = name.toLowerCase().trim();
    return (medicines as any[])
      .filter((m) => {
        const trade = (m.trade_name || "").toLowerCase();
        const company = (m.company || "").toLowerCase();
        return trade.includes(s) || company.includes(s);
      })
      .slice(0, 8);
  }, [name]);

  const addMedicine = useMutation({
    mutationFn: async (medicine: {
      user_id: string;
      name: string;
      frequency: number;
      timing: string;
      start_date: string;
      duration_days: number;
      generic_name?: string;
      dosage_form?: string;
    }) => {
      return await createMedicineLocal(medicine as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success("Medicine added successfully!");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to add medicine");
    },
  });

  const resetForm = () => {
    setName("");
    setFrequency("2");
    setTiming("after_meal");
    setDurationDays("7");
    setShowSuggestions(false);
  };

  const handleSelectMedicine = (med: any) => {
    setName(med.trade_name || med.generic_with_strength || "");
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !frequency || !durationDays) {
      toast.error("Please fill in all fields");
      return;
    }

    // try to find selected suggestion to fill generic/dosage fields
    const found = (medicines as any[]).find((m) => (m.trade_name || "").toLowerCase() === name.toLowerCase());

    addMedicine.mutate({
      user_id: userId,
      name,
      frequency: parseInt(frequency),
      timing,
      start_date: new Date().toISOString(),
      duration_days: parseInt(durationDays),
      generic_name: found?.generic_with_strength || "",
      dosage_form: found?.dosage_form || "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Medicine</DialogTitle>
          <DialogDescription>
            Fill in the details for your new medication
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 relative">
            <Label htmlFor="medicine-name">Medicine Name</Label>
            <Input
              id="medicine-name"
              placeholder="Start typing trade name or company..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              required
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {suggestions.map((med, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectMedicine(med)}
                    className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{med.trade_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {med.company ? med.company : med.generic_with_strength}
                        {med.dosage_form ? ` — ${med.dosage_form}` : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">How many times per day?</Label>
            <Input
              id="frequency"
              type="number"
              min="1"
              max="10"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>When to take?</Label>
            <RadioGroup value={timing} onValueChange={(value: any) => setTiming(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="before_meal" id="before" />
                <Label htmlFor="before" className="font-normal cursor-pointer">
                  Before Meal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="after_meal" id="after" />
                <Label htmlFor="after" className="font-normal cursor-pointer">
                  After Meal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="anytime" id="anytime" />
                <Label htmlFor="anytime" className="font-normal cursor-pointer">
                  Anytime
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (days)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={addMedicine.isPending}>
              {addMedicine.isPending ? "Adding..." : "Add Medicine"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}