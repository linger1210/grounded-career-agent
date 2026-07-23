import { isSafeEmployerUrl } from "./domain";
import type { AppState, Application, AuditEvent, JobPosting } from "./types";

function isLiveJob(job: JobPosting) {
  return job.sourceKind !== "mock" && isSafeEmployerUrl(job.canonicalUrl);
}

export function getAutoPreparationReadiness(state: AppState) {
  const liveJobs = state.jobs.filter(isLiveJob);
  const confirmedEvidence = state.evidence.filter((item) => item.confirmationStatus === "confirmed");
  const employerEvidence = confirmedEvidence.filter((item) => item.employerUse);
  const workAuthorizationKnown = Boolean(
    state.workAuthorization.existingAuthorization
      && !/not confirmed/i.test(state.workAuthorization.existingAuthorization)
      && state.workAuthorization.requiresSponsorship !== null,
  );
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!state.resumeContent?.personalized) blockers.push("Connect a personal resume");
  if (state.preferences.applicationMode === "Recommend Only") blockers.push("Change application mode to prepare applications");
  if (!state.schedule.enabled) blockers.push("Enable the daily schedule");
  if (state.schedule.paused) blockers.push("Resume automatic activity");
  if (liveJobs.length === 0) blockers.push("Connect at least one live employer job");

  if (confirmedEvidence.length === 0) warnings.push("Resume evidence still needs your confirmation");
  if (employerEvidence.length === 0) warnings.push("No evidence is approved for employer use");
  if (!workAuthorizationKnown) warnings.push("Work authorization and sponsorship are not confirmed");
  if (state.salaryProfile.amount <= 0) warnings.push("Salary is private and not provided");

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    liveJobCount: liveJobs.length,
    confirmedEvidenceCount: confirmedEvidence.length,
    employerEvidenceCount: employerEvidence.length,
  };
}

export function autoPrepareApplications(state: AppState, runAt = new Date().toISOString()) {
  const readiness = getAutoPreparationReadiness(state);
  const liveJobs = state.jobs.filter(isLiveJob);
  const existingJobIds = new Set(state.applications.map((application) => application.jobId));
  const eligible = liveJobs.filter((job) => {
    if (existingJobIds.has(job.id)) return false;
    const match = state.matches.find((item) => item.jobId === job.id);
    return match?.decision === "Apply"
      && job.visaFit !== "Sponsorship clearly unavailable"
      && job.visaFit !== "Existing work authorization required";
  });
  const preparedJobs = readiness.ready ? eligible.slice(0, state.schedule.dailyLimit) : [];
  const applications: Application[] = preparedJobs.map((job) => {
    const match = state.matches.find((item) => item.jobId === job.id)!;
    return {
      id: `auto-${job.id}`,
      jobId: job.id,
      company: job.company,
      jobTitle: job.title,
      location: job.location,
      source: job.sourceLabel,
      requisitionId: job.requisitionId,
      resumeVersion: match.resumeVersion,
      status: "Needs Review",
      simulated: false,
      jobUrl: job.canonicalUrl,
      submittedByUser: false,
    };
  });
  const audits: AuditEvent[] = preparedJobs.map((job) => ({
    id: `audit-auto-${job.id}-${runAt}`,
    userId: state.user.id,
    action: "application.auto_prepared",
    targetId: `auto-${job.id}`,
    result: "allowed",
    evidenceIds: [],
    createdAt: runAt,
  }));
  const report = {
    discovered: liveJobs.length,
    matched: eligible.length,
    prepared: applications.length,
    submitted: 0,
    blockers: readiness.blockers,
    warnings: readiness.warnings,
  };

  return {
    state: {
      ...state,
      applications: [...state.applications, ...applications],
      schedule: { ...state.schedule, lastRunAt: runAt, lastReport: report },
      auditEvents: [...state.auditEvents, ...audits],
    },
    report,
  };
}
