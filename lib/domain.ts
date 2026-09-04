import { z } from "zod";
import type { CareerLevelAssessment, EvidenceItem, JobMatch, JobPosting, SalaryProfile, Seniority, VisaFit } from "./types";

export const careerAdviceSchema = z.object({
  decision: z.enum(["Apply", "Skip"]),
  interviewChance: z.enum(["High", "Medium", "Low"]),
  strengths: z.array(z.string()).max(3),
  gaps: z.array(z.string()).max(3),
  evidenceIds: z.array(z.string()),
  model: z.string(),
  promptVersion: z.string(),
});

export function classifyConversationClaim(text: string) {
  const normalized = text.toLowerCase();
  if (/\b(plan|planning|want|hope|intend) to (learn|study|build)\b/.test(normalized)) {
    return "Planned skill" as const;
  }
  if (/\b(maybe|might|could be)\b/.test(normalized)) return "Hypothesis" as const;
  return "Unconfirmed claim" as const;
}

export function detectEvidenceConflicts(items: EvidenceItem[]) {
  const groups = new Map<string, EvidenceItem[]>();
  for (const item of items) {
    const key = `${item.category}:${item.claim.replace(/\b(19|20)\d{2}\b/g, "YEAR").toLowerCase()}`;
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }
  return [...groups.values()].filter((group) => {
    if (group.length < 2) return false;
    const years = new Set(group.flatMap((item) => item.claim.match(/\b(19|20)\d{2}\b/g) ?? []));
    return years.size > 1;
  });
}

export function normalizeAnnualSalary(profile: SalaryProfile) {
  const base = profile.period === "monthly" ? profile.amount * 12 : profile.amount;
  return profile.compensationType === "total" ? base : base + (profile.annualBonus ?? 0);
}

export function convertCurrency(amount: number, rate: number) {
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("A positive exchange rate is required");
  return Math.round(amount * rate * 100) / 100;
}

export function classifySalary(current: number, observations: number[]) {
  if (observations.length < 4) return "Limited market data" as const;
  const sorted = [...observations].sort((a, b) => a - b);
  const pick = (p: number) => sorted[Math.floor((sorted.length - 1) * p)];
  const p25 = pick(0.25);
  const p75 = pick(0.75);
  if (current < p25) return "Below Market" as const;
  if (current > p75) return "Above Market" as const;
  return "Within Market" as const;
}

export function classifyVisaLanguage(description: string): VisaFit {
  const value = description.toLowerCase();
  if (/no (visa )?sponsorship|cannot sponsor|sponsorship (is )?not available/.test(value)) {
    return "Sponsorship clearly unavailable";
  }
  if (/must (already )?have unrestricted|existing work authorization required/.test(value)) {
    return "Existing work authorization required";
  }
  if (/visa sponsorship (is )?available|we sponsor/.test(value)) {
    return "Sponsorship clearly available";
  }
  if (/may sponsor|sponsorship considered/.test(value)) return "Sponsorship may be available";
  return "Sponsorship not mentioned";
}

export function jobFingerprint(job: Pick<JobPosting, "company" | "title" | "location" | "requisitionId" | "canonicalUrl" | "description">) {
  const canonical = job.canonicalUrl.trim().toLowerCase().replace(/\?.*$/, "");
  const description = job.description.toLowerCase().replace(/\s+/g, " ").slice(0, 160);
  return [canonical, job.company, job.title, job.location, job.requisitionId, description]
    .join("|")
    .toLowerCase();
}

export function deduplicateJobs<T extends JobPosting>(jobs: T[]) {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const strongKeys = [
      job.canonicalUrl.trim().toLowerCase().replace(/\?.*$/, ""),
      `${job.company}|${job.requisitionId}`.toLowerCase(),
      `${job.company}|${job.title}|${job.location}`.toLowerCase(),
    ];
    if (strongKeys.some((key) => seen.has(key))) return false;
    strongKeys.forEach((key) => seen.add(key));
    return true;
  });
}

export function isSafeEmployerUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "::1" || hostname.endsWith(".local")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(hostname)) return false;
    const private172 = hostname.match(/^172\.(\d{1,3})\./);
    if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return false;
    return hostname.includes(".");
  } catch {
    return false;
  }
}

export function canSubmitApplication(input: {
  mode: "Recommend Only" | "Review Before Applying" | "Automatic Apply";
  hardRequirementsMet: boolean;
  allAnswersConfirmed: boolean;
  duplicate: boolean;
  dailyCount: number;
  dailyLimit: number;
  sourcePermits: boolean;
  hasAssessmentOrCaptcha: boolean;
  paused: boolean;
}) {
  const reasons: string[] = [];
  if (input.mode === "Recommend Only") reasons.push("Mode is recommendation only");
  if (!input.hardRequirementsMet) reasons.push("A confirmed hard requirement is not met");
  if (!input.allAnswersConfirmed) reasons.push("One or more required answers need confirmation");
  if (input.duplicate) reasons.push("This job was already submitted");
  if (input.dailyCount >= input.dailyLimit) reasons.push("Daily application limit reached");
  if (!input.sourcePermits) reasons.push("The source does not permit automated submission");
  if (input.hasAssessmentOrCaptcha) reasons.push("A captcha or assessment requires the user");
  if (input.paused) reasons.push("Automation is paused");
  return { allowed: reasons.length === 0, reasons };
}

export function validateResumeClaims(claimEvidenceIds: string[], evidence: EvidenceItem[]) {
  const allowedIds = new Set(
    evidence
      .filter((item) => item.confirmationStatus === "confirmed" && item.resumeUse)
      .map((item) => item.id),
  );
  const unsupported = claimEvidenceIds.filter((id) => !allowedIds.has(id));
  return { truthful: unsupported.length === 0, unsupported };
}

export function parsePreferenceSentence(sentence: string) {
  const result: {
    countries: string[];
    requiresSponsorship: boolean;
    minimumSalary?: number;
    salaryCurrency?: string;
    excludedIndustries: string[];
  } = { countries: [], requiresSponsorship: false, excludedIndustries: [] };
  if (/singapore/i.test(sentence)) result.countries.push("Singapore");
  if (/sponsor|employment pass|\bep\b/i.test(sentence)) result.requiresSponsorship = true;
  const salary = sentence.match(/\b(SGD|USD|MYR|EUR|GBP)\s*([\d,]+)/i);
  if (salary) {
    result.salaryCurrency = salary[1].toUpperCase();
    result.minimumSalary = Number(salary[2].replace(/,/g, ""));
  }
  const exclude = sentence.match(/exclude\s+([^.,]+)/i);
  if (exclude) result.excludedIndustries.push(exclude[1].trim().replace(/ companies?$/i, ""));
  return result;
}

export function learnPreferenceFromFeedback(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
}

export function enforceQuota(used: number, limit: number) {
  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

export function redactSecret(secret: string) {
  return secret.length < 4 ? "••••" : `••••••••${secret.slice(-4)}`;
}

export function redactSensitiveLog(value: string) {
  return value.replace(/(?:sk-|key-)[A-Za-z0-9_-]{8,}/g, "[REDACTED]");
}

export function removeImportedIndex<T extends { status: string }>(item: T): T {
  return { ...item, status: "deleted" };
}

export function assessCareerLevel(input: {
  targetRole: string;
  relevantYears: number;
  ownsProductionWork: boolean;
  crossFunctional: boolean;
  mentors: boolean;
  managesTeam: boolean;
  ownsBudgetOrStrategy: boolean;
  evidenceQuality: "Low" | "Medium" | "High";
}): CareerLevelAssessment {
  let score = Math.min(3, input.relevantYears / 2);
  if (input.ownsProductionWork) score += 1;
  if (input.crossFunctional) score += 1;
  if (input.mentors) score += 1;
  if (input.managesTeam) score += 1.5;
  if (input.ownsBudgetOrStrategy) score += 1.5;
  const recommendedLevel: Seniority = score >= 8 ? "Manager" : score >= 6 ? "Lead" : score >= 4 ? "Senior" : score >= 2 ? "Mid-level" : "Junior";
  const strengths = [input.ownsProductionWork && "Production ownership", input.crossFunctional && "Cross-functional delivery", input.mentors && "Mentoring evidence"].filter(Boolean).slice(0, 3) as string[];
  const gaps = [!input.managesTeam && "No confirmed people-management scope", !input.ownsBudgetOrStrategy && "No confirmed budget or strategy ownership"].filter(Boolean).slice(0, 3) as string[];
  return { id: "generated-level", targetRole: input.targetRole, recommendedLevel, currentLevel: recommendedLevel, experiencePosition: score >= 7 ? "Above typical range" : score >= 4 ? "Within typical range" : "Below typical range", strengths, gaps, confidence: input.evidenceQuality, evidenceIds: [] };
}

export function careerChangeAdvice(input: { transferableSkills: string[]; coreSkillsMet: number; coreSkillsTotal: number; hardBlocker: boolean; gaps: string[] }) {
  const ratio = input.coreSkillsTotal === 0 ? 0 : input.coreSkillsMet / input.coreSkillsTotal;
  return {
    decision: input.hardBlocker ? "Skip" as const : "Apply" as const,
    interviewChance: input.hardBlocker || ratio < 0.4 ? "Low" as const : ratio < 0.7 ? "Medium" as const : "High" as const,
    transferableStrengths: input.transferableSkills.slice(0, 3),
    gaps: input.gaps.slice(0, 3),
  };
}

export function buildMatchExplanation(match: JobMatch) {
  return {
    decision: match.decision,
    interviewChance: match.interviewChance,
    seniorityFit: match.seniorityFit,
    salaryFit: match.salaryFit,
    visaFit: match.visaFit,
    gaps: match.gaps.slice(0, 3),
  };
}

export function runScheduledSearch(input: { enabled: boolean; paused: boolean; found: number; matched: number; prepared: number; submitted: number }) {
  if (!input.enabled || input.paused) return { ran: false, report: null };
  return { ran: true, report: `${input.found} jobs found\n${input.matched} matched\n${input.prepared} applications prepared\n${input.submitted} submitted` };
}

export function hasConsent(records: Array<{ type: string; granted: boolean }>, type: string) {
  return records.some((record) => record.type === type && record.granted);
}
