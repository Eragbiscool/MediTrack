import Dexie from "dexie";
import { v4 as uuidv4 } from "uuid";

export interface User {
  id: string;
  name: string;
  date_of_birth: string;
  created_at: string;
}

export interface Medicine {
  id: string;
  user_id: string;
  name: string; // trade name
  generic_name?: string;
  dosage_form?: string;
  frequency: number;
  timing: string;
  start_date: string; // ISO date
  duration_days: number;
  is_active: boolean;
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
export async function createMedicineLocal(med: Omit<Medicine, "id" | "created_at" | "is_active">) {
  const item: Medicine = {
    id: uuidv4(),
    ...med,
    created_at: new Date().toISOString(),
    is_active: true,
  } as Medicine;
  await db.medicines.add(item);
  return item;
}

export async function getMedicinesForUserLocal(userId: string) {
  return db.medicines.where("user_id").equals(userId).filter((m: Medicine) => m.is_active !== false).toArray();
}

export async function deactivateMedicineLocal(medicineId: string) {
  const m = await db.medicines.get(medicineId);
  if (!m) throw new Error("Medicine not found");
  await db.medicines.update(medicineId, { is_active: false });
  return true;
}

/* Medicine log helpers */
export async function createMedicineLogLocal(log: Omit<MedicineLog, "id" | "created_at">) {
  const item: MedicineLog = {
    id: uuidv4(),
    ...log,
    created_at: new Date().toISOString(),
  };
  await db.medicine_logs.add(item);
  return item;
}

export async function getMedicineLogsForDateLocal(userId: string, dateISO: string) {
  // join: find medicine ids for user, then logs with scheduled_date
  const meds = await getMedicinesForUserLocal(userId);
  const ids = meds.map((m) => m.id);
  return db.medicine_logs.where("scheduled_date").equals(dateISO).filter((l: MedicineLog) => ids.includes(l.medicine_id)).toArray();
}