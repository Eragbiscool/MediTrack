import Dexie from "dexie";
import { v4 as uuidv4 } from "uuid";
import { addDays, isAfter } from "date-fns";


export interface User {
  id: string;
  name: string;
  date_of_birth: string;
  created_at: string;
}

export interface Medicine {
  id: string;
  user_id: string;
  name: string;
  frequency: number;
  timing: "before_meal" | "after_meal" | "anytime";
  start_date: string;
  duration_days: number;
  is_active: boolean;
  custom_dose_times?: string[];     // e.g. ["01:00:00", "13:00:00"]
  dose_interval_hours?: number;     // e.g. 12
  created_at: string;
}

export interface MedicineLog {
  id: string;
  medicine_id: string;
  scheduled_date: string; // ISO date
  scheduled_time: string; // "08:00:00"
  status: "pending" | "taken" | "skipped";
  taken_at?: string | null;
  created_at: string;
}

// Update log status
export async function updateMedicineLogStatusLocal(
  logId: string,
  status: "taken" | "skipped",
  takenAt?: string
) {
  const updates: Partial<MedicineLog> = { status };

  // Always store ISO time properly
  updates.taken_at = takenAt || new Date().toISOString();

  const count = await db.medicine_logs.update(logId, updates);
  if (count === 0) throw new Error("Log not found");
  return true;
}

class AppDB extends Dexie {
  users!: Dexie.Table<User, string>;
  medicines!: Dexie.Table<Medicine, string>;
  medicine_logs!: Dexie.Table<MedicineLog, string>;

  constructor() {
    super("medflow_alarm_db");
    this.version(1).stores({
      users: "id, name, date_of_birth, created_at",
      medicines: "id, user_id, name, start_date, is_active, created_at",
      medicine_logs: "id, medicine_id, scheduled_date, scheduled_time, status, created_at",
    });

    this.users = this.table("users");
    this.medicines = this.table("medicines");
    this.medicine_logs = this.table("medicine_logs");
  }
}

export const db = new AppDB();

/* User helpers */
export async function createUserLocal(payload: { name: string; date_of_birth: string }) {
  const user: User = {
    id: uuidv4(),
    name: payload.name,
    date_of_birth: payload.date_of_birth,
    created_at: new Date().toISOString(),
  };
  await db.users.add(user);
  return user;
}

export async function getUsersLocal() {
  return db.users.orderBy("created_at").reverse().toArray();
}

/* Medicine helpers */
export async function createMedicineLocal(
  med: Omit<Medicine, "id" | "created_at" | "is_active">
) {
  const item: Medicine = {
    id: uuidv4(),
    ...med,
    created_at: new Date().toISOString(),
    is_active: true,
  };
  await db.medicines.add(item);
  return item;
}

/**
 * Update existing medicine
 */
export async function updateMedicineLocal(
  medicine: Partial<Medicine> & { id: string }
) {
  const updated = await db.medicines.update(medicine.id, medicine);
  if (updated === 0) throw new Error("Medicine not found");
  const result = await db.medicines.get(medicine.id);
  if (!result) throw new Error("Failed to retrieve updated medicine");
  return result;
}

/**
 * Get active medicines for user
 */
export async function getMedicinesForUserLocal(userId: string) {
  return db.medicines
    .where("user_id")
    .equals(userId)
    .filter((m) => m.is_active !== false)
    .toArray();
}

/**
 * Deactivate (soft-delete) a medicine
 */
export async function deactivateMedicineLocal(medicineId: string) {
  const count = await db.medicines.update(medicineId, { is_active: false });
  if (count === 0) throw new Error("Medicine not found");
  return true;
}

/* Medicine log helpers */
export async function createMedicineLogLocal(
  log: Omit<MedicineLog, "id" | "created_at">
) {
  const item: MedicineLog = {
    id: uuidv4(),
    ...log,
    created_at: new Date().toISOString(),
  };
  await db.medicine_logs.add(item);
  return item;
}

export async function getMedicineLogsForDateLocal(userId: string, dateISO: string) {
  const meds = await getMedicinesForUserLocal(userId);
  const ids = meds.map((m) => m.id);
  return db.medicine_logs
    .where("scheduled_date")
    .equals(dateISO)
    .filter((l) => ids.includes(l.medicine_id))
    .toArray();
}

/**
 * Remove a user and all associated data from local DB
 * @param userId - the ID of the user to remove
 */
export async function removeUserLocal(userId: string): Promise<void> {
  try {
    // 1️⃣ Delete all medicines of the user
    const userMedicines = await db.medicines.where("user_id").equals(userId).toArray();
    const medicineIds = userMedicines.map((m) => m.id);

    // Delete all logs for each medicine
    await Promise.all(
      medicineIds.map((id) => db.medicine_logs.where("medicine_id").equals(id).delete())
    );

    // Delete medicines
    await db.medicines.where("user_id").equals(userId).delete();

    // 2️⃣ Delete the user itself
    await db.users.where("id").equals(userId).delete();
  } catch (err) {
    console.error("Failed to remove user:", err);
    throw err; // propagate error to caller
  }
}

export async function deleteMedicineLogsForMedicine(medicineId: string) {
  // Using Dexie query to delete all matching logs
  return db.medicine_logs
    .where("medicine_id")
    .equals(medicineId)
    .delete();
}

/**
 * Generate or update medicine logs for a medicine.
 * - Keeps past taken logs untouched
 * - Only creates logs for today and future days
 * - Supports both custom dose times and interval-based dosing
 */
export async function createMedicineLogsForMedicine(medicine: Medicine) {
  const today = new Date();
  const existingLogs: MedicineLog[] = await db.medicine_logs
    .where("medicine_id")
    .equals(medicine.id)
    .toArray();

  // Keep logs that are already taken or from past days
  const logsToKeep = existingLogs.filter(
    (log) => log.status === "taken" || new Date(log.scheduled_date) < today
  );

  const newLogs: MedicineLog[] = [];

  for (let day = 0; day < medicine.duration_days; day++) {
    const scheduledDate = addDays(new Date(medicine.start_date), day);
    if (isAfter(today, scheduledDate)) continue;

    const times: string[] = [];

    if (medicine.custom_dose_times?.length) {
      times.push(...medicine.custom_dose_times);
    } else if (medicine.frequency && medicine.frequency > 0) {
      const interval = medicine.dose_interval_hours || Math.floor(15 / medicine.frequency);
      for (let i = 0; i < medicine.frequency; i++) {
        const hour = i * interval;
        const hh = String(hour).padStart(2, "0");
        times.push(`${hh}:00:00`);
      }
    }

    times.forEach((t) => {
      const exists = logsToKeep.find(
        (l) =>
          l.scheduled_date === scheduledDate.toISOString().split("T")[0] &&
          l.scheduled_time === t
      );
      if (!exists) {
        newLogs.push({
          id: uuidv4(),
          medicine_id: medicine.id,
          scheduled_date: scheduledDate.toISOString().split("T")[0],
          scheduled_time: t,
          status: "pending",
          taken_at: null,
          created_at: new Date().toISOString(),
        });
      }
    });
  }

  // Insert new logs
  for (const log of newLogs) {
    await db.medicine_logs.add(log);
  }

  return [...logsToKeep, ...newLogs];
}
