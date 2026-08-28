import { and, count, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  agentInvitations,
  guests,
  InsertAgentInvitation,
  InsertGuest,
  InsertSeatroomProfile,
  InsertUser,
  seatroomProfiles,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      const normalized = user[field] ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSeatroomProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(seatroomProfiles).where(eq(seatroomProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertSeatroomProfile(input: InsertSeatroomProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profiles = await db.select().from(seatroomProfiles).where(eq(seatroomProfiles.userId, input.userId));
  const existing = profiles.find((p) => p.seatRoomRole === input.seatRoomRole);
  if (existing) {
    await db.update(seatroomProfiles).set({ eventId: input.eventId ?? null, displayName: input.displayName ?? null, updatedAt: new Date() }).where(eq(seatroomProfiles.id, existing.id));
    return { ...existing, eventId: input.eventId ?? null, displayName: input.displayName ?? null };
  }
  const inserted = await db.insert(seatroomProfiles).values(input);
  const created = await db.select().from(seatroomProfiles).where(eq(seatroomProfiles.id, Number(inserted[0].insertId))).limit(1);
  return created[0];
}

export async function getEventStats(eventId: string) {
  const db = await getDb();
  if (!db) return { total: 0, present: 0, flagged: 0 };
  const stats = await db.select({
    status: guests.status,
    count: count(),
  }).from(guests).where(eq(guests.eventId, eventId)).groupBy(guests.status);
  
  const result = { total: 0, present: 0, flagged: 0 };
  for (const s of stats) {
    if (s.status === "present") result.present = s.count;
    if (s.status === "flagged") result.flagged = s.count;
    result.total += s.count;
  }
  return result;
}

export async function getGuests(eventId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(guests).where(eq(guests.eventId, eventId)).orderBy(sql`${guests.checkInTime} DESC`);
}

export async function checkInGuest(uuid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const guest = await db.select().from(guests).where(eq(guests.uuid, uuid)).limit(1);
  if (!guest[0]) return { status: "invalid" as const };
  if (guest[0].status === "present") return { status: "duplicate" as const, guest: guest[0] };
  
  await db.update(guests).set({ status: "present", checkInTime: new Date(), updatedAt: new Date() }).where(eq(guests.id, guest[0].id));
  return { status: "success" as const, guest: { ...guest[0], status: "present" as const, checkInTime: new Date() } };
}

export async function createInvitation(input: InsertAgentInvitation) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(agentInvitations).values(input).onDuplicateKeyUpdate({ set: { status: "pending", createdAt: new Date() } });
  return { success: true };
}

export async function getInvitationByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(agentInvitations).where(and(eq(agentInvitations.email, email), eq(agentInvitations.status, "pending"))).limit(1);
  return result[0] ?? null;
}

export async function claimInvitation(userId: number, email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const invitation = await getInvitationByEmail(email);
  if (!invitation) return null;
  
  await db.update(agentInvitations).set({ status: "accepted" }).where(eq(agentInvitations.id, invitation.id));
  return upsertSeatroomProfile({
    userId,
    seatRoomRole: invitation.role,
    eventId: invitation.eventId,
    displayName: null,
  });
}
