import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing the Manus OAuth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * SeatRoom-specific role and event assignment. The platform identity remains
 * owned by Manus OAuth; this table stores only SeatRoom permissions.
 */
export const seatroomProfiles = mysqlTable("seatroom_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  seatRoomRole: mysqlEnum("seatRoomRole", ["organizer", "agent"]).notNull().default("organizer"),
  eventId: varchar("eventId", { length: 128 }),
  displayName: varchar("displayName", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userEventRoleUnique: uniqueIndex("seatroom_profiles_user_event_role_unique").on(table.userId, table.eventId, table.seatRoomRole),
}));

export type SeatroomProfile = typeof seatroomProfiles.$inferSelect;
export type InsertSeatroomProfile = typeof seatroomProfiles.$inferInsert;

/**
 * Guest list for the event.
 */
export const guests = mysqlTable("guests", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 128 }).notNull().default("event-grand-bal"),
  uuid: varchar("uuid", { length: 64 }).notNull().unique(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  table: varchar("table", { length: 64 }),
  status: mysqlEnum("status", ["pending", "present", "flagged"]).notNull().default("pending"),
  checkInTime: timestamp("checkInTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Guest = typeof guests.$inferSelect;
export type InsertGuest = typeof guests.$inferInsert;

/**
 * Invitations for agents to join the event team.
 */
export const agentInvitations = mysqlTable("agent_invitations", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 128 }).notNull().default("event-grand-bal"),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["organizer", "agent"]).notNull().default("agent"),
  status: mysqlEnum("status", ["pending", "accepted", "expired"]).notNull().default("pending"),
  invitedBy: int("invitedBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  emailEventUnique: uniqueIndex("agent_invitations_email_event_unique").on(table.email, table.eventId),
}));

export type AgentInvitation = typeof agentInvitations.$inferSelect;
export type InsertAgentInvitation = typeof agentInvitations.$inferInsert;
