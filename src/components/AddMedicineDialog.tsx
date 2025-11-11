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
import { toast } from "sonner";
import medicines from "@/data/medicines.json";
import { createMedicineLocal, updateMedicineLocal } from "@/data/db";
import { useQuery } from "@tanstack/react-query";
import { getMedicinesForUserLocal } from "@/data/db";

interface Medicine {
  id: string;
  user_id: string;
  name: string;
  frequency: number;
  timing: "before_meal" | "after_meal" | "anytime";
  start_date: string;
  duration_days: number;
  generic_name?: string;
  dosage_form?: string;
}

interface AddMedicineDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMedicine?: Medicine | null;
  onRequestEdit?: (medicineId: string | null) => void;
}

export function AddMedicineDialog({
  userId,
  open,
  onOpenChange,
  editingMedicine,
  onRequestEdit,
}: AddMedicineDialogProps) {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("2");
  const [timing, setTiming] = useState<"before_meal" | "after_meal" | "anytime">("after_meal");
  const [durationDays, setDurationDays] = useState("7");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const queryClient = useQueryClient();

  const isEditing = !!editingMedicine?.id;

  // Pre-fill form when editing
  useEffect(() => {
    if (editingMedicine) {
      setName(editingMedicine.name || "");
      setFrequency(String(editingMedicine.frequency || 2));
      setTiming(editingMedicine.timing);
      setDurationDays(String(editingMedicine.duration_days || 7));
    } else {
      setName("");
      setFrequency("2");
      setTiming("after_meal");
      setDurationDays("7");
    }
    setShowSuggestions(false);
  }, [editingMedicine]);

  // Suggestions based on input
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

  // Fetch existing medicines to check duplicates
  const { data: existingMedicines } = useQuery({
    queryKey: ["medicines", userId],
    queryFn: () => getMedicinesForUserLocal(userId),
  });

  // Unified mutation: Add or Update
  const mutation = useMutation({
    mutationFn: async (medicine: any) => {
      if (isEditing) {
        return await updateMedicineLocal({
          ...medicine,
          id: editingMedicine.id,
        });
      }
      return await createMedicineLocal(medicine);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", userId] });
      toast.success(isEditing ? "Medicine updated!" : "Medicine added!");
      onOpenChange(false);
      onRequestEdit?.(null); // Clear edit mode
    },
    onError: () => {
      toast.error(`Failed to ${isEditing ? "update" : "add"} medicine`);
    },
  });

  const handleSelectMedicine = (med: any) => {
    setName(med.trade_name || med.generic_with_strength || "");
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !frequency || !durationDays) {
      toast.error("Please fill in all fields");
      return;
    }

    const now = new Date();

    // Check for duplicate active medicine (skip self when editing)
    const duplicate = existingMedicines?.find((med: any) => {
      if (isEditing && med.id === editingMedicine.id) return false;

      const medStartDate = new Date(med.start_date);
      const medEndDate = new Date(medStartDate);
      medEndDate.setDate(medEndDate.getDate() + (med.duration_days || 0));

      return (
        med.name.toLowerCase() === name.toLowerCase() &&
        medEndDate >= now
      );
    });

    if (duplicate) {
      const medEndDate = new Date(new Date(duplicate.start_date));
      medEndDate.setDate(medEndDate.getDate() + (duplicate.duration_days || 0));

      const formattedDate = medEndDate.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      toast.error(
        `"${name}" is already active.\nYou can add it again after ${formattedDate}.`
      );
      return;
    }

    // Try to enrich with generic/dosage
    const found = (medicines as any[]).find(
      (m) => (m.trade_name || "").toLowerCase() === name.toLowerCase()
    );

    mutation.mutate({
      user_id: userId,
      name,
      frequency: parseInt(frequency),
      timing,
      start_date: editingMedicine?.start_date || new Date().toISOString(),
      duration_days: parseInt(durationDays),
      generic_name:
        found?.generic_with_strength ||
        editingMedicine?.generic_name ||
        "",
      dosage_form:
        found?.dosage_form ||
        editingMedicine?.dosage_form ||
        "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Medicine" : "Add New Medicine"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of your medication"
              : "Fill in the details for your new medication"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Medicine Name – Read-only when editing */}
<div className="space-y-2 relative">
  <Label htmlFor="medicine-name">Medicine Name</Label>

  {isEditing ? (
    /* READ-ONLY VIEW when editing */
    <div className="flex items-center h-10 px-3 py-2 rounded-md border border-input bg-background text-sm">
      {name}
    </div>
  ) : (
    /* EDITABLE INPUT when adding */
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
  )}

  {/* Suggestions – only show when adding (not editing) */}
  {!isEditing && showSuggestions && suggestions.length > 0 && (
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
              {med.company
                ? med.company
                : med.generic_with_strength}
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
              onClick={() => {
                onOpenChange(false);
                onRequestEdit?.(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? isEditing
                  ? "Updating..."
                  : "Adding..."
                : isEditing
                ? "Update Medicine"
                : "Add Medicine"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}