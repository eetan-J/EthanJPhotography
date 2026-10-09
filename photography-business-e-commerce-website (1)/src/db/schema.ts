import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export type SizeOption = { label: string; price: number };

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  location: text("location").notNull().default(""),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url").notNull(),
  price: integer("price").notNull(),
  images: jsonb("images").$type<string[]>(),
  sizeOptions: jsonb("size_options").$type<SizeOption[]>(),
  finishOptions: jsonb("finish_options").$type<string[]>(),
  details: jsonb("details").$type<string[]>(),
  shippingClass: text("shipping_class").notNull().default("standard"),
  shippingExcludes: jsonb("shipping_excludes").$type<string[]>(),
  inventory: integer("inventory"),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().default(""),
  customerName: text("customer_name").notNull().default(""),
  items: jsonb("items").$type<{ productId: string; name: string; size: string; option: string; quantity: number; price: number; imageUrl: string }[]>().notNull(),
  total: integer("total").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  fulfillmentStatus: text("fulfillment_status").notNull().default("unfulfilled"),
  shippingAddress: text("shipping_address").notNull().default(""),
  trackingNumber: text("tracking_number").notNull().default(""),
  notes: text("notes").notNull().default(""),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatThreads = pgTable("chat_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  topic: text("topic").notNull().default("General"),
  lastReadAt: timestamp("last_read_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("thread_id").notNull().references(() => chatThreads.id, { onDelete: "cascade" }),
  sender: text("sender").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subscribers = pgTable("subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type ChatThread = typeof chatThreads.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;