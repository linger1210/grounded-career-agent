export type Confidence = "Low" | "Medium" | "High";
export type ConfirmationStatus = "confirmed" | "unconfirmed" | "conflict";
export type PrivacyLevel = "private" | "profile" | "employer-approved";
export type EvidenceClassification =
  | "Confirmed fact"
  | "Unconfirmed claim"
  | "Career goal"
  | "Planned skill"
  | "AI suggestion"
  | "Hypothesis"
  | "Outdated information"
  | "Conflict requiring confirmation";
export type Seniority =
  | "Internship"
  | "Junior"
  | "Mid-level"
  | "Senior"
  | "Lead"
  | "Manager"
  | "Head or Director";
export type InterviewChance = "High" | "Medium" | "Low";
export type VisaFit =
  | "Sponsorship clearly available"
  | "Sponsorship may be available"
  | "Sponsorship not mentioned"
  | "Sponsorship clearly unavailable"
  | "Existing work authorization required";
export type ApplicationMode =
  | "Recommend Only"
  | "Review Before Applying"
  | "Automatic Apply";
export type ApplicationStatus =
  | "Discovered"
  | "Recommended"
  | "Skipped"
  | "Preparing"
  | "Needs Review"
  | "Approved"
  | "Submitted"
  | "Failed"
  | "Waiting"
  | "Interview"
  | "Rejected"
  | "Offer"
  | "Withdrawn";

export interface User {
  id: string;
  email: string;
  displayName: string;
  locale: "en";
  createdAt: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  type: "personal-analytics" | "anonymous-product-analytics" | "document-analysis";
  granted: boolean;
  recordedAt: string;
}

export interface CareerPreference {
  userId: string;
  countries: string[];
  targetRoles: string[];
  openToCareerChange: boolean;
  requiresSponsorship: boolean;
  workModes: Array<"Remote" | "Hybrid" | "On-site">;
  applicationMode: ApplicationMode;
  salaryPriority: "Get Hired Faster" | "Balanced" | "Maximize Salary";
  naturalLanguageRule?: string;
  excludedCompanies: string[];
  excludedIndustries: string[];
}

export interface PersonalDataProfile {
  userId: string;
  ageRange?: "18–24" | "25–34" | "35–44" | "45–54" | "55+";
  nationality?: string;
  currentCountry?: string;
  currentOccupation?: string;
  yearsExperience?: number;
}

export interface SalaryProfile {
  userId: string;
  amount: number;
  currency: string;
  period: "monthly" | "annual";
  compensationType: "base" | "total";
  annualBonus?: number;
  reduction: "No reduction" | "Up to 5%" | "Up to 10%" | "Up to 15%" | "Up to 20%" | "Negotiable — prioritize getting hired";
}

export interface WorkAuthorization {
  userId: string;
  nationality?: string;
  currentCountry?: string;
  existingAuthorization?: string;
  requiresSponsorship: boolean;
  acceptableVisaTypes: string[];
  willingToRelocate: boolean;
  noticePeriod?: string;
  earliestStartDate?: string;
}

export interface SourceDocument {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  status: "preview" | "authorized" | "analyzed" | "deleted";
  sourceKind: "resume" | "career-folder" | "portfolio" | "certificate" | "other";
  uploadedAt: string;
}

export interface SourceConversation {
  id: string;
  userId: string;
  name: string;
  format: "json" | "html" | "markdown" | "txt";
  status: "preview" | "authorized" | "analyzed" | "deleted";
  importedAt: string;
}

export interface EvidenceItem {
  id: string;
  category: string;
  claim: string;
  source: string;
  reference: string;
  confidence: Confidence;
  confirmationStatus: ConfirmationStatus;
  privacyLevel: PrivacyLevel;
  resumeUse: boolean;
  employerUse: boolean;
  classification: EvidenceClassification;
}

export interface CareerProfile {
  userId: string;
  headline: string;
  summary: string;
  employmentHistory: EvidenceItem[];
  education: EvidenceItem[];
  projects: EvidenceItem[];
  skills: EvidenceItem[];
  transferableSkills: string[];
  careerInterests: string[];
  completeness: number;
}

export interface CareerLevelAssessment {
  id: string;
  targetRole: string;
  recommendedLevel: Seniority;
  currentLevel: Seniority;
  experiencePosition: "Below typical range" | "Within typical range" | "Above typical range";
  strengths: string[];
  gaps: string[];
  confidence: Confidence;
  evidenceIds: string[];
}

export interface SalaryAssessment {
  id: string;
  role: string;
  country: string;
  city?: string;
  marketPosition: "Below Market" | "Within Market" | "Above Market" | "Limited market data";
  marketLow: number;
  marketHigh: number;
  recommendedLow: number;
  recommendedHigh: number;
  suggestedMinimum: number;
  currency: string;
  period: "monthly" | "annual";
  differencePercent?: number;
  confidence: Confidence;
  dataDate: string;
  sourceCategory: string;
  demonstrationData: boolean;
}

export interface JobSource {
  id: string;
  name: string;
  kind: "mock" | "public-career-page" | "official-public-api";
  live: boolean;
  termsNote: string;
}

export interface JobPosting {
  id: string;
  sourceId: string;
  sourceLabel: string;
  sourceKind: JobSource["kind"];
  company: string;
  title: string;
  location: string;
  country: string;
  remotePolicy: "Remote" | "Hybrid" | "On-site";
  salaryLow?: number;
  salaryHigh?: number;
  salaryCurrency?: string;
  salaryPeriod?: "monthly" | "annual";
  visaFit: VisaFit;
  seniority: Seniority;
  skills: string[];
  gaps: string[];
  requisitionId: string;
  canonicalUrl: string;
  description: string;
  postedAt: string;
  employmentType: string;
  industry: string;
  applicationSupport: "assisted" | "simulated" | "external";
}

export interface JobMatch {
  id: string;
  jobId: string;
  decision: "Apply" | "Skip";
  interviewChance: InterviewChance;
  resumeVersion: string;
  seniorityFit: string;
  salaryFit: string;
  visaFit: VisaFit;
  gaps: string[];
  evidenceQuality: Confidence;
  reasons: string[];
}

export interface Resume {
  id: string;
  userId: string;
  name: string;
  kind: "master" | "country" | "role" | "job";
  currentVersionId: string;
}

export interface ResumeVersion {
  id: string;
  resumeId: string;
  label: string;
  targetCountry?: string;
  targetRole?: string;
  targetJobId?: string;
  createdAt: string;
  evidenceIds: string[];
}

export interface ResumeChange {
  id: string;
  resumeVersionId: string;
  original: string;
  tailored: string;
  reason: string;
  evidenceIds: string[];
  status: "pending" | "accepted" | "rejected" | "not-true";
}

export interface InterviewDefenseCard {
  id: string;
  resumeVersionId: string;
  statement: string;
  situation: string;
  responsibility: string;
  actions: string;
  tools: string;
  result: string;
  likelyQuestion: string;
  evidenceSource: string;
  userCanExplain: boolean;
}

export interface Application {
  id: string;
  jobId: string;
  company: string;
  jobTitle: string;
  location: string;
  source: string;
  requisitionId: string;
  resumeVersion: string;
  status: ApplicationStatus;
  applicationDate?: string;
  followUpDate?: string;
  failureReason?: string;
  simulated: boolean;
  jobUrl?: string;
  submittedByUser?: boolean;
}

export interface ApplicationAnswer {
  id: string;
  applicationId: string;
  question: string;
  answer?: string;
  sourceEvidenceIds: string[];
  confirmed: boolean;
}

export interface ScheduledRun {
  id: string;
  userId: string;
  enabled: boolean;
  paused: boolean;
  time: string;
  timeZone: string;
  dailyLimit: number;
  lowChanceLimit: number;
  lastRunAt?: string;
  retryRule: string;
}

export interface UserFeedback {
  id: string;
  userId: string;
  targetType: "job" | "advice" | "resume";
  targetId: string;
  value: string;
  createdAt: string;
}

export interface Outcome {
  id: string;
  applicationId: string;
  value: "No response" | "Recruiter response" | "Screening call" | "Interview" | "Rejection" | "Offer" | "Accepted offer" | "Declined offer";
  recordedAt: string;
}

export interface Subscription {
  userId: string;
  plan: "Free" | "Plus";
  interval?: "monthly" | "annual";
  quotas: { recommendations: number; resumes: number; applications: number };
  usage: { recommendations: number; resumes: number; applications: number };
}

export interface AIProviderCredential {
  id: string;
  userId: string;
  provider: string;
  encryptedValue: string;
  maskedSuffix: string;
  spendingLimit?: number;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  userId: string;
  action: string;
  targetId?: string;
  result: "allowed" | "blocked" | "failed";
  model?: string;
  promptVersion?: string;
  evidenceIds: string[];
  createdAt: string;
}

export interface AppState {
  user: User;
  onboardingComplete: boolean;
  consents: ConsentRecord[];
  preferences: CareerPreference;
  personalData: PersonalDataProfile;
  salaryProfile: SalaryProfile;
  workAuthorization: WorkAuthorization;
  documents: SourceDocument[];
  conversations: SourceConversation[];
  evidence: EvidenceItem[];
  careerProfile: CareerProfile;
  careerAssessments: CareerLevelAssessment[];
  salaryAssessments: SalaryAssessment[];
  jobs: JobPosting[];
  matches: JobMatch[];
  applications: Application[];
  resume: Resume;
  resumeVersions: ResumeVersion[];
  resumeChanges: ResumeChange[];
  defenseCards: InterviewDefenseCard[];
  schedule: ScheduledRun;
  feedback: UserFeedback[];
  subscription: Subscription;
  auditEvents: AuditEvent[];
}
