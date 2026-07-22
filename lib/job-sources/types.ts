import type { JobPosting } from "../types";

export interface JobSearchQuery {
  roles: string[];
  countries: string[];
  remotePolicies?: string[];
  postedAfter?: string;
}

export interface ApplicationDraft {
  jobId: string;
  resumeVersionId: string;
  answers: Array<{ question: string; answer?: string; confirmed: boolean }>;
}

export interface SubmissionResult {
  status: "submitted" | "needs-user" | "unsupported" | "failed";
  externalId?: string;
  reason?: string;
}

export interface JobSourceAdapter<RawJob = unknown> {
  id: string;
  label: string;
  live: boolean;
  searchJobs(query: JobSearchQuery): Promise<RawJob[]>;
  getJobDetails(id: string): Promise<RawJob | null>;
  normalizeJob(raw: RawJob): JobPosting;
  checkApplicationSupport(job: JobPosting): Promise<JobPosting["applicationSupport"]>;
  prepareApplication(job: JobPosting, draft: ApplicationDraft): Promise<ApplicationDraft>;
  submitApplication(job: JobPosting, draft: ApplicationDraft): Promise<SubmissionResult>;
  checkApplicationStatus(externalId: string): Promise<SubmissionResult>;
}
