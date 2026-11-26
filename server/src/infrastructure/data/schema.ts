import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const appUser = pgTable("app_user", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: text("provider_id").notNull().unique("app_user_provider_id_key"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const advent = pgTable("advent", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  year: smallint("year").notNull(),
  inviteTokenHash: text("invite_token_hash").unique("advent_invite_token_hash_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("advent_name_check", sql`btrim(${table.name}) <> ''`),
  check("advent_year_check", sql`${table.year} BETWEEN 1 AND 9999`),
]);

export const adventMember = pgTable("advent_member", {
  adventId: uuid("advent_id").notNull(),
  userId: uuid("user_id").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ name: "advent_member_pkey", columns: [table.adventId, table.userId] }),
  foreignKey({
    name: "advent_member_advent_id_fkey",
    columns: [table.adventId],
    foreignColumns: [advent.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "advent_member_user_id_fkey",
    columns: [table.userId],
    foreignColumns: [appUser.id],
  }).onDelete("cascade"),
  index("advent_member_user_id_idx").on(table.userId),
]);

export const adventDay = pgTable("advent_day", {
  adventId: uuid("advent_id").notNull(),
  adventDay: smallint("advent_day").notNull(),
  content: text("content").notNull().default(""),
}, (table) => [
  primaryKey({ name: "advent_day_pkey", columns: [table.adventId, table.adventDay] }),
  foreignKey({
    name: "advent_day_advent_id_fkey",
    columns: [table.adventId],
    foreignColumns: [advent.id],
  }).onDelete("cascade"),
  check("advent_day_advent_day_check", sql`${table.adventDay} BETWEEN 1 AND 25`),
]);

export const adventDayOpening = pgTable("advent_day_opening", {
  adventId: uuid("advent_id").notNull(),
  userId: uuid("user_id").notNull(),
  adventDay: smallint("advent_day").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({
    name: "advent_day_opening_pkey",
    columns: [table.adventId, table.userId, table.adventDay],
  }),
  foreignKey({
    name: "advent_day_opening_advent_id_user_id_fkey",
    columns: [table.adventId, table.userId],
    foreignColumns: [adventMember.adventId, adventMember.userId],
  }).onDelete("cascade"),
  foreignKey({
    name: "advent_day_opening_advent_id_advent_day_fkey",
    columns: [table.adventId, table.adventDay],
    foreignColumns: [adventDay.adventId, adventDay.adventDay],
  }).onDelete("cascade"),
  check("advent_day_opening_advent_day_check", sql`${table.adventDay} BETWEEN 1 AND 25`),
  index("advent_day_opening_day_idx").on(table.adventId, table.adventDay),
]);
