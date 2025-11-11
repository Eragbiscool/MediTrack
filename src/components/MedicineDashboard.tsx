import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LogOut, Pill } from "lucide-react";
import { AddMedicineDialog } from "./AddMedicineDialog";
import { TodaysMedicines } from "./TodaysMedicines";
import { MedicineList } from "./MedicineList";
import { useMedicineScheduler } from "@/hooks/useMedicineScheduler";
import { getMedicinesForUserLocal } from "@/data/db";

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

  // ---- EDIT HANDLER (called from MedicineList) ----
  const handleEdit = (med: Medicine) => {
    setEditingMedicine(med);      // <-- full object
    setShowAddDialog(true);       // open dialog in edit mode
  };

  // ---- CLOSE HANDLER (reset everything) ----
  const handleDialogClose = (open: boolean) => {
    setShowAddDialog(open);
    if (!open) {
      setEditingMedicine(null);   // <-- clear edit state
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto p-4 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <Pill className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Welcome, {userName}
              </h1>
              <p className="text-sm text-muted-foreground">Manage your medications</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} title="Switch User">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Today's Medicines */}
        <TodaysMedicines userId={userId} medicines={medicines || []} />

        {/* All Medicines */}
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
              onEdit={handleEdit}               // <-- pass the handler
            />
          </CardContent>
        </Card>

        {/* Add / Edit Dialog */}
        <AddMedicineDialog
          userId={userId}
          open={showAddDialog}
          onOpenChange={handleDialogClose}
          editingMedicine={editingMedicine}
          // onRequestEdit is **optional** – we don’t need it here
          // (dialog clears edit mode itself on success)
        />
      </div>
    </div>
  );
}