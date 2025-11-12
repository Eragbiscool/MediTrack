import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LogOut, Pill } from "lucide-react";
import { AddMedicineDialog } from "./AddMedicineDialog";
import { TodaysMedicines } from "./TodaysMedicines";
import { MedicineList } from "./MedicineList";
import { useMedicineScheduler } from "@/hooks/useMedicineScheduler";
import {
  getMedicinesForUserLocal,
  deleteMedicineLogsForMedicine,
  removeUserLocal,
} from "@/data/db";

interface MedicineDashboardProps {
  userId: string;
  userName: string;
  onLogout: () => void;
}

export function MedicineDashboard({ userId, userName, onLogout }: MedicineDashboardProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  const { data: medicines } = useQuery({
    queryKey: ["medicines", userId],
    queryFn: async () => await getMedicinesForUserLocal(userId),
  });

  useMedicineScheduler(userId, medicines || []);

  // ---- EDIT HANDLER ----
  const handleEdit = (med: Medicine) => {
    setEditingMedicine(med);
    setShowAddDialog(true);
  };

  // ---- DIALOG CLOSE HANDLER ----
  const handleDialogClose = (open: boolean) => {
    setShowAddDialog(open);
    if (!open) {
      setEditingMedicine(null);
    }
  };

  // ---- REMOVE ACCOUNT HANDLER ----
  const handleRemoveAccount = async () => {
    const confirmed = window.confirm(
      "You won't get the data back! Are you sure you want to remove your account?"
    );
    if (!confirmed) return;

    try {
      if (medicines) {
        for (const med of medicines) {
          await deleteMedicineLogsForMedicine(med.id);
        }
      }
      await removeUserLocal(userId);
      alert("Account removed successfully!");
      onLogout();
    } catch (err) {
      console.error(err);
      alert("Failed to remove account");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto p-4 max-w-6xl">

        {/* ===== HEADER ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 pt-4 gap-4 sm:gap-0">
          {/* Left: Welcome */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
              <Pill className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Welcome, {userName}
              </h1>
              <p className="text-sm text-muted-foreground">Manage your medications effortlessly</p>
            </div>
          </div>

          {/* Right: Account Actions */}
          <div className="flex gap-2 mt-2 sm:mt-0 flex-wrap sm:flex-nowrap">
            <Button variant="destructive" size="sm" onClick={handleRemoveAccount}>
              Remove Account
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout} title="Switch User">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* ===== TODAY'S MEDICINES ===== */}
        <TodaysMedicines userId={userId} medicines={medicines || []} />

        {/* ===== ALL MEDICINES ===== */}
        <Card className="shadow-[var(--shadow-card)] mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Medicines</CardTitle>
                <CardDescription>Manage all your medications</CardDescription>
              </div>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Medicine
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <MedicineList
              userId={userId}
              medicines={medicines || []}
              onEdit={handleEdit}
            />
          </CardContent>
        </Card>

        {/* ===== ADD / EDIT MEDICINE DIALOG ===== */}
        <AddMedicineDialog
          userId={userId}
          open={showAddDialog}
          onOpenChange={handleDialogClose}
          editingMedicine={editingMedicine}
        />
      </div>
    </div>
  );
}
