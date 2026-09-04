import assert from "node:assert/strict";
import test from "node:test";
import { autoPrepareApplications, getAutoPreparationReadiness } from "../lib/automation";
import { initialAppState } from "../lib/demo";
import {
  assessCareerLevel,
  buildMatchExplanation,
  canSubmitApplication,
  careerAdviceSchema,
  careerChangeAdvice,
  classifyConversationClaim,
  classifySalary,
  classifyVisaLanguage,
  convertCurrency,
  deduplicateJobs,
  detectEvidenceConflicts,
  enforceQuota,
  hasConsent,
  isSafeEmployerUrl,
  learnPreferenceFromFeedback,
  normalizeAnnualSalary,
  parsePreferenceSentence,
  redactSecret,
  redactSensitiveLog,
  removeImportedIndex,
  runScheduledSearch,
  validateResumeClaims,
} from "../lib/domain";
import { classifyConversationFormat, isSupportedCareerFile, previewTextContent } from "../lib/file-parsing";
import { normalizeGreenhouseBoardToken } from "../lib/job-sources/greenhouse";

test("file parsing accepts each promised MVP import extension and previews text safely", () => {
  for (const file of ["resume.pdf", "resume.docx", "notes.txt", "portfolio.md", "deck.pptx", "skills.xlsx", "jobs.csv", "certificate.png", "chat.json", "export.html"]) {
    assert.equal(isSupportedCareerFile(file), true, file);
  }
  assert.equal(previewTextContent("export.html", "<p>Hello <strong>career</strong></p>"), "Hello career");
});

test("conversation classification keeps planned learning out of confirmed skills", () => {
  assert.equal(classifyConversationClaim("I plan to learn Kubernetes next month"), "Planned skill");
  assert.equal(classifyConversationFormat("chat-export.md"), "markdown");
});

test("structured AI evidence extraction rejects unsupported shapes", () => {
  const valid = careerAdviceSchema.parse({ decision: "Apply", interviewChance: "Low", strengths: ["Analytics transfers"], gaps: ["Direct product ownership"], evidenceIds: ["ev-skills"], model: "demo", promptVersion: "v1" });
  assert.equal(valid.gaps.length, 1);
  assert.throws(() => careerAdviceSchema.parse({ decision: "Definitely", interviewChance: 87 }));
});

test("conflict detection preserves two conflicting employment dates", () => {
  const conflicts = detectEvidenceConflicts(initialAppState.evidence);
  assert.equal(conflicts.length, 1);
  assert.deepEqual(conflicts[0].map((item) => item.id).sort(), ["ev-role-current", "ev-role-old"]);
});

test("career-level assessment uses ownership and scope, not years alone", () => {
  const strong = assessCareerLevel({ targetRole: "Product Analyst", relevantYears: 4, ownsProductionWork: true, crossFunctional: true, mentors: true, managesTeam: false, ownsBudgetOrStrategy: false, evidenceQuality: "High" });
  const yearsOnly = assessCareerLevel({ targetRole: "Product Analyst", relevantYears: 10, ownsProductionWork: false, crossFunctional: false, mentors: false, managesTeam: false, ownsBudgetOrStrategy: false, evidenceQuality: "Low" });
  assert.equal(strong.recommendedLevel, "Senior");
  assert.notEqual(yearsOnly.recommendedLevel, "Manager");
});

test("salary normalization handles monthly base pay and annual bonus", () => {
  assert.equal(normalizeAnnualSalary(initialAppState.salaryProfile), 73200);
});

test("salary market classification uses observed quartile boundaries", () => {
  const sample = [6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500];
  assert.equal(classifySalary(5600, sample), "Below Market");
  assert.equal(classifySalary(7800, sample), "Within Market");
  assert.equal(classifySalary(10000, sample), "Above Market");
  assert.equal(classifySalary(7000, [6500, 7000, 7500]), "Limited market data");
});

test("currency conversion requires an explicit positive rate", () => {
  assert.equal(convertCurrency(100, 3.4), 340);
  assert.throws(() => convertCurrency(100, 0));
});

test("career-change recommendations allow low-chance applications without blockers", () => {
  const advice = careerChangeAdvice({ transferableSkills: ["Stakeholder management", "Analytics"], coreSkillsMet: 2, coreSkillsTotal: 6, hardBlocker: false, gaps: ["SQL", "Experimentation", "Case study", "Extra"] });
  assert.equal(advice.decision, "Apply");
  assert.equal(advice.interviewChance, "Low");
  assert.equal(advice.gaps.length, 3);
});

test("visa ambiguity remains eligible", () => {
  assert.equal(classifyVisaLanguage("We are hiring a product analyst in Singapore."), "Sponsorship not mentioned");
});

test("explicit no-sponsorship language creates a hard visa flag", () => {
  assert.equal(classifyVisaLanguage("No visa sponsorship is available for this role."), "Sponsorship clearly unavailable");
  assert.equal(classifyVisaLanguage("Existing work authorization required."), "Existing work authorization required");
});

test("job deduplication uses canonical URL, requisition, and role-location identity", () => {
  const duplicate = { ...initialAppState.jobs[0], id: "duplicate", canonicalUrl: `${initialAppState.jobs[0].canonicalUrl}?ref=feed` };
  assert.equal(deduplicateJobs([...initialAppState.jobs, duplicate]).length, initialAppState.jobs.length);
});

test("real employer handoff accepts only secure public URLs", () => {
  assert.equal(isSafeEmployerUrl("https://jobs.example.com/apply/123"), true);
  assert.equal(isSafeEmployerUrl("http://jobs.example.com/apply/123"), false);
  assert.equal(isSafeEmployerUrl("javascript:alert(1)"), false);
  assert.equal(isSafeEmployerUrl("https://localhost/apply"), false);
  assert.equal(isSafeEmployerUrl("https://127.0.0.1/apply"), false);
  assert.equal(isSafeEmployerUrl("https://192.168.1.10/apply"), false);
});

test("Greenhouse connections accept official board names and URLs only", () => {
  assert.equal(normalizeGreenhouseBoardToken("example-company"), "example-company");
  assert.equal(normalizeGreenhouseBoardToken("https://boards.greenhouse.io/example-company/jobs/123"), "example-company");
  assert.equal(normalizeGreenhouseBoardToken("https://job-boards.greenhouse.io/example-company"), "example-company");
  assert.throws(() => normalizeGreenhouseBoardToken("https://evil.example/example-company"));
});

test("match explanations contain only the requested concise fields and three gaps", () => {
  const explanation = buildMatchExplanation({ ...initialAppState.matches[2], gaps: ["One", "Two", "Three", "Four"] });
  assert.equal(explanation.gaps.length, 3);
  assert.equal(explanation.interviewChance, "Low");
});

test("resume truthfulness blocks unconfirmed and private evidence", () => {
  assert.equal(validateResumeClaims(["ev-impact", "ev-skills"], initialAppState.evidence).truthful, true);
  const unsafe = validateResumeClaims(["ev-kubernetes"], initialAppState.evidence);
  assert.equal(unsafe.truthful, false);
  assert.deepEqual(unsafe.unsupported, ["ev-kubernetes"]);
});

test("resume differences retain source-backed original and tailored text", () => {
  const change = initialAppState.resumeChanges[0];
  assert.notEqual(change.original, change.tailored);
  assert.ok(change.evidenceIds.every((id) => initialAppState.evidence.some((item) => item.id === id)));
});

test("application safety enforces mode, duplicates, limits, permissions, captchas, and pause", () => {
  const safe = canSubmitApplication({ mode: "Automatic Apply", hardRequirementsMet: true, allAnswersConfirmed: true, duplicate: false, dailyCount: 1, dailyLimit: 8, sourcePermits: true, hasAssessmentOrCaptcha: false, paused: false });
  assert.equal(safe.allowed, true);
  const blocked = canSubmitApplication({ mode: "Automatic Apply", hardRequirementsMet: true, allAnswersConfirmed: true, duplicate: true, dailyCount: 8, dailyLimit: 8, sourcePermits: false, hasAssessmentOrCaptcha: true, paused: true });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reasons.length, 5);
});

test("scheduled runs stop while paused and produce a short report when active", () => {
  assert.equal(runScheduledSearch({ enabled: true, paused: true, found: 42, matched: 11, prepared: 6, submitted: 3 }).ran, false);
  const result = runScheduledSearch({ enabled: true, paused: false, found: 42, matched: 11, prepared: 6, submitted: 3 });
  assert.equal(result.ran, true);
  assert.match(result.report ?? "", /42 jobs found/);
});

test("automatic preparation queues live jobs but never submits employer forms", () => {
  const state = structuredClone(initialAppState);
  const liveJob = {
    ...state.jobs[0],
    id: "job-live-safe",
    sourceId: "official-live",
    sourceLabel: "Official employer site",
    sourceKind: "public-career-page" as const,
    canonicalUrl: "https://careers.example.com/jobs/123",
    applicationSupport: "external" as const,
  };
  state.resumeContent = { ...state.resumeContent!, personalized: true };
  state.schedule.paused = false;
  state.jobs = [liveJob];
  state.matches = [{ ...state.matches[0], id: "match-live-safe", jobId: liveJob.id, decision: "Apply" }];
  state.applications = [];
  assert.equal(getAutoPreparationReadiness(state).ready, true);
  const first = autoPrepareApplications(state, "2026-07-23T08:30:00+08:00");
  assert.equal(first.report.prepared, 1);
  assert.equal(first.report.submitted, 0);
  assert.equal(first.state.applications[0].status, "Needs Review");
  assert.equal(first.state.applications[0].submittedByUser, false);
  const duplicateRun = autoPrepareApplications(first.state, "2026-07-24T08:30:00+08:00");
  assert.equal(duplicateRun.report.prepared, 0);
});

test("automatic preparation blocks demo-only, paused, and hard-visa-blocked work", () => {
  const demoReadiness = getAutoPreparationReadiness(initialAppState);
  assert.equal(demoReadiness.ready, false);
  assert.ok(demoReadiness.blockers.includes("Connect a personal resume"));
  assert.ok(demoReadiness.blockers.includes("Connect at least one live employer job"));

  const state = structuredClone(initialAppState);
  const blockedJob = {
    ...state.jobs[0],
    id: "job-live-blocked",
    sourceKind: "public-career-page" as const,
    canonicalUrl: "https://careers.example.com/jobs/blocked",
    applicationSupport: "external" as const,
    visaFit: "Sponsorship clearly unavailable" as const,
  };
  state.resumeContent = { ...state.resumeContent!, personalized: true };
  state.schedule.paused = false;
  state.jobs = [blockedJob];
  state.matches = [{ ...state.matches[0], jobId: blockedJob.id, decision: "Apply" }];
  state.applications = [];
  const result = autoPrepareApplications(state);
  assert.equal(result.report.prepared, 0);
});

test("user consent remains separate and anonymous analytics starts disabled", () => {
  assert.equal(hasConsent(initialAppState.consents, "document-analysis"), true);
  assert.equal(hasConsent(initialAppState.consents, "anonymous-product-analytics"), false);
});

test("data deletion removes only an imported index status", () => {
  const original = initialAppState.conversations[0];
  const deleted = removeImportedIndex(original);
  assert.equal(deleted.status, "deleted");
  assert.equal(original.status, "analyzed");
  assert.equal(deleted.name, original.name);
});

test("BYOK protection masks credentials and redacts accidental log strings", () => {
  assert.equal(redactSecret("sk-example-123456"), "••••••••3456");
  assert.equal(redactSensitiveLog("token=sk-example-123456"), "token=[REDACTED]");
});

test("feedback learning ranks repeated user signals without protected traits", () => {
  assert.deepEqual(learnPreferenceFromFeedback(["Wrong Location", "Wrong Salary", "Wrong Location"]), ["Wrong Location", "Wrong Salary"]);
});

test("billing limits return exact remaining quota", () => {
  assert.deepEqual(enforceQuota(4, 5), { allowed: true, remaining: 1 });
  assert.deepEqual(enforceQuota(5, 5), { allowed: false, remaining: 0 });
});

test("natural-language preferences become reviewable structured rules", () => {
  const parsed = parsePreferenceSentence("Singapore jobs only. I need Employment Pass sponsorship. Minimum SGD 7,000. Exclude gambling companies.");
  assert.deepEqual(parsed, { countries: ["Singapore"], requiresSponsorship: true, minimumSalary: 7000, salaryCurrency: "SGD", excludedIndustries: ["gambling"] });
});
