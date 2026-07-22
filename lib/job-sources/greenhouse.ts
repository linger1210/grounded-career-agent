import type { JobPosting } from "../types";
import { classifyVisaLanguage } from "../domain";
import type { ApplicationDraft, JobSearchQuery, JobSourceAdapter, SubmissionResult } from "./types";

type GreenhouseJob = {
  id: number;
  title: string;
  location: { name: string };
  absolute_url: string;
  updated_at: string;
  content?: string;
  departments?: Array<{ name: string }>;
  offices?: Array<{ name: string }>;
};

export class GreenhousePublicBoardAdapter implements JobSourceAdapter<GreenhouseJob> {
  id: string;
  label: string;
  live = true;

  constructor(private boardToken: string, private companyName: string) {
    this.id = `greenhouse-${boardToken}`;
    this.label = `${companyName} public careers board`;
  }

  async searchJobs(query: JobSearchQuery) {
    const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(this.boardToken)}/jobs?content=true`);
    if (!response.ok) throw new Error(`Greenhouse board returned ${response.status}`);
    const data = (await response.json()) as { jobs: GreenhouseJob[] };
    return data.jobs.filter((job) => {
      const text = `${job.title} ${job.location.name}`.toLowerCase();
      const role = query.roles.length === 0 || query.roles.some((value) => text.includes(value.toLowerCase()));
      const country = query.countries.length === 0 || query.countries.some((value) => text.includes(value.toLowerCase()));
      return role && country;
    });
  }

  async getJobDetails(id: string) {
    const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(this.boardToken)}/jobs/${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Greenhouse job returned ${response.status}`);
    return (await response.json()) as GreenhouseJob;
  }

  normalizeJob(raw: GreenhouseJob): JobPosting {
    const plainDescription = (raw.content ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    return {
      id: `greenhouse-${raw.id}`,
      sourceId: this.id,
      sourceLabel: this.label,
      sourceKind: "official-public-api",
      company: this.companyName,
      title: raw.title,
      location: raw.location.name,
      country: raw.location.name.split(",").at(-1)?.trim() ?? raw.location.name,
      remotePolicy: /remote/i.test(raw.location.name) ? "Remote" : "On-site",
      visaFit: classifyVisaLanguage(plainDescription),
      seniority: /lead/i.test(raw.title) ? "Lead" : /senior|staff|principal/i.test(raw.title) ? "Senior" : "Mid-level",
      skills: [],
      gaps: [],
      requisitionId: String(raw.id),
      canonicalUrl: raw.absolute_url,
      description: plainDescription,
      postedAt: raw.updated_at,
      employmentType: "Full-time",
      industry: raw.departments?.[0]?.name ?? "Not specified",
      applicationSupport: "external",
    };
  }

  async checkApplicationSupport() {
    return "external" as const;
  }

  async prepareApplication(_job: JobPosting, draft: ApplicationDraft) {
    return draft;
  }

  async submitApplication(): Promise<SubmissionResult> {
    return { status: "unsupported", reason: "This adapter discovers public jobs only. The applicant completes submission on the employer's career page." };
  }

  async checkApplicationStatus(): Promise<SubmissionResult> {
    return { status: "unsupported", reason: "The public job board API does not expose applicant status." };
  }
}
