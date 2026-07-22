import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  locale: text("locale").notNull().default("en"),
  createdAt: text("created_at").notNull(),
});

export const consentRecords = sqliteTable("consent_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  granted: integer("granted", { mode: "boolean" }).notNull(),
  recordedAt: text("recorded_at").notNull(),
});

export const appStates = sqliteTable("app_states", {
  userId: text("user_id").primaryKey(),
  stateJson: text("state_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sourceDocuments = sqliteTable("source_documents", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  objectKey: text("object_key"),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
});

export const evidenceItems = sqliteTable("evidence_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  claim: text("claim").notNull(),
  sourceName: text("source_name").notNull(),
  sourceReference: text("source_reference").notNull(),
  confidence: text("confidence").notNull(),
  confirmationStatus: text("confirmation_status").notNull(),
  privacyLevel: text("privacy_level").notNull(),
  resumeUse: integer("resume_use", { mode: "boolean" }).notNull(),
  employerUse: integer("employer_use", { mode: "boolean" }).notNull(),
  classification: text("classification").notNull(),
});

export const jobPostings = sqliteTable("job_postings", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  canonicalUrl: text("canonical_url").notNull().unique(),
  requisitionId: text("requisition_id").notNull(),
  company: text("company").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  normalizedJson: text("normalized_json").notNull(),
  postedAt: text("posted_at").notNull(),
});

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  jobId: text("job_id").notNull(),
  status: text("status").notNull(),
  simulated: integer("simulated", { mode: "boolean" }).notNull(),
  applicationJson: text("application_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const feedback = sqliteTable("feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  value: text("value").notNull(),
  createdAt: text("created_at").notNull(),
});

export const providerCredentials = sqliteTable("provider_credentials", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  maskedSuffix: text("masked_suffix").notNull(),
  createdAt: text("created_at").notNull(),
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  targetId: text("target_id"),
  result: text("result").notNull(),
  model: text("model"),
  promptVersion: text("prompt_version"),
  evidenceIdsJson: text("evidence_ids_json").notNull(),
  createdAt: text("created_at").notNull(),
});
