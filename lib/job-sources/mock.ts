import { demoJobs } from "../demo";
import type { ApplicationDraft, JobSearchQuery, JobSourceAdapter, SubmissionResult } from "./types";
import type { JobPosting } from "../types";

export class MockJobSource implements JobSourceAdapter<JobPosting> {
  id = "mock-1";
  label = "Grounded demo jobs";
  live = false;

  async searchJobs(query: JobSearchQuery) {
    return demoJobs.filter((job) => {
      const country = query.countries.length === 0 || query.countries.includes(job.country);
      const role = query.roles.length === 0 || query.roles.some((value) => job.title.toLowerCase().includes(value.toLowerCase().replace(/^senior\s+/, "")));
      return country && role;
    });
  }

  async getJobDetails(id: string) {
    return demoJobs.find((job) => job.id === id) ?? null;
  }

  normalizeJob(raw: JobPosting) {
    return raw;
  }

  async checkApplicationSupport() {
    return "simulated" as const;
  }

  async prepareApplication(_job: JobPosting, draft: ApplicationDraft) {
    return draft;
  }

  async submitApplication(job: JobPosting, draft: ApplicationDraft): Promise<SubmissionResult> {
    if (draft.answers.some((answer) => !answer.confirmed)) {
      return { status: "needs-user", reason: "A required answer needs confirmation" };
    }
    return { status: "submitted", externalId: `SIM-${job.requisitionId}` };
  }

  async checkApplicationStatus(externalId: string): Promise<SubmissionResult> {
    return { status: "submitted", externalId };
  }
}
