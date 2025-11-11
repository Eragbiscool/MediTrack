import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import medicines from "@/data/medicines.json";
import {
  createMedicineLocal,
  updateMedicineLocal,
  deleteMedicineLogsForMedicine,
  getMedicinesForUserLocal,
} from "@/data/db";

interface Medicine {
  id: string;
  user_id: string;
  name: string;
  frequency: number;
  timing: "before_meal" | "after_meal" | "anytime";
  start_date: string;
  duration_days: number;
  custom_dose_times?: string[];
  dose_interval_hours?: number;
  is_active: boolean;
}

interface AddMedicineDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMedicine?: Medicine | null;
  onRequestEdit?: (medicineId: string | null) => void;
}

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;
});

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
  const [customTimes, setCustomTimes] = useState(false);
  const [doseInterval, setDoseInterval] = useState<string>("");
  const [customDoseTimes, setCustomDoseTimes] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const isEditing = !!editingMedicine?.id;

  const { data: existingMedicines } = useQuery({
    queryKey: ["medicines", userId],
    queryFn: () => getMedicinesForUserLocal(userId),
  });

  /* ---------- Reset form on open ---------- */
  useEffect(() => {
    if (open) {
      if (editingMedicine) {
        const freq = editingMedicine.frequency;
        setName(editingMedicine.name);
        setFrequency(String(freq));
        setTiming(editingMedicine.timing);
        setDurationDays(String(editingMedicine.duration_days));
        setCustomTimes(!!editingMedicine.custom_dose_times?.length);
        setDoseInterval(String(editingMedicine.dose_interval_hours || ""));

        // Trim or pad customDoseTimes to match frequency
        const doses = editingMedicine.custom_dose_times || [];
        const trimmed = doses.slice(0, freq);
        while (trimmed.length < freq) trimmed.push("");
        setCustomDoseTimes(trimmed);
      } else {
        setName("");
        setFrequency("2");
        setTiming("after_meal");
        setDurationDays("7");
        setCustomTimes(false);
        setDoseInterval("");
        setCustomDoseTimes([]);
      }
      setShowSuggestions(false);
    }
  }, [open, editingMedicine]);

  /* ---------- Medicine name suggestions ---------- */
  const suggestions = useMemo(() => {
    if (!name) return [];
    const s = name.toLowerCase().trim();
    return (medicines as any[])
      .filter((m: any) => {
        const trade = (m.trade_name || "").toLowerCase();
        const company = (m.company || "").toLowerCase();
        return trade.includes(s) || company.includes(s);
      })
      .slice(0, 8);
  }, [name]);

  /* ---------- Save / Update mutation ---------- */
  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const newFreq = parseInt(frequency);

      // Delete old logs if frequency or custom times changed
      if (isEditing) {
        const oldFreq = editingMedicine!.frequency;
        const oldCustom = editingMedicine!.custom_dose_times?.length || 0;
        if (oldFreq !== newFreq || oldCustom !== (customTimes ? newFreq : 0)) {
          await deleteMedicineLogsForMedicine(editingMedicine!.id);
          const todayISO = new Date().toISOString().split("T")[0];
          queryClient.invalidateQueries({ queryKey: ["medicine_logs", userId, todayISO] });
        }
        return await updateMedicineLocal({ ...payload, id: editingMedicine!.id });
      }

      return await createMedicineLocal(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", userId] });
      toast.success(isEditing ? "Medicine updated!" : "Medicine added!");
      onOpenChange(false);
      onRequestEdit?.(null);
    },
    onError: () => toast.error(`Failed to ${isEditing ? "update" : "add"} medicine`),
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

    const freq = parseInt(frequency);

    // ---- Custom dose validation ----
    if (customTimes) {
      const trimmedTimes = customDoseTimes.slice(0, freq);
      setCustomDoseTimes(trimmedTimes);

      const filled = trimmedTimes.filter(Boolean).length;
      if (filled > 0 && filled !== freq) {
        toast.error(`You selected ${filled} times but frequency is ${freq}. Select exactly ${freq} times or clear them.`);
        return;
      }
    }

    if (!customTimes && freq > 3 && !doseInterval) {
      toast.error("Please select an interval");
      return;
    }

    // ---- Duplicate check ----
    const now = new Date();
    const duplicate = existingMedicines?.find((m: any) => {
      if (isEditing && m.id === editingMedicine?.id) return false;
      const end = new Date(m.start_date);
      end.setDate(end.getDate() + (m.duration_days || 0));
      return m.name.toLowerCase() === name.toLowerCase() && end >= now;
    });
    if (duplicate) {
      toast.error(`"${name}" is already active.`);
      return;
    }

    const found = (medicines as any[]).find(
      (m: any) => (m.trade_name || "").toLowerCase() === name.toLowerCase()
    );

    // ---- Build payload ----
    const payload: any = {
      user_id: userId,
      name,
      frequency: freq,
      timing,
      start_date: editingMedicine?.start_date || new Date().toISOString(),
      duration_days: parseInt(durationDays),
      generic_name: found?.generic_with_strength || editingMedicine?.generic_name || "",
      dosage_form: found?.dosage_form || editingMedicine?.dosage_form || "",
    };

    if (customTimes) payload.custom_dose_times = customDoseTimes.slice(0, freq);
    if (!customTimes && freq > 3) payload.dose_interval_hours = parseInt(doseInterval);

    mutation.mutate(payload);
  };

  const freq = parseInt(frequency) || 0;

  const intervalOptions = useMemo(() => {
    if (freq <= 3 || customTimes) return [];
    const windowHours = 15;
    const max = Math.floor(windowHours / freq);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [freq, customTimes]);

  useEffect(() => {
    if (intervalOptions.length && !doseInterval) {
      setDoseInterval(String(intervalOptions[0]));
    } else if (!intervalOptions.length) {
      setDoseInterval("");
    }
  }, [intervalOptions, doseInterval]);

  const getAvailableTimes = (idx: number) => {
    if (!customTimes || idx === 0) return TIME_OPTIONS;
    const prev = customDoseTimes[idx - 1];
    return prev ? TIME_OPTIONS.filter((t) => t > prev) : TIME_OPTIONS;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update medication details" : "Fill in the details"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Medicine name */}
          <div className="space-y-2 relative">
            <Label htmlFor="medicine-name">Medicine Name</Label>
            {isEditing ? (
              <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
                {name}
              </div>
            ) : (
              <Input
                id="medicine-name"
                placeholder="Type trade name..."
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
            {!isEditing && showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                {suggestions.map((med: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectMedicine(med)}
                    className="w-full px-3 py-2 text-left hover:bg-accent flex justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium">{med.trade_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {med.company || med.generic_with_strength}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>How many times per day?</Label>
            <Input
              type="number"
              min="1"
              max="8"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              required
            />
          </div>

          {/* Timing */}
          <div className="space-y-3">
            <Label>When to take?</Label>
            <RadioGroup value={timing} onValueChange={(v: any) => setTiming(v)}>
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

          {/* Custom‑times toggle */}
          {freq > 0 && (
            <div className="flex items-center justify-between">
              <Label htmlFor="custom-times" className="text-sm">
                Set custom dose times?
              </Label>
              <Switch
                id="custom-times"
                checked={customTimes}
                onCheckedChange={(checked) => {
                  setCustomTimes(checked);
                  if (!checked) setCustomDoseTimes([]);
                }}
              />
            </div>
          )}

          {/* Interval dropdown */}
          {!customTimes && freq > 3 && intervalOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Interval between doses</Label>
              <Select value={doseInterval} onValueChange={setDoseInterval}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intervalOptions.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h} hour{h > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom dose times */}
          {customTimes && freq > 0 && (
            <div className="space-y-3">
              <Label>Dose Times</Label>
              {Array.from({ length: freq }, (_, i) => {
                const opts = getAvailableTimes(i);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm w-24">Dose {i + 1}:</span>
                    <Select
                      value={customDoseTimes[i] || ""}
                      onValueChange={(v) => {
                        const copy = [...customDoseTimes];
                        copy[i] = v;
                        setCustomDoseTimes(copy);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {opts.map((t) => (
                          <SelectItem key={t} value={t}>
                            {new Date(`2025-01-01T${t}`).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration (days)</Label>
            <Input
              type="number"
              min="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEditing ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
