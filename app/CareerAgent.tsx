"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderOpen,
  Gauge,
  Globe2,
  Home,
  Info,
  KeyRound,
  Laptop2,
  Link2,
  LockKeyhole,
  MessageSquareText,
  Pause,
  Play,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAutoPreparationReadiness } from "../lib/automation";
import { initialAppState } from "../lib/demo";
import { deduplicateJobs, isSafeEmployerUrl, parsePreferenceSentence } from "../lib/domain";
import type {
  AppState,
  ApplicationMode,
  ApplicationStatus,
  JobMatch,
  JobPosting,
  ResumeContent,
  ResumeChange,
  SourceDocument,
} from "../lib/types";

type View = "home" | "jobs" | "applications" | "resume" | "profile" | "admin";
type Toast = { message: string; tone?: "success" | "warning" | "neutral" } | null;

const navItems: Array<{ id: Exclude<View, "admin">; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "jobs", label: "Jobs", icon: Search },
  { id: "applications", label: "Applications", icon: BriefcaseBusiness },
  { id: "resume", label: "Resume", icon: FileText },
  { id: "profile", label: "Profile", icon: UserRound },
];

const supportedTypes = ".pdf,.docx,.txt,.md,.markdown,.pptx,.xlsx,.csv,.png,.jpg,.jpeg,.json,.html";

function cloneInitialState() {
  return JSON.parse(JSON.stringify(initialAppState)) as AppState;
}

export default function CareerAgent({ signedInName }: { signedInName: string | null }) {
  const [state, setState] = useState<AppState>(() => cloneInitialState());
  const [started, setStarted] = useState(false);
  const [view, setView] = useState<View>("home");
  const [loaded, setLoaded] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [userMenu, setUserMenu] = useState(false);
  const firstSave = useRef(true);

  useEffect(() => {
    fetch("/api/state")
      .then((response) => response.json())
      .then((payload) => {
        const data = payload as { state?: AppState };
        if (data.state) {
          setState(data.state);
          if (data.state.onboardingComplete) setStarted(true);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      fetch("/api/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state }),
      }).catch(() => undefined);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [state, loaded]);

  useEffect(() => {
    if (state.onboardingComplete) window.scrollTo({ top: 0, behavior: "auto" });
  }, [view, state.onboardingComplete]);

  const showToast = useCallback((message: string, tone: "success" | "warning" | "neutral" = "neutral") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  if (!loaded) return <LoadingScreen />;

  if (!started) {
    return <LandingPage onStart={() => setStarted(true)} />;
  }

  if (!state.onboardingComplete) {
    return (
      <Onboarding
        state={state}
        setState={setState}
        onBack={() => setStarted(false)}
        onComplete={() => {
          setState((current) => ({ ...current, onboardingComplete: true }));
          setView("home");
          showToast("Your career workspace is ready", "success");
        }}
      />
    );
  }

  const displayName = signedInName ?? state.user.displayName;

  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="Primary navigation">
        <Brand compact />
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}>
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="side-plan-card">
          <div className="eyebrow">Free plan</div>
          <strong>{state.subscription.quotas.applications - state.subscription.usage.applications} assisted applications left</strong>
          <div className="quota-track"><span style={{ width: `${(state.subscription.usage.applications / state.subscription.quotas.applications) * 100}%` }} /></div>
          <button className="text-button" onClick={() => showToast("Plus billing is a documented MVP handoff; no payment was taken.")}>View Plus plan</button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="mobile-brand"><Brand compact /></div>
          <div className="header-context">
            <span className="live-dot" aria-hidden="true" />
            <span>{state.schedule.paused ? "Automation paused" : `Next search at ${state.schedule.time}`}</span>
            <span className="header-divider" />
            <span>{state.schedule.timeZone}</span>
          </div>
          <div className="header-actions">
            <button
              className={state.schedule.paused ? "pause-button paused" : "pause-button"}
              aria-label={state.schedule.paused ? "Resume all automation" : "Pause all automation"}
              onClick={() => {
                const paused = !state.schedule.paused;
                setState((current) => ({ ...current, schedule: { ...current.schedule, paused } }));
                showToast(paused ? "All automatic activity is paused" : "Scheduled activity resumed", paused ? "warning" : "success");
              }}
            >
              {state.schedule.paused ? <Play size={16} /> : <Pause size={16} />}
              <span>{state.schedule.paused ? "Resume" : "Pause all"}</span>
            </button>
            <div className="user-menu-wrap">
              <button className="avatar-button" onClick={() => setUserMenu((open) => !open)} aria-expanded={userMenu} aria-label="Open user menu">
                {initials(displayName)}
              </button>
              {userMenu && (
                <div className="user-menu">
                  <div className="user-menu-name"><strong>{displayName}</strong><span>{signedInName ? "Signed in with ChatGPT" : "Demonstration account"}</span></div>
                  <button onClick={() => { setView("profile"); setUserMenu(false); }}><Settings2 size={16} /> Settings & privacy</button>
                  <button onClick={() => { setView("admin"); setUserMenu(false); }}><BarChart3 size={16} /> Admin overview</button>
                  <button onClick={() => { setState(cloneInitialState()); setState((current) => ({ ...current, onboardingComplete: false })); setUserMenu(false); }}><RefreshCw size={16} /> Restart demo onboarding</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content-area">
          {view === "home" && <HomeView state={state} setState={setState} setView={setView} showToast={showToast} />}
          {view === "jobs" && <JobsView state={state} setState={setState} showToast={showToast} />}
          {view === "applications" && <ApplicationsView state={state} setState={setState} showToast={showToast} />}
          {view === "resume" && <ResumeView state={state} setState={setState} showToast={showToast} />}
          {view === "profile" && <ProfileView state={state} setState={setState} showToast={showToast} />}
          {view === "admin" && <AdminView state={state} />}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
              <Icon size={19} /><span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {toast && <div className={`toast ${toast.tone ?? "neutral"}`} role="status">{toast.tone === "success" ? <CheckCircle2 size={18} /> : toast.tone === "warning" ? <AlertCircle size={18} /> : <Info size={18} />}{toast.message}</div>}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen" role="status">
      <Brand />
      <div className="loading-card"><span /><span /><span /></div>
      <p>Preparing your private career workspace…</p>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand compact" : "brand"}>
      <span className="brand-mark"><Target size={compact ? 19 : 22} strokeWidth={2.4} /></span>
      <span>grounded</span>
    </div>
  );
}

function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand />
        <nav aria-label="Landing navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Privacy</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <button className="button secondary small" onClick={onStart}>Open demo</button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-kicker"><ShieldCheck size={16} /> Evidence-first career guidance</div>
            <h1>AI that finds jobs, improves your resume, and applies — <em>without inventing your experience.</em></h1>
            <p>Upload your career information once, choose your country and requirements, and receive realistic job, salary, and seniority recommendations.</p>
            <div className="hero-actions">
              <button className="button primary large" onClick={onStart}>Analyze My Career for Free <ArrowRight size={18} /></button>
              <span>No card required · 3 minutes</span>
            </div>
            <div className="trust-line"><BadgeCheck size={18} /> Evidence-based. Explainable. Private. Deletable.</div>
          </div>
          <div className="hero-product" aria-label="Example realistic career recommendation">
            <div className="product-window-bar"><span /><span /><span /><div>Career fit · Singapore</div></div>
            <div className="product-sample">
              <div className="sample-title"><div><span className="company-monogram">N</span><div><strong>Senior Product Analyst</strong><span>Northstar Labs · Singapore</span></div></div><span className="decision apply">Apply</span></div>
              <div className="fit-row"><span>Interview chance</span><strong className="medium-text">Medium</strong></div>
              <div className="fit-row"><span>Seniority</span><strong>Good fit for Senior</strong></div>
              <div className="fit-row"><span>Salary</span><strong>Within target range</strong></div>
              <div className="fit-row"><span>Visa</span><strong>Sponsorship may be available</strong></div>
              <div className="gap-box"><span>Evidence gap</span><p>Direct fintech experience. Your product analytics and experimentation work still transfers.</p></div>
              <div className="sample-action">Prepare for review <ChevronRight size={16} /></div>
            </div>
            <div className="floating-proof proof-one"><FileCheck2 size={18} /><div><strong>12 facts verified</strong><span>Every claim links to a source</span></div></div>
            <div className="floating-proof proof-two"><LockKeyhole size={18} /><div><strong>Your current salary stays private</strong><span>Never sent without approval</span></div></div>
          </div>
        </section>

        <section className="signal-strip" aria-label="Product highlights">
          <div><strong>Realistic</strong><span>Direct advice, not empty encouragement</span></div>
          <div><strong>Truthful</strong><span>No invented skills, jobs, or metrics</span></div>
          <div><strong>Visa-aware</strong><span>Unknown sponsorship is not an automatic no</span></div>
          <div><strong>Controlled</strong><span>You choose recommendation, review, or automation</span></div>
        </section>

        <section className="landing-section" id="how-it-works">
          <div className="section-heading"><span className="eyebrow">One profile, better decisions</span><h2>Three steps. Then the useful part starts.</h2><p>Grounded turns your own evidence into short, practical recommendations you can inspect.</p></div>
          <div className="three-steps">
            <article><span>01</span><div className="feature-icon"><Upload size={22} /></div><h3>Import experience</h3><p>Preview a resume, career folder, portfolio, or authorized AI conversation before analysis.</p></article>
            <article><span>02</span><div className="feature-icon"><SlidersIcon /></div><h3>Set the rules</h3><p>Choose countries, roles, salary needs, work style, sponsorship, and application mode.</p></article>
            <article><span>03</span><div className="feature-icon"><Sparkles size={22} /></div><h3>Get grounded advice</h3><p>See what fits, what is a stretch, and what evidence would improve your chances.</p></article>
          </div>
        </section>

        <section className="truth-section">
          <div>
            <span className="eyebrow">Built for the honest answer</span>
            <h2>Career-change advice that respects what you have actually done.</h2>
            <p>Grounded separates confirmed experience from goals and planned skills. “I plan to learn Kubernetes” never becomes “Experienced with Kubernetes.”</p>
            <ul><li><Check size={16} /> Transferable skills are explained</li><li><Check size={16} /> Low-chance roles remain visible</li><li><Check size={16} /> Legal and licensing blockers stay hard blockers</li></ul>
          </div>
          <div className="truth-card">
            <span className="decision apply">You can apply</span>
            <h3>Product Manager, Data Products</h3>
            <div className="chance-line"><span>Estimated interview chance</span><strong>Low</strong></div>
            <p><strong>Transferable:</strong> stakeholder management and analytics.</p>
            <p><strong>Build evidence in:</strong> SQL product metrics, experimentation, and one real product case study.</p>
          </div>
        </section>

        <section className="privacy-band" id="privacy">
          <div className="privacy-lock"><LockKeyhole size={29} /></div>
          <div><span className="eyebrow">Privacy by default</span><h2>Your career history is not ad inventory.</h2><p>Authorize each source, control employer use fact by fact, export or delete your data, and remove file indexes without touching originals.</p></div>
          <div className="privacy-points"><span><Check size={16} /> Separate analytics consent</span><span><Check size={16} /> Encrypted sensitive data</span><span><Check size={16} /> No secrets in logs</span></div>
        </section>

        <section className="landing-section pricing" id="pricing">
          <div className="section-heading"><span className="eyebrow">Simple pricing</span><h2>Start with the decisions that matter.</h2></div>
          <div className="pricing-grid">
            <article><span className="plan-name">Free</span><div className="price">$0</div><p>For understanding your fit and preparing a focused search.</p><ul><li><Check size={16} /> Career profile</li><li><Check size={16} /> 20 recommendations / month</li><li><Check size={16} /> 3 tailored resumes / month</li><li><Check size={16} /> 5 assisted applications / month</li></ul><button className="button secondary" onClick={onStart}>Start free</button></article>
            <article className="featured"><span className="popular">Most useful</span><span className="plan-name">Plus</span><div className="price">$4.90 <small>/ month</small></div><p>Or US$39/year. For an active, controlled job search.</p><ul><li><Check size={16} /> Up to 100 prepared or automated applications</li><li><Check size={16} /> Salary and career-change analysis</li><li><Check size={16} /> Country-specific resumes</li><li><Check size={16} /> Scheduling and Bring Your Own AI</li></ul><button className="button primary" onClick={onStart}>Try the product demo</button></article>
          </div>
        </section>

        <section className="seo-intent">
          <div><h3>AI resume optimizer</h3><p>Tailor wording to a job description while preserving dates, metrics, and approved experience.</p></div>
          <div><h3>Singapore visa sponsorship jobs</h3><p>Separate explicit refusals from unknown sponsorship language for international candidates.</p></div>
          <div><h3>Salary checker by job title</h3><p>Compare current pay with dated, source-labeled ranges only when evidence is sufficient.</p></div>
        </section>
      </main>
      <footer><Brand compact /><p>Realistic career guidance, built around your evidence.</p><span>© 2026 Grounded</span></footer>
    </div>
  );
}

function SlidersIcon() {
  return <Settings2 size={22} />;
}

function Onboarding({ state, setState, onBack, onComplete }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onBack: () => void; onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [sourceChoice, setSourceChoice] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState("");
  const [fileAnalyzed, setFileAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [rule, setRule] = useState(state.preferences.naturalLanguageRule ?? "");
  const [ruleConfirmed, setRuleConfirmed] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const conversationInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const parsedRules = useMemo(() => parsePreferenceSentence(rule), [rule]);

  const chooseFiles = (choice: string) => {
    setSourceChoice(choice);
    if (choice === "resume") fileInput.current?.click();
    if (choice === "conversation") conversationInput.current?.click();
    if (choice === "folder") folderInput.current?.click();
  };

  const previewFile = async (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    setAuthorized(false);
    setFileAnalyzed(false);
    const extension = selected.name.split(".").pop()?.toLowerCase();
    if (["txt", "md", "markdown", "csv", "json", "html"].includes(extension ?? "")) {
      const text = await selected.text();
      setFilePreview(text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 520));
    } else {
      setFilePreview(`${selected.name} · ${formatBytes(selected.size)} · Preview ready for authorization. Binary content will be processed after you approve analysis.`);
    }
  };

  const analyzeFile = async () => {
    if (!file || !authorized) return;
    setAnalyzing(true);
    const form = new FormData();
    form.set("file", file);
    form.set("authorized", "true");
    try {
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const payload = await response.json() as { error?: string; id: string };
      if (!response.ok) throw new Error(payload.error ?? "Import failed");
      const document: SourceDocument = {
        id: payload.id,
        userId: state.user.id,
        name: file.name,
        type: file.type || file.name.split(".").pop() || "unknown",
        size: file.size,
        status: "analyzed",
        sourceKind: sourceChoice === "resume" ? "resume" : sourceChoice === "folder" ? "career-folder" : "other",
        uploadedAt: new Date().toISOString(),
      };
      setState((current) => ({ ...current, documents: [...current.documents.filter((doc) => !doc.id.startsWith("doc-")), document] }));
      setFileAnalyzed(true);
    } catch {
      const localDocument: SourceDocument = { id: crypto.randomUUID(), userId: state.user.id, name: file.name, type: file.type || "unknown", size: file.size, status: "analyzed", sourceKind: sourceChoice === "resume" ? "resume" : "other", uploadedAt: new Date().toISOString() };
      setState((current) => ({ ...current, documents: [...current.documents, localDocument] }));
      setFileAnalyzed(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleCountry = (country: string) => setState((current) => ({ ...current, preferences: { ...current.preferences, countries: toggleArray(current.preferences.countries, country) } }));
  const toggleRole = (role: string) => setState((current) => ({ ...current, preferences: { ...current.preferences, targetRoles: toggleArray(current.preferences.targetRoles, role) } }));
  const toggleWorkMode = (mode: "Remote" | "Hybrid" | "On-site") => setState((current) => ({ ...current, preferences: { ...current.preferences, workModes: toggleArray(current.preferences.workModes, mode) } }));

  return (
    <div className="onboarding-shell">
      <header className="onboarding-header"><Brand /><button className="icon-text-button" onClick={onBack}><ArrowLeft size={17} /> Back to site</button></header>
      <div className="onboarding-progress" aria-label={`Step ${step} of 3`}>
        {[1, 2, 3].map((number) => <span key={number} className={step >= number ? "active" : ""} />)}
      </div>
      <main className="onboarding-main">
        <div className="step-label">Step {step} of 3</div>
        {step === 1 && (
          <section>
            <div className="onboarding-title"><h1>Bring your experience together</h1><p>Choose only the sources you want Grounded to read. You will preview everything before analysis.</p></div>
            <div className="source-grid">
              <SourceCard icon={Upload} title="Upload Resume" detail="PDF, DOCX, TXT or Markdown" onClick={() => chooseFiles("resume")} active={sourceChoice === "resume"} />
              <SourceCard icon={FolderOpen} title="Select Career Folder" detail="Projects, portfolios and certificates" onClick={() => chooseFiles("folder")} active={sourceChoice === "folder"} />
              <SourceCard icon={MessageSquareText} title="Import AI Conversations" detail="JSON, HTML, Markdown or TXT" onClick={() => chooseFiles("conversation")} active={sourceChoice === "conversation"} />
              <SourceCard icon={ArrowRight} title="Skip for Now" detail="Start with a demonstration profile" onClick={() => { setSourceChoice("skip"); setFile(null); }} active={sourceChoice === "skip"} />
            </div>
            <input ref={fileInput} className="visually-hidden" type="file" accept={supportedTypes} onChange={(event) => previewFile(event.target.files?.[0] ?? null)} />
            <input ref={conversationInput} className="visually-hidden" type="file" accept=".json,.html,.md,.txt" onChange={(event) => previewFile(event.target.files?.[0] ?? null)} />
            <input ref={folderInput} className="visually-hidden" type="file" multiple onChange={(event) => previewFile(event.target.files?.[0] ?? null)} {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} />
            {file && (
              <div className="preview-panel">
                <div className="preview-header"><div className="file-type-icon"><FileText size={20} /></div><div><strong>{file.name}</strong><span>{formatBytes(file.size)} · {fileAnalyzed ? "Analysis complete" : "Local preview"}</span></div><button aria-label="Remove selected file" onClick={() => { setFile(null); setFilePreview(""); setAuthorized(false); setFileAnalyzed(false); }}><X size={18} /></button></div>
                <div className="preview-body"><span className="eyebrow">Preview before analysis</span><p>{filePreview}</p></div>
                <label className="consent-row"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} /><span><strong>I authorize Grounded to analyze this file.</strong><small>A protected working copy may be stored. The original file will never be modified or deleted.</small></span></label>
                <button className={fileAnalyzed ? "button confirmed small" : "button secondary small"} disabled={!authorized || analyzing || fileAnalyzed} onClick={analyzeFile}>{fileAnalyzed ? <><CheckCircle2 size={16} /> Analysis complete</> : analyzing ? <><RefreshCw className="spin" size={16} /> Analyzing…</> : <><Sparkles size={16} /> Analyze authorized file</>}</button>
              </div>
            )}
            <div className="privacy-note"><ShieldCheck size={17} /><span>Only files you explicitly choose are read. Imported indexes can be deleted later without touching original files.</span></div>
          </section>
        )}

        {step === 2 && (
          <section>
            <div className="onboarding-title"><h1>What should your next job look like?</h1><p>Use the defaults, then change only what matters.</p></div>
            <div className="preference-form">
              <FormGroup label="Target countries"><div className="chip-row">{["Singapore", "Malaysia", "Australia", "United Kingdom", "Remote worldwide"].map((country) => <Chip key={country} label={country} active={state.preferences.countries.includes(country)} onClick={() => toggleCountry(country)} />)}</div></FormGroup>
              <FormGroup label="Target roles"><div className="chip-row">{["Senior Product Analyst", "Analytics Lead", "Product Manager", "Business Intelligence Analyst"].map((role) => <Chip key={role} label={role} active={state.preferences.targetRoles.includes(role)} onClick={() => toggleRole(role)} />)}</div></FormGroup>
              <div className="two-column-fields">
                <FormGroup label="Work style"><div className="segmented">{(["Remote", "Hybrid", "On-site"] as const).map((mode) => <button key={mode} className={state.preferences.workModes.includes(mode) ? "active" : ""} onClick={() => toggleWorkMode(mode)}>{mode}</button>)}</div></FormGroup>
                <FormGroup label="Salary priority"><select value={state.preferences.salaryPriority} onChange={(event) => setState((current) => ({ ...current, preferences: { ...current.preferences, salaryPriority: event.target.value as AppState["preferences"]["salaryPriority"] } }))}><option>Get Hired Faster</option><option>Balanced</option><option>Maximize Salary</option></select></FormGroup>
              </div>
              <div className="preference-toggles">
                <label><input type="checkbox" checked={state.preferences.openToCareerChange} onChange={(event) => setState((current) => ({ ...current, preferences: { ...current.preferences, openToCareerChange: event.target.checked } }))} /><span><strong>I am changing careers</strong><small>Include adjacent roles and transferable skills</small></span></label>
                <label><input type="checkbox" checked={Boolean(state.preferences.requiresSponsorship)} onChange={(event) => setState((current) => ({ ...current, preferences: { ...current.preferences, requiresSponsorship: event.target.checked } }))} /><span><strong>I require visa sponsorship</strong><small>Unknown sponsorship will remain eligible</small></span></label>
              </div>
              <div className="salary-inputs">
                <FormGroup label="Current salary"><div className="input-cluster"><select aria-label="Salary currency" value={state.salaryProfile.currency} onChange={(event) => setState((current) => ({ ...current, salaryProfile: { ...current.salaryProfile, currency: event.target.value } }))}><option>SGD</option><option>MYR</option><option>USD</option><option>GBP</option></select><input aria-label="Current salary amount" type="number" value={state.salaryProfile.amount} onChange={(event) => setState((current) => ({ ...current, salaryProfile: { ...current.salaryProfile, amount: Number(event.target.value) } }))} /><select aria-label="Salary period" value={state.salaryProfile.period} onChange={(event) => setState((current) => ({ ...current, salaryProfile: { ...current.salaryProfile, period: event.target.value as "monthly" | "annual" } }))}><option value="monthly">per month</option><option value="annual">per year</option></select></div></FormGroup>
                <FormGroup label="Willing to accept"><select value={state.salaryProfile.reduction} onChange={(event) => setState((current) => ({ ...current, salaryProfile: { ...current.salaryProfile, reduction: event.target.value as AppState["salaryProfile"]["reduction"] } }))}><option>No reduction</option><option>Up to 5%</option><option>Up to 10%</option><option>Up to 15%</option><option>Up to 20%</option><option>Negotiable — prioritize getting hired</option></select></FormGroup>
              </div>
              <FormGroup label="Anything else that your next job must include?" optional><textarea value={rule} onChange={(event) => { setRule(event.target.value); setRuleConfirmed(false); }} rows={3} placeholder="Singapore jobs only. I need an employer to consider an Employment Pass. Minimum salary SGD 7,000." /><small className="field-hint">Write naturally. Grounded will show the rules it understood.</small></FormGroup>
              {rule && (
                <div className="rule-confirmation">
                  <div><span className="eyebrow">Rules understood</span><strong>{parsedRules.countries.join(", ") || "Any country"} · {parsedRules.requiresSponsorship ? "Sponsorship required" : "No sponsorship rule"}{parsedRules.minimumSalary ? ` · Minimum ${parsedRules.salaryCurrency} ${parsedRules.minimumSalary.toLocaleString()}` : ""}{parsedRules.excludedIndustries.length ? ` · Exclude ${parsedRules.excludedIndustries.join(", ")}` : ""}</strong></div>
                  <button className={ruleConfirmed ? "button confirmed small" : "button secondary small"} onClick={() => { setRuleConfirmed(true); setState((current) => ({ ...current, preferences: { ...current.preferences, naturalLanguageRule: rule, countries: parsedRules.countries.length ? parsedRules.countries : current.preferences.countries, requiresSponsorship: parsedRules.requiresSponsorship ? true : current.preferences.requiresSponsorship, excludedIndustries: parsedRules.excludedIndustries.length ? parsedRules.excludedIndustries : current.preferences.excludedIndustries } })); }}>{ruleConfirmed ? <><Check size={16} /> Confirmed</> : "Confirm rules"}</button>
                </div>
              )}
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <div className="onboarding-title"><h1>How involved should Grounded be?</h1><p>You can change this or pause all activity at any time.</p></div>
            <div className="mode-grid">
              <ModeCard icon={Search} title="Recommend Jobs Only" detail="Find, filter, and rank roles. Nothing is prepared or submitted." value="Recommend Only" current={state.preferences.applicationMode} onSelect={(mode) => setState((current) => ({ ...current, preferences: { ...current.preferences, applicationMode: mode } }))} />
              <ModeCard icon={FileCheck2} title="Prepare Applications for Review" badge="Recommended" detail="Draft a truthful resume and answers. You approve every simulated submission." value="Review Before Applying" current={state.preferences.applicationMode} onSelect={(mode) => setState((current) => ({ ...current, preferences: { ...current.preferences, applicationMode: mode } }))} />
              <ModeCard icon={Send} title="Automatically Apply When Rules Match" detail="Submit only on permitted sources when every required answer is confirmed." value="Automatic Apply" current={state.preferences.applicationMode} onSelect={(mode) => setState((current) => ({ ...current, preferences: { ...current.preferences, applicationMode: mode } }))} />
            </div>
            <button className="advanced-toggle" onClick={() => setAdvancedOpen((open) => !open)} aria-expanded={advancedOpen}><Settings2 size={17} /> Advanced settings <ChevronDown className={advancedOpen ? "rotated" : ""} size={17} /></button>
            {advancedOpen && <div className="advanced-panel"><label>Daily application limit <input type="number" min="1" max="30" value={state.schedule.dailyLimit} onChange={(event) => setState((current) => ({ ...current, schedule: { ...current.schedule, dailyLimit: Number(event.target.value) } }))} /></label><label>Low-chance limit <input type="number" min="0" max="10" value={state.schedule.lowChanceLimit} onChange={(event) => setState((current) => ({ ...current, schedule: { ...current.schedule, lowChanceLimit: Number(event.target.value) } }))} /></label><label>Run time <input type="time" value={state.schedule.time} onChange={(event) => setState((current) => ({ ...current, schedule: { ...current.schedule, time: event.target.value } }))} /></label></div>}
            <div className="safety-summary"><ShieldCheck size={20} /><p><strong>Business rules stay in control.</strong> Grounded never bypasses captchas, takes assessments, invents answers, or applies twice. Every simulated submission creates an audit event.</p></div>
          </section>
        )}

        <div className="onboarding-actions">
          <button className="button ghost" disabled={step === 1} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} /> Back</button>
          {step < 3 ? <button className="button primary" disabled={step === 1 && !sourceChoice} onClick={() => setStep((current) => current + 1)}>Continue <ArrowRight size={17} /></button> : <button className="button primary" onClick={onComplete}>Start job search <Sparkles size={17} /></button>}
        </div>
      </main>
    </div>
  );
}

function SourceCard({ icon: Icon, title, detail, onClick, active }: { icon: typeof Upload; title: string; detail: string; onClick: () => void; active: boolean }) {
  return <button aria-pressed={active} className={active ? "source-card active" : "source-card"} onClick={onClick}><span className="source-icon"><Icon size={24} /></span><span><strong>{title}</strong><small>{detail}</small></span>{active && <CheckCircle2 className="selected-check" size={19} />}</button>;
}

function ModeCard({ icon: Icon, title, badge, detail, value, current, onSelect }: { icon: typeof Search; title: string; badge?: string; detail: string; value: ApplicationMode; current: ApplicationMode; onSelect: (mode: ApplicationMode) => void }) {
  const active = current === value;
  return <button aria-pressed={active} className={active ? "mode-card active" : "mode-card"} onClick={() => onSelect(value)}><span className="mode-radio">{active && <span />}</span><div className="mode-title"><span className="source-icon"><Icon size={22} /></span>{badge && <em>{badge}</em>}</div><strong>{title}</strong><p>{detail}</p></button>;
}

function FormGroup({ label, optional = false, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return <div className="form-group" role="group" aria-label={label}><span className="field-label">{label}{optional && <small>Optional</small>}</span>{children}</div>;
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" className={active ? "chip active" : "chip"} onClick={onClick}>{active && <Check size={14} />}{label}</button>;
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{detail}</p></div>{action}</div>;
}

function HomeView({ state, setState, setView, showToast }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; setView: (view: View) => void; showToast: (message: string, tone?: "success" | "warning" | "neutral") => void }) {
  const [running, setRunning] = useState(false);
  const topJob = state.jobs.find((job) => job.sourceKind !== "mock") ?? state.jobs[0];
  const topMatch = state.matches.find((match) => match.jobId === topJob.id)!;
  const conflictOpen = state.evidence.some((item) => item.confirmationStatus === "conflict");
  const primaryAssessment = state.careerAssessments[0];
  const salaryAssessment = state.salaryAssessments[0];
  const confirmedEvidence = state.evidence.filter((item) => item.confirmationStatus === "confirmed").length;
  const readiness = getAutoPreparationReadiness(state);
  const lastReport = state.schedule.lastReport;
  const today = new Intl.DateTimeFormat("en-MY", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const lastRunLabel = state.schedule.lastRunAt
    ? new Intl.DateTimeFormat("en-MY", { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(state.schedule.lastRunAt))
    : "Not run yet";
  const runSearch = async () => {
    setRunning(true);
    try {
      const response = await fetch("/api/automation", { method: "POST" });
      const payload = await response.json() as { state?: AppState; report?: AppState["schedule"]["lastReport"]; error?: string };
      if (!response.ok || !payload.state || !payload.report) throw new Error(payload.error ?? "Automatic preparation could not run");
      setState(payload.state);
      if (payload.report.blockers.length) showToast(payload.report.blockers[0], "warning");
      else showToast(`${payload.report.prepared} real ${payload.report.prepared === 1 ? "application" : "applications"} prepared for review`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Automatic preparation could not run", "warning");
    } finally {
      setRunning(false);
    }
  };
  return (
    <>
      <PageHeading eyebrow={today} title={`Good morning, ${state.user.displayName.split(" ")[0]}.`} detail="Here is the honest picture of your search today." action={<button className="button secondary" disabled={running} onClick={runSearch}>{running ? <RefreshCw className="spin" size={16} /> : <Sparkles size={16} />} {running ? "Preparing…" : "Auto-prepare now"}</button>} />
      {state.schedule.paused && <div className="status-banner warning"><Pause size={18} /><div><strong>Automatic preparation is paused</strong><span>No real jobs will be prepared until you resume. Final employer submission always remains yours.</span></div><button onClick={() => setState((current) => ({ ...current, schedule: { ...current.schedule, paused: false } }))}>Resume</button></div>}
      {conflictOpen && <div className="status-banner conflict"><AlertCircle size={19} /><div><strong>One fact needs your answer</strong><span>Two sources disagree about when your current role started.</span></div><button onClick={() => setView("profile")}>Resolve conflict <ChevronRight size={15} /></button></div>}
      <section className="panel autopilot-panel">
        <div className="autopilot-heading"><div className="autopilot-icon"><Sparkles size={20} /></div><div><span className="eyebrow">Application autopilot</span><h2>Discover and prepare automatically</h2><p>Grounded can queue real employer applications and tailor private materials. It never uploads your résumé or presses an employer’s final Submit button.</p></div><span className={readiness.ready ? "source-badge live" : "source-badge demo"}>{readiness.ready ? "Ready" : `${readiness.blockers.length} setup ${readiness.blockers.length === 1 ? "item" : "items"}`}</span></div>
        <div className="autopilot-status">
          {(readiness.blockers.length ? readiness.blockers : ["Automatic preparation is ready"]).map((item) => <span key={item} className={readiness.ready ? "ready" : "blocked"}>{readiness.ready ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}{item}</span>)}
          {readiness.warnings.slice(0, 3).map((item) => <span key={item} className="warning"><Info size={15} />{item}</span>)}
        </div>
        <div className="panel-actions"><button className="button primary small" onClick={() => setView("jobs")}>Connect real jobs <Link2 size={15} /></button><button className="button ghost small" onClick={() => setView("profile")}>Confirm application facts</button></div>
      </section>
      <div className="metric-grid">
        <MetricCard label="Profile evidence" value={`${state.careerProfile.completeness}%`} detail={`${confirmedEvidence} of ${state.evidence.length} facts confirmed`} icon={FileCheck2} accent="blue" />
        <MetricCard label="Best target level" value={primaryAssessment?.recommendedLevel ?? "Not assessed"} detail={primaryAssessment ? `${primaryAssessment.targetRole} · ${primaryAssessment.confidence} confidence` : "Connect your resume to assess"} icon={Gauge} accent="green" />
        <MetricCard label="Current salary" value={state.salaryProfile.amount > 0 ? `${state.salaryProfile.currency} ${state.salaryProfile.amount.toLocaleString()}` : "Not provided"} detail={salaryAssessment ? salaryAssessment.marketPosition : "Private until you choose to add it"} icon={CircleDollarSign} accent="amber" />
        <MetricCard label="Search this month" value={`${state.subscription.usage.recommendations} / ${state.subscription.quotas.recommendations}`} detail="Recommendations used" icon={Target} accent="purple" />
      </div>
      <div className="dashboard-grid">
        <section className="panel top-opportunity">
          <div className="panel-header"><div><span className="eyebrow">Best opportunity today</span><h2>{topJob.title}</h2><p>{topJob.company} · {topJob.location} · {topJob.remotePolicy}</p></div><span className={topJob.sourceKind === "mock" ? "source-badge mock" : "source-badge live"}>{topJob.sourceKind === "mock" ? "Demo source" : "Official source"}</span></div>
          <div className="job-fit-summary"><div><span>Decision</span><strong className="apply-text">{topMatch.decision}</strong></div><div><span>Interview chance</span><strong className="medium-text">{topMatch.interviewChance}</strong></div><div><span>Seniority</span><strong>{topMatch.seniorityFit}</strong></div><div><span>Salary</span><strong>{topJob.salaryLow ? `${topJob.salaryCurrency ?? ""} ${topJob.salaryLow.toLocaleString()}–${topJob.salaryHigh?.toLocaleString()}` : "Not listed"}</strong></div></div>
          <p className="reason-line"><Sparkles size={16} /> {topMatch.reasons[0]}</p>
          <div className="panel-actions"><button className="button primary small" onClick={() => setView("jobs")}>Review match</button><button className="button ghost small" onClick={() => addFeedback(state, setState, "job", topJob.id, "Relevant", showToast)}>Relevant <ThumbsUp size={15} /></button></div>
        </section>
        <section className="panel daily-report">
          <div className="panel-header"><div><span className="eyebrow">Last automatic run</span><h2>{lastRunLabel}</h2></div><CalendarClock size={22} /></div>
          <div className="report-stats"><span><strong>{lastReport?.discovered ?? 0}</strong> live jobs</span><span><strong>{lastReport?.matched ?? 0}</strong> eligible</span><span><strong>{lastReport?.prepared ?? 0}</strong> prepared</span><span><strong>{lastReport?.submitted ?? 0}</strong> submitted</span></div>
          <p><Info size={15} /> {lastReport?.blockers[0] ?? lastReport?.warnings[0] ?? "No employer form is submitted without your final approval."}</p>
          <button className="text-button" onClick={() => setView("applications")}>Open application tracker <ArrowRight size={15} /></button>
        </section>
      </div>
      <div className="dashboard-grid second-row">
        <section className="panel level-panel">
          <div className="panel-header"><div><span className="eyebrow">Seniority recommendation</span><h2>{primaryAssessment?.targetRole ?? "Resume assessment required"}</h2></div>{primaryAssessment && <span className={`confidence ${primaryAssessment.confidence.toLowerCase()}`}>{primaryAssessment.confidence} confidence</span>}</div>
          <div className="range-position"><span>Below</span><span>Within typical range</span><span>Above</span><div className="range-line"><i /><b style={{ left: "58%" }} /></div></div>
          <ul className="evidence-list compact">{(primaryAssessment?.strengths ?? ["Connect your resume to generate a level assessment"]).slice(0, 3).map((strength) => <li key={strength}><Check size={15} /> {strength}</li>)}</ul>
        </section>
        <section className="panel salary-panel">
          {salaryAssessment ? <><div className="panel-header"><div><span className="eyebrow">Salary intelligence</span><h2>{salaryAssessment.currency} {salaryAssessment.recommendedLow.toLocaleString()}–{salaryAssessment.recommendedHigh.toLocaleString()} <small>/ {salaryAssessment.period}</small></h2></div><span className={salaryAssessment.demonstrationData ? "source-badge demo" : "source-badge live"}>{salaryAssessment.demonstrationData ? "Demo data" : "Dated source"}</span></div><div className="salary-scale"><div className="scale-labels"><span>{salaryAssessment.suggestedMinimum.toLocaleString()} minimum</span><span>{salaryAssessment.marketHigh.toLocaleString()} observed high</span></div><div className="scale-track"><span /><i style={{ left: "26%" }}>Current</i><b style={{ left: "53%" }}>Target</b></div></div><p>{salaryAssessment.marketPosition}. Dated {salaryAssessment.dataDate}.</p></> : <div className="empty-inline"><CircleDollarSign size={24} /><h2>Salary not provided</h2><p>Add your current salary and target market only when you are ready. It will remain private by default.</p></div>}
        </section>
      </div>
    </>
  );
}

function MetricCard({ label, value, detail, icon: Icon, accent }: { label: string; value: string; detail: string; icon: typeof FileText; accent: string }) {
  return <article className="metric-card"><div className={`metric-icon ${accent}`}><Icon size={20} /></div><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>;
}

function provisionalMatch(job: JobPosting, state: AppState): JobMatch {
  const hardVisaBlock = job.visaFit === "Sponsorship clearly unavailable" || job.visaFit === "Existing work authorization required";
  const targetWords = state.preferences.targetRoles.flatMap((role) => role.toLowerCase().split(/\s+/)).filter((word) => word.length > 3);
  const title = job.title.toLowerCase();
  const roleOverlap = targetWords.some((word) => title.includes(word));
  return {
    id: `match-${job.id}`,
    jobId: job.id,
    decision: hardVisaBlock ? "Skip" : "Apply",
    interviewChance: hardVisaBlock ? "Low" : roleOverlap ? "Medium" : "Low",
    resumeVersion: state.resumeContent?.personalized ? state.resume.name : "Personal resume required",
    seniorityFit: "Needs resume review",
    salaryFit: job.salaryLow ? "Listed by employer" : "Not listed",
    visaFit: job.visaFit,
    gaps: state.resumeContent?.personalized ? ["Confirm résumé evidence before employer use"] : ["Upload your real resume for a personalized assessment"],
    evidenceQuality: "Low",
    reasons: [
      "This job comes from an official employer page.",
      hardVisaBlock ? "The posting contains a confirmed work-authorization blocker." : "No confirmed hard blocker was found in the imported posting.",
      state.resumeContent?.personalized ? "Fit remains provisional until your résumé evidence is confirmed." : "Fit remains provisional until your real resume is analyzed.",
    ],
  };
}

function JobsView({ state, setState, showToast }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; showToast: (message: string, tone?: "success" | "warning" | "neutral") => void }) {
  const [selected, setSelected] = useState(state.jobs[0].id);
  const [chanceFilter, setChanceFilter] = useState("All fits");
  const [query, setQuery] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [boardCompany, setBoardCompany] = useState("");
  const [boardToken, setBoardToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const liveJobs = state.jobs.filter((job) => job.sourceKind !== "mock").length;

  const addJobs = (incoming: JobPosting[]) => {
    const safeIncoming = incoming.filter((job) => isSafeEmployerUrl(job.canonicalUrl));
    const combined = deduplicateJobs([...state.jobs, ...safeIncoming]);
    const additions = combined.filter((job) => !state.jobs.some((existing) => existing.id === job.id || existing.canonicalUrl.replace(/\?.*$/, "") === job.canonicalUrl.replace(/\?.*$/, "")));
    if (additions.length === 0) return 0;
    setState((current) => ({
      ...current,
      jobs: deduplicateJobs([...current.jobs, ...additions]),
      matches: [...current.matches, ...additions.map((job) => provisionalMatch(job, current))],
    }));
    setSelected(additions[0].id);
    return additions.length;
  };

  const addOfficialJob = (event: React.FormEvent) => {
    event.preventDefault();
    setConnectionError("");
    if (!company.trim() || !jobTitle.trim() || !isSafeEmployerUrl(jobUrl)) {
      setConnectionError("Enter the employer, job title, and a secure official job URL.");
      return;
    }
    const normalizedUrl = new URL(jobUrl).toString();
    const role = jobTitle.trim();
    const job: JobPosting = {
      id: `official-${crypto.randomUUID()}`,
      sourceId: "official-employer-link",
      sourceLabel: "Official employer application page",
      sourceKind: "public-career-page",
      company: company.trim(),
      title: role,
      location: jobLocation.trim() || "Location not specified",
      country: jobLocation.trim() || "Not specified",
      remotePolicy: /remote/i.test(jobLocation) ? "Remote" : /hybrid/i.test(jobLocation) ? "Hybrid" : "On-site",
      visaFit: "Sponsorship not mentioned",
      seniority: /lead/i.test(role) ? "Lead" : /manager/i.test(role) ? "Manager" : /senior|staff|principal/i.test(role) ? "Senior" : "Mid-level",
      skills: [],
      gaps: [],
      requisitionId: new URL(normalizedUrl).searchParams.get("gh_jid") ?? new URL(normalizedUrl).pathname.split("/").filter(Boolean).at(-1) ?? crypto.randomUUID(),
      canonicalUrl: normalizedUrl,
      description: "Imported from an official employer application link. Review the employer page for the complete requirements.",
      postedAt: new Date().toISOString(),
      employmentType: "Not specified",
      industry: "Not specified",
      applicationSupport: "external",
    };
    const added = addJobs([job]);
    if (added === 0) return setConnectionError("This job is already in your tracker.");
    setCompany(""); setJobTitle(""); setJobLocation(""); setJobUrl("");
    showToast("Official employer job added. Grounded will never claim it was submitted until you confirm.", "success");
  };

  const connectGreenhouse = async (event: React.FormEvent) => {
    event.preventDefault();
    setConnectionError("");
    if (!boardCompany.trim() || !boardToken.trim()) return setConnectionError("Enter the employer name and its Greenhouse board name or URL.");
    setConnecting(true);
    try {
      const response = await fetch(`/api/jobs?board=${encodeURIComponent(boardToken)}&company=${encodeURIComponent(boardCompany)}`);
      const payload = await response.json() as { error?: string; jobs?: JobPosting[] };
      if (!response.ok) throw new Error(payload.error ?? "The employer board could not be connected.");
      const added = addJobs(payload.jobs ?? []);
      if (added === 0) throw new Error("No new public jobs were found on that board.");
      showToast(`${added} live employer ${added === 1 ? "job" : "jobs"} added`, "success");
      setBoardCompany(""); setBoardToken("");
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "The employer board could not be connected.");
    } finally {
      setConnecting(false);
    }
  };
  const jobs = state.jobs.filter((job) => {
    const chance = chanceFilter === "All fits" || state.matches.find((match) => match.jobId === job.id)?.interviewChance === chanceFilter;
    return chance && `${job.title} ${job.company}`.toLowerCase().includes(query.toLowerCase());
  });
  const selectedJob = state.jobs.find((job) => job.id === selected) ?? state.jobs[0];
  const match = state.matches.find((item) => item.jobId === selectedJob.id)!;
  return (
    <>
      <PageHeading eyebrow="Job discovery" title="Jobs worth your time" detail="Add an official job link or connect a public employer board. You always finish a real application on the employer's website." action={<button className="button secondary" onClick={() => setConnectOpen((open) => !open)}><Link2 size={16} /> {connectOpen ? "Close connections" : "Connect employer jobs"}</button>} />
      {connectOpen && <section className="job-connector panel">
        <div className="connector-heading"><div><span className="eyebrow">Real employer connections</span><h2>Add live jobs without sharing your data</h2><p>No résumé or personal information is sent while connecting a job source.</p></div><span className="source-badge live">{liveJobs} live {liveJobs === 1 ? "job" : "jobs"}</span></div>
        <div className="connector-grid">
          <form onSubmit={addOfficialJob}>
            <div><strong>Add any official job</strong><span>Works with Workday, LinkedIn, Lever, Greenhouse, and employer career sites.</span></div>
            <label>Employer<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Example Company" /></label>
            <label>Job title<input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Senior Product Analyst" /></label>
            <label>Location <small>Optional</small><input value={jobLocation} onChange={(event) => setJobLocation(event.target.value)} placeholder="Singapore or Remote" /></label>
            <label>Official job URL<input type="url" value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} placeholder="https://company.com/jobs/..." /></label>
            <button className="button primary small" type="submit">Add official job <ArrowRight size={15} /></button>
          </form>
          <form onSubmit={connectGreenhouse}>
            <div><strong>Import a Greenhouse employer board</strong><span>Use the company part from boards.greenhouse.io/company, or paste the full board URL.</span></div>
            <label>Employer<input value={boardCompany} onChange={(event) => setBoardCompany(event.target.value)} placeholder="Example Company" /></label>
            <label>Board name or URL<input value={boardToken} onChange={(event) => setBoardToken(event.target.value)} placeholder="company or https://boards.greenhouse.io/company" /></label>
            <button className="button secondary small" disabled={connecting} type="submit">{connecting ? <><RefreshCw className="spin" size={15} /> Connecting…</> : <><Globe2 size={15} /> Import public jobs</>}</button>
            <p className="connector-note"><ShieldCheck size={14} /> Discovery uses Greenhouse&apos;s official public job-board interface. Applications remain on the employer site.</p>
          </form>
        </div>
        {connectionError && <div className="connector-error" role="alert"><AlertCircle size={16} /> {connectionError}</div>}
      </section>}
      <div className="live-source-summary"><span className="source-badge live"><Globe2 size={14} /> {liveJobs} live</span><span className="source-badge mock"><Info size={14} /> {state.jobs.length - liveJobs} demonstration</span></div>
      <div className="filter-bar"><div className="search-field"><Search size={17} /><input aria-label="Search recommended jobs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search role or company" /></div><select aria-label="Filter by interview chance" value={chanceFilter} onChange={(event) => setChanceFilter(event.target.value)}><option>All fits</option><option>High</option><option>Medium</option><option>Low</option></select></div>
      <div className="jobs-layout">
        <div className="job-list" aria-label="Recommended jobs">
          <div className="list-count"><strong>{jobs.length} recommendations</strong><span>Sorted by fit</span></div>
          {jobs.map((job) => <JobListCard key={job.id} job={job} match={state.matches.find((item) => item.jobId === job.id)!} selected={selected === job.id} onClick={() => setSelected(job.id)} />)}
        </div>
        <JobDetail job={selectedJob} match={match} state={state} setState={setState} showToast={showToast} />
      </div>
    </>
  );
}

function JobListCard({ job, match, selected, onClick }: { job: JobPosting; match: JobMatch; selected: boolean; onClick: () => void }) {
  return <button className={selected ? "job-list-card selected" : "job-list-card"} onClick={onClick}><div className="job-list-top"><span className="company-monogram small">{job.company[0]}</span><div><strong>{job.title}</strong><p>{job.company}</p></div><span className={`chance ${match.interviewChance.toLowerCase()}`}>{match.interviewChance}</span></div><div className="job-meta"><span><Globe2 size={14} /> {job.location}</span><span><Laptop2 size={14} /> {job.remotePolicy}</span></div><div className="job-list-bottom"><span className={match.decision === "Apply" ? "decision apply" : "decision skip"}>{match.decision}</span><span>{job.salaryLow ? `SGD ${job.salaryLow.toLocaleString()}–${job.salaryHigh?.toLocaleString()}` : "Salary not listed"}</span></div></button>;
}

function JobDetail({ job, match, state, setState, showToast }: { job: JobPosting; match: JobMatch; state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; showToast: (message: string, tone?: "success" | "warning" | "neutral") => void }) {
  const existing = state.applications.find((app) => app.jobId === job.id);
  const externalUrl = job.sourceKind !== "mock" && isSafeEmployerUrl(job.canonicalUrl) ? job.canonicalUrl : undefined;
  const prepare = () => {
    if (match.decision === "Skip") return showToast("This employer explicitly refuses sponsorship, so preparation is blocked.", "warning");
    if (existing) return showToast("This job is already in your tracker", "neutral");
    setState((current) => ({ ...current, applications: [...current.applications, { id: crypto.randomUUID(), jobId: job.id, company: job.company, jobTitle: job.title, location: job.location, source: job.sourceLabel, requisitionId: job.requisitionId, resumeVersion: match.resumeVersion, status: "Needs Review", simulated: job.sourceKind === "mock", jobUrl: externalUrl }] }));
    showToast(job.sourceKind === "mock" ? "Truthful demonstration application prepared" : "Real employer handoff prepared for your review", "success");
  };
  return (
    <section className="job-detail panel">
      <div className="job-detail-head"><span className="company-monogram">{job.company[0]}</span><div><div className="title-with-badge"><h2>{job.title}</h2><span className={job.sourceKind === "mock" ? "source-badge mock" : "source-badge live"}>{job.sourceKind === "mock" ? "Demo" : "Public source"}</span></div><p>{job.company} · {job.location} · {job.employmentType}</p></div></div>
      <div className="verdict-card"><div><span className={match.decision === "Apply" ? "decision apply" : "decision skip"}>{match.decision}</span><p>{match.decision === "Apply" ? "No confirmed hard blocker found." : "A confirmed hard blocker was found."}</p></div><div className="chance-block"><span>Interview chance</span><strong className={match.interviewChance === "Medium" ? "medium-text" : match.interviewChance === "Low" ? "low-text" : "apply-text"}>{match.interviewChance}</strong><small>Uncalibrated band, not a statistical probability</small></div></div>
      <div className="match-factors">
        <FitFactor label="Seniority" value={match.seniorityFit} tone={match.seniorityFit.includes("weak") || match.seniorityFit.includes("Stretch") ? "warning" : "good"} />
        <FitFactor label="Salary" value={match.salaryFit} tone="good" />
        <FitFactor label="Visa" value={match.visaFit} tone={match.visaFit.includes("unavailable") ? "bad" : "neutral"} />
      </div>
      <div className="detail-section"><h3>Why this recommendation</h3><ul>{match.reasons.slice(0, 3).map((reason) => <li key={reason}><CheckCircle2 size={16} /> {reason}</li>)}</ul></div>
      {match.gaps.length > 0 && <div className="detail-section gaps"><h3>Evidence gaps</h3><div>{match.gaps.slice(0, 3).map((gap) => <span key={gap}>{gap}</span>)}</div></div>}
      <div className="career-change-note"><Sparkles size={17} /><p>{job.id === "job-marina" ? "You can apply. Estimated interview chance: Low. Transferable strengths: stakeholder management and analytics. Build evidence in experimentation and one product case study." : "Resume wording will use only confirmed, employer-approved evidence."}</p></div>
      <div className="job-detail-actions"><button className="button primary" disabled={Boolean(existing) || match.decision === "Skip"} onClick={prepare}>{existing ? "Already in tracker" : "Prepare for review"} <ArrowRight size={16} /></button>{externalUrl ? <a className="button secondary" href={externalUrl} target="_blank" rel="noreferrer">View official job <ExternalLink size={16} /></a> : <button className="button secondary" onClick={() => showToast("This is a demonstration job; no employer page is opened.")}>View source</button>}</div>
      <div className="feedback-row"><span>Was this recommendation useful?</span><button aria-label="Mark recommendation relevant" onClick={() => addFeedback(state, setState, "job", job.id, "Relevant", showToast)}><ThumbsUp size={15} /> Relevant</button><button aria-label="Mark recommendation not relevant" onClick={() => addFeedback(state, setState, "job", job.id, "Not Relevant", showToast)}><ThumbsDown size={15} /> Not relevant</button><button onClick={() => addFeedback(state, setState, "job", job.id, "Wrong Seniority", showToast)}>Wrong seniority</button></div>
    </section>
  );
}

function FitFactor({ label, value, tone }: { label: string; value: string; tone: "good" | "warning" | "bad" | "neutral" }) {
  return <div><span className={`factor-dot ${tone}`} /><p><span>{label}</span><strong>{value}</strong></p></div>;
}

function ApplicationsView({ state, setState, showToast }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; showToast: (message: string, tone?: "success" | "warning" | "neutral") => void }) {
  const [selected, setSelected] = useState(state.applications[0]?.id ?? "");
  const [filter, setFilter] = useState<"All" | ApplicationStatus>("All");
  const [confirmedApps, setConfirmedApps] = useState<string[]>([]);
  const [openedApps, setOpenedApps] = useState<string[]>([]);
  const [completedApps, setCompletedApps] = useState<string[]>([]);
  const application = state.applications.find((item) => item.id === selected) ?? state.applications[0];
  const applicationJob = application ? state.jobs.find((job) => job.id === application.jobId) : undefined;
  const employerUrl = application && isSafeEmployerUrl(application.jobUrl ?? applicationJob?.canonicalUrl ?? "") ? application.jobUrl ?? applicationJob?.canonicalUrl : undefined;
  const isExternal = Boolean(application && !application.simulated && employerUrl);
  const resumeReady = Boolean(state.resumeContent?.personalized);
  const confirmedEmployerEvidenceCount = state.evidence.filter((item) => item.confirmationStatus === "confirmed" && item.employerUse).length;
  const authorizationKnown = Boolean(state.workAuthorization.existingAuthorization && !/not confirmed/i.test(state.workAuthorization.existingAuthorization));
  const authorizationAnswer = authorizationKnown ? state.workAuthorization.existingAuthorization! : "Not confirmed - answer directly on the employer form";
  const visibleApplications = filter === "All" ? state.applications : state.applications.filter((item) => item.status === filter);
  const updateStatus = (id: string, status: ApplicationStatus) => setState((current) => ({ ...current, applications: current.applications.map((app) => app.id === id ? { ...app, status, applicationDate: status === "Submitted" ? new Date().toISOString().slice(0, 10) : app.applicationDate } : app) }));
  const simulateSubmission = () => {
    if (!application) return;
    if (state.schedule.paused) return showToast("Automation is paused. Resume it before submitting.", "warning");
    if (!confirmedApps.includes(application.id) && application.status !== "Submitted") return showToast("Confirm the earliest start date before submission", "warning");
    updateStatus(application.id, "Submitted");
    setState((current) => ({ ...current, auditEvents: [...current.auditEvents, { id: crypto.randomUUID(), userId: current.user.id, action: "application.simulated_submission", targetId: application.id, result: "allowed", model: "demo-structured-provider", promptVersion: "application-v1", evidenceIds: ["ev-impact", "ev-leadership", "ev-skills"], createdAt: new Date().toISOString() }] }));
    showToast("Simulated application submitted and added to the audit history", "success");
  };
  const recordExternalSubmission = () => {
    if (!application || !isExternal) return;
    if (!openedApps.includes(application.id)) return showToast("Open the official employer application first", "warning");
    if (!completedApps.includes(application.id)) return showToast("Confirm that you completed and sent the employer form", "warning");
    setState((current) => ({
      ...current,
      applications: current.applications.map((app) => app.id === application.id ? { ...app, status: "Submitted", applicationDate: new Date().toISOString().slice(0, 10), submittedByUser: true } : app),
      subscription: { ...current.subscription, usage: { ...current.subscription.usage, applications: current.subscription.usage.applications + (application.status === "Submitted" ? 0 : 1) } },
      auditEvents: [...current.auditEvents, { id: crypto.randomUUID(), userId: current.user.id, action: "application.user_confirmed_external_submission", targetId: application.id, result: "allowed", evidenceIds: [], createdAt: new Date().toISOString() }],
    }));
    showToast("Recorded as submitted after your confirmation", "success");
  };
  const exportTracker = () => {
    const rows = [["Company", "Job title", "Location", "Status", "Source", "Requisition ID", "Application date"], ...state.applications.map((item) => [item.company, item.jobTitle, item.location, item.status, item.source, item.requisitionId, item.applicationDate ?? ""])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "grounded-application-tracker.csv");
    showToast("Application tracker exported", "success");
  };
  return (
    <>
      <PageHeading eyebrow="Application tracker" title="Every application, one honest record" detail="Real applications open on the employer’s official site. Grounded records Submitted only after you confirm sending it." action={<button className="button secondary" onClick={exportTracker}><Download size={16} /> Export tracker</button>} />
      <div className="status-tabs">{(["All", "Needs Review", "Submitted", "Interview", "Offer"] as const).map((status) => <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>{status} <span>{status === "All" ? state.applications.length : state.applications.filter((app) => app.status === status).length}</span></button>)}</div>
      {state.applications.length === 0 ? <EmptyState icon={BriefcaseBusiness} title="No applications yet" detail="Prepare a recommended job and it will appear here." /> : <div className="applications-layout">
        <div className="application-table-wrap panel"><table className="application-table"><thead><tr><th>Role</th><th>Status</th><th>Visa</th><th>Updated</th></tr></thead><tbody>{visibleApplications.map((app) => { const job = state.jobs.find((item) => item.id === app.jobId); return <tr key={app.id} className={selected === app.id ? "selected" : ""} onClick={() => setSelected(app.id)}><td><strong>{app.jobTitle}</strong><span>{app.company} · {app.location}</span></td><td><span className={`status-pill ${app.status.toLowerCase().replace(" ", "-")}`}>{app.status}</span></td><td>{job?.visaFit ?? "Unknown"}</td><td>{app.applicationDate ?? "Today"}</td></tr>; })}</tbody></table>{visibleApplications.length === 0 && <div className="table-empty">No applications with this status.</div>}</div>
        {application && <section className="application-detail panel">
          <div className="panel-header"><div><span className="eyebrow">Prepared application</span><h2>{application.jobTitle}</h2><p>{application.company} · {application.requisitionId}</p></div><span className={isExternal ? "source-badge live" : "source-badge mock"}>{isExternal ? "Employer site" : "Simulated"}</span></div>
          {isExternal ? <>
            {!resumeReady ? <div className="status-banner warning personal-data-warning"><AlertCircle size={18} /><div><strong>Your personal profile is not connected yet</strong><span>Use your own truthful résumé and answers on the employer form. Grounded will not prefill or send the demonstration profile.</span></div></div> : confirmedEmployerEvidenceCount === 0 ? <div className="status-banner warning personal-data-warning"><AlertCircle size={18} /><div><strong>No résumé evidence is approved for employer use</strong><span>Confirm the relevant evidence and enable Employer permission before relying on prepared wording.</span></div></div> : <div className="status-banner neutral personal-data-warning"><ShieldCheck size={18} /><div><strong>Your personal résumé is connected</strong><span>Review every employer field before submission. Grounded never presses the final submit button.</span></div></div>}
            <div className="application-checklist"><CheckItem label="Resume" value={state.resumeContent?.sourceFile ?? "Your real resume is required"} verified={resumeReady && confirmedEmployerEvidenceCount > 0} /><CheckItem label="Work authorization" value={authorizationAnswer} verified={authorizationKnown} /><CheckItem label="Current salary" value={state.salaryProfile.amount > 0 ? `Private ${state.salaryProfile.currency} ${state.salaryProfile.amount.toLocaleString()} / ${state.salaryProfile.period}` : "Not provided - private by default"} verified={state.salaryProfile.amount > 0} /><CheckItem label="Destination" value="Official employer application page" /></div>
            <div className="external-handoff">
              <div><span className="eyebrow">Real application handoff</span><h3>Finish securely on the employer’s website</h3><p>Grounded opens the official form. You review every field, handle any assessment or captcha yourself, and press the employer’s final submit button.</p></div>
              <a className="button primary" href={employerUrl} target="_blank" rel="noreferrer" onClick={() => setOpenedApps((items) => items.includes(application.id) ? items : [...items, application.id])}>Open official application <ExternalLink size={16} /></a>
              <label className={openedApps.includes(application.id) ? "submission-confirmation" : "submission-confirmation disabled"}><input type="checkbox" disabled={!openedApps.includes(application.id) || application.status === "Submitted"} checked={completedApps.includes(application.id) || application.status === "Submitted"} onChange={(event) => setCompletedApps((items) => event.target.checked ? [...items.filter((id) => id !== application.id), application.id] : items.filter((id) => id !== application.id))} /><span><strong>I completed and sent the employer form</strong><small>Check this only after the employer shows a success or confirmation page.</small></span></label>
              <button className="button secondary" disabled={application.status === "Submitted" || !completedApps.includes(application.id)} onClick={recordExternalSubmission}>{application.status === "Submitted" ? "Recorded as submitted" : "Record as Submitted"} <CheckCircle2 size={16} /></button>
            </div>
            <div className="application-detail-actions"><button className="button ghost" onClick={() => updateStatus(application.id, "Withdrawn")}>Withdraw from tracker</button></div>
            <p className="fine-print"><ShieldCheck size={14} /> Grounded does not bypass captchas, assessments, identity checks, or employer consent screens.</p>
          </> : <>
            <div className="application-checklist"><CheckItem label="Resume" value={application.resumeVersion} /><CheckItem label="Work authorization" value="Malaysian citizen requiring employer-sponsored Singapore work authorization." /><CheckItem label="Salary answer" value="Expected base salary: SGD 7,500–8,500 per month. Current salary not disclosed." /><CheckItem label="Notice period" value="30 days" /><CheckItem label="Relocation" value="Willing to relocate to Singapore" /></div>
            {confirmedApps.includes(application.id) || application.status === "Submitted" ? <div className="confirmed-answer"><CheckCircle2 size={17} /><div><strong>Earliest start date confirmed</strong><span>1 September 2026</span></div></div> : <div className="missing-answer"><AlertCircle size={17} /><div><strong>One answer needs confirmation</strong><span>May we share your earliest start date as 1 September 2026?</span></div><button onClick={() => { setConfirmedApps((items) => [...items, application.id]); showToast("Earliest start date confirmed", "success"); }}>Confirm</button></div>}
            <div className="application-detail-actions"><button className="button primary" disabled={application.status === "Submitted" || !confirmedApps.includes(application.id)} onClick={simulateSubmission}>{application.status === "Submitted" ? "Simulated submission complete" : "Approve & simulate submission"} <Send size={16} /></button><button className="button ghost" onClick={() => updateStatus(application.id, "Withdrawn")}>Withdraw</button></div>
            <p className="fine-print"><ShieldCheck size={14} /> This demonstration does not contact a real employer.</p>
          </>}
        </section>}
      </div>}
    </>
  );
}

function CheckItem({ label, value, verified = true }: { label: string; value: string; verified?: boolean }) {
  return <div>{verified ? <CheckCircle2 size={17} /> : <AlertCircle size={17} className="amber-icon" />}<p><span>{label}</span><strong>{value}</strong></p><span className={verified ? "verified-label" : "review-label"}>{verified ? "Confirmed" : "Review"}</span></div>;
}

function ResumeView({ state, setState, showToast }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; showToast: (message: string, tone?: "success" | "warning" | "neutral") => void }) {
  const [tab, setTab] = useState<"preview" | "changes" | "defense">("preview");
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const profile = state.resumeContent ?? initialAppState.resumeContent!;
  const acceptedChanges = state.resumeChanges.filter((change) => change.status === "accepted").length;
  const updateChange = (id: string, status: ResumeChange["status"]) => setState((current) => ({ ...current, resumeChanges: current.resumeChanges.map((change) => change.id === id ? { ...change, status } : change) }));
  const contactLine = [profile.location, profile.relocation, profile.phone, profile.email, profile.linkedIn].filter(Boolean).join(" | ");
  const fileBase = `${profile.name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "")}_Master_Resume`;

  const downloadDocx = async () => {
    setExporting("docx");
    try {
      const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
      const children = [
        new Paragraph({ children: [new TextRun({ text: profile.name, bold: true, size: 34 })] }),
        new Paragraph({ children: [new TextRun({ text: profile.professionalTitle, bold: true, color: "176B50" })] }),
        new Paragraph(contactLine),
        new Paragraph({ text: "PROFILE", heading: HeadingLevel.HEADING_2 }),
        new Paragraph(profile.summary),
        new Paragraph({ text: "CORE CAPABILITIES", heading: HeadingLevel.HEADING_2 }),
        ...profile.capabilityGroups.map((group) => new Paragraph({ children: [new TextRun({ text: `${group.label}: `, bold: true }), new TextRun(group.items.join(" | "))] })),
        new Paragraph({ text: "PROFESSIONAL EXPERIENCE", heading: HeadingLevel.HEADING_2 }),
      ];
      for (const experience of profile.experiences) {
        children.push(new Paragraph({ children: [new TextRun({ text: `${experience.title} - ${experience.company}`, bold: true }), new TextRun({ text: `  ${experience.startDate} - ${experience.endDate}`, italics: true })] }));
        for (const bullet of experience.bullets) children.push(new Paragraph({ text: bullet, bullet: { level: 0 } }));
      }
      if (profile.projects.length) {
        children.push(new Paragraph({ text: "SELECTED PROJECTS", heading: HeadingLevel.HEADING_2 }));
        profile.projects.forEach((project) => children.push(new Paragraph({ text: project, bullet: { level: 0 } })));
      }
      if (profile.earlierExperience.length) children.push(new Paragraph({ text: "EARLIER EXPERIENCE", heading: HeadingLevel.HEADING_2 }), ...profile.earlierExperience.map((item) => new Paragraph(item)));
      if (profile.education.length) children.push(new Paragraph({ text: "EDUCATION", heading: HeadingLevel.HEADING_2 }), ...profile.education.map((item) => new Paragraph(item)));
      if (profile.certifications.length) children.push(new Paragraph({ text: "CERTIFICATIONS", heading: HeadingLevel.HEADING_2 }), new Paragraph(profile.certifications.join(" | ")));
      if (profile.awards.length) children.push(new Paragraph({ text: "AWARDS", heading: HeadingLevel.HEADING_2 }), new Paragraph(profile.awards.join(" | ")));
      if (profile.languages.length) children.push(new Paragraph({ text: "LANGUAGES", heading: HeadingLevel.HEADING_2 }), new Paragraph(profile.languages.join(" | ")));
      const doc = new Document({ sections: [{ children }] });
      downloadBlob(await Packer.toBlob(doc), `${fileBase}.docx`);
      showToast("DOCX resume downloaded", "success");
    } finally {
      setExporting(null);
    }
  };

  const downloadPdf = async () => {
    setExporting("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      const width = 500;
      let y = 52;
      const ensure = (height: number) => { if (y + height > 790) { pdf.addPage(); y = 48; } };
      const write = (value: string, size = 9, bold = false, indent = 0) => {
        const lines = pdf.splitTextToSize(pdfSafeText(value), width - indent);
        const height = lines.length * (size + 3);
        ensure(height + 4);
        pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size); pdf.text(lines, margin + indent, y); y += height + 4;
      };
      const heading = (value: string) => { y += 7; ensure(22); pdf.setTextColor(23, 107, 80); write(value.toUpperCase(), 10, true); pdf.setTextColor(22, 32, 29); };
      write(profile.name, 20, true); write(profile.professionalTitle, 11, true); write(contactLine, 8); heading("Profile"); write(profile.summary, 9);
      heading("Core capabilities"); profile.capabilityGroups.forEach((group) => write(`${group.label}: ${group.items.join(" | ")}`, 8.5));
      heading("Professional experience");
      profile.experiences.forEach((experience) => { write(`${experience.title} - ${experience.company} | ${experience.startDate} - ${experience.endDate}`, 9.5, true); experience.bullets.forEach((bullet) => write(`- ${bullet}`, 8.5, false, 8)); });
      if (profile.projects.length) { heading("Selected projects"); profile.projects.forEach((project) => write(`- ${project}`, 8.5, false, 8)); }
      if (profile.earlierExperience.length) { heading("Earlier experience"); profile.earlierExperience.forEach((item) => write(item, 8.5)); }
      if (profile.education.length) { heading("Education"); profile.education.forEach((item) => write(item, 8.5)); }
      if (profile.certifications.length) { heading("Certifications"); write(profile.certifications.join(" | "), 8.5); }
      if (profile.awards.length) { heading("Awards"); write(profile.awards.join(" | "), 8.5); }
      if (profile.languages.length) { heading("Languages"); write(profile.languages.join(" | "), 8.5); }
      pdf.save(`${fileBase}.pdf`);
      showToast("PDF resume downloaded", "success");
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <PageHeading eyebrow="Truthful resume studio" title={`${profile.name} · Master Resume`} detail={profile.personalized ? `Imported from ${profile.sourceFile}. Confirm the evidence ledger before employer use.` : "Demonstration resume. Connect your own resume before real use."} action={<div className="split-download"><button className="button secondary" disabled={Boolean(exporting)} onClick={downloadPdf}><Download size={16} /> {exporting === "pdf" ? "Building PDF…" : "PDF"}</button><button className="button primary" disabled={Boolean(exporting)} onClick={downloadDocx}><Download size={16} /> {exporting === "docx" ? "Building DOCX…" : "DOCX"}</button></div>} />
      <div className="resume-tabs"><button className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>Side-by-side preview</button><button className={tab === "changes" ? "active" : ""} onClick={() => setTab("changes")}>Changes <span>{state.resumeChanges.length}</span></button><button className={tab === "defense" ? "active" : ""} onClick={() => setTab("defense")}>Interview defense <span>{state.defenseCards.length}</span></button></div>
      {tab === "preview" && <div className="resume-compare"><ResumePaper profile={profile} label="Imported source" /><ResumePaper profile={profile} label={profile.personalized ? "Working master" : "Demonstration version"} /><div className="compare-key"><span><i className="removed" /> No removed claims</span><span><i className="added" /> Only confirmed changes will appear</span></div></div>}
      {tab === "changes" && (state.resumeChanges.length === 0 ? <EmptyState icon={FileCheck2} title="No job-specific changes yet" detail="Add a real job first. Grounded will propose only source-backed wording for your review." /> : <div className="changes-layout"><div className="changes-summary panel"><span className="eyebrow">Review progress</span><strong>{acceptedChanges} of {state.resumeChanges.length} accepted</strong><div className="quota-track"><span style={{ width: `${(acceptedChanges / state.resumeChanges.length) * 100}%` }} /></div><p>Reject anything that is untrue, generic, or hard to explain.</p></div><div className="change-list">{state.resumeChanges.map((change) => <article className="change-card panel" key={change.id}><div className="change-head"><span className="source-badge evidence">Evidence-backed</span><span>{change.status === "pending" ? "Awaiting review" : change.status}</span></div><div className="diff-block"><div><span>Original</span><p>{change.original}</p></div><ArrowRight size={17} /><div className="tailored"><span>Tailored</span><p>{change.tailored}</p></div></div><div className="change-reason"><Info size={15} /><p><strong>Why:</strong> {change.reason}<br /><span>Evidence: {change.evidenceIds.map((id) => state.evidence.find((item) => item.id === id)?.source).filter(Boolean).join(" · ")}</span></p></div><div className="change-actions"><button className={change.status === "accepted" ? "active" : ""} onClick={() => updateChange(change.id, "accepted")}><Check size={15} /> Accept</button><button onClick={() => updateChange(change.id, "rejected")}><X size={15} /> Reject</button><button onClick={() => updateChange(change.id, "not-true")}><AlertCircle size={15} /> Not true</button><button onClick={() => addFeedback(state, setState, "resume", change.id, "Sounds Like AI", showToast)}>Sounds like AI</button></div></article>)}</div></div>)}
      {tab === "defense" && <div className="defense-layout"><div className="status-banner neutral"><MessageSquareText size={18} /><div><strong>Only keep claims you can defend</strong><span>If you cannot explain a statement in detail, remove it from the resume.</span></div></div>{state.defenseCards.map((card) => <article className="defense-card panel" key={card.id}><div className="panel-header"><div><span className="eyebrow">Resume statement</span><h2>{card.statement}</h2></div><span className="confidence high">Resume source</span></div><div className="defense-grid"><div><span>Situation</span><p>{card.situation}</p></div><div><span>Your responsibility</span><p>{card.responsibility}</p></div><div><span>Actions</span><p>{card.actions}</p></div><div><span>Tools</span><p>{card.tools}</p></div><div><span>Result</span><p>{card.result}</p></div><div><span>Likely follow-up</span><p>{card.likelyQuestion}</p></div></div><div className="defense-source"><FileCheck2 size={16} /> {card.evidenceSource}</div><label className="confidence-check"><input type="checkbox" checked={card.userCanExplain} onChange={(event) => setState((current) => ({ ...current, defenseCards: current.defenseCards.map((item) => item.id === card.id ? { ...item, userCanExplain: event.target.checked } : item) }))} /> I can confidently explain this in an interview</label></article>)}</div>}
    </>
  );
}

function pdfSafeText(value: string) {
  return value.replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/·/g, "|");
}

function ResumePaper({ profile, label }: { profile: ResumeContent; label: string }) {
  const contact = [profile.location, profile.relocation, profile.phone, profile.email].filter(Boolean).join(" · ");
  return <article className="resume-paper"><div className="paper-label"><span>{label}</span><em>{profile.sourceFile}</em></div><div className="resume-name">{profile.name}</div><div className="resume-role">{profile.professionalTitle}</div><div className="resume-contact">{contact}</div><section><h3>Profile</h3><p>{profile.summary}</p></section><section><h3>Core Capabilities</h3>{profile.capabilityGroups.map((group) => <p key={group.label}><strong>{group.label}:</strong> {group.items.join(" · ")}</p>)}</section><section><h3>Professional Experience</h3>{profile.experiences.map((experience) => <div key={`${experience.company}-${experience.title}`}><h4>{experience.title} · {experience.company} <span>{experience.startDate}–{experience.endDate}</span></h4>{experience.context && <p>{experience.context}</p>}<ul>{experience.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div>)}</section>{profile.projects.length > 0 && <section><h3>Selected Projects</h3><ul>{profile.projects.map((project) => <li key={project}>{project}</li>)}</ul></section>}{profile.earlierExperience.length > 0 && <section><h3>Earlier Experience</h3>{profile.earlierExperience.map((item) => <p key={item}>{item}</p>)}</section>}<section><h3>Education & Certifications</h3>{profile.education.map((item) => <p key={item}>{item}</p>)}{profile.certifications.length > 0 && <p><strong>Certifications:</strong> {profile.certifications.join(" · ")}</p>}</section>{profile.awards.length > 0 && <section><h3>Awards</h3><p>{profile.awards.join(" · ")}</p></section>}{profile.languages.length > 0 && <section><h3>Languages</h3><p>{profile.languages.join(" · ")}</p></section>}</article>;
}

function ApplicationFactsCard({ state, setState, showToast }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; showToast: (message: string, tone?: "success" | "warning" | "neutral") => void }) {
  const source = state.resumeContent?.sourceFile;
  const unconfirmedResumeFacts = state.evidence.filter((item) => item.source === source && item.confirmationStatus !== "confirmed").length;
  const confirmResumeFacts = () => {
    if (!source || !window.confirm(`Confirm that the facts extracted from ${source} are current and accurate? Employer-use permission will remain off.`)) return;
    setState((current) => ({
      ...current,
      evidence: current.evidence.map((item) => item.source === source
        ? { ...item, confirmationStatus: "confirmed", classification: "Confirmed fact", resumeUse: true }
        : item),
    }));
    showToast("Resume facts confirmed. Employer permission remains under your control.", "success");
  };
  return (
    <section className="panel application-facts">
      <div className="panel-header">
        <div><span className="eyebrow">Required application facts</span><h2>Complete once, review before every employer</h2><p>Grounded uses these private answers to prepare forms. It never sends them without your final review.</p></div>
        {unconfirmedResumeFacts > 0 && <button className="button secondary small" onClick={confirmResumeFacts}><BadgeCheck size={16} /> Confirm {unconfirmedResumeFacts} résumé facts</button>}
      </div>
      <div className="application-facts-grid">
        <label>Current work authorization<input value={state.workAuthorization.existingAuthorization ?? ""} onChange={(event) => setState((current) => ({ ...current, workAuthorization: { ...current.workAuthorization, existingAuthorization: event.target.value || undefined } }))} placeholder="Example: Authorized to work in Malaysia" /></label>
        <label>Sponsorship needed<select value={state.workAuthorization.requiresSponsorship === null ? "unknown" : state.workAuthorization.requiresSponsorship ? "yes" : "no"} onChange={(event) => setState((current) => ({ ...current, preferences: { ...current.preferences, requiresSponsorship: event.target.value === "unknown" ? null : event.target.value === "yes" }, workAuthorization: { ...current.workAuthorization, requiresSponsorship: event.target.value === "unknown" ? null : event.target.value === "yes" } }))}><option value="unknown">Not confirmed</option><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label>Notice period<input value={state.workAuthorization.noticePeriod ?? ""} onChange={(event) => setState((current) => ({ ...current, workAuthorization: { ...current.workAuthorization, noticePeriod: event.target.value || undefined } }))} placeholder="Example: 30 days" /></label>
        <label>Current salary <small>Optional and private</small><div className="fact-input-cluster"><select aria-label="Salary currency" value={state.salaryProfile.currency} onChange={(event) => setState((current) => ({ ...current, salaryProfile: { ...current.salaryProfile, currency: event.target.value } }))}><option>MYR</option><option>SGD</option><option>USD</option><option>GBP</option></select><input aria-label="Current salary amount" type="number" min="0" value={state.salaryProfile.amount || ""} onChange={(event) => setState((current) => ({ ...current, salaryProfile: { ...current.salaryProfile, amount: Number(event.target.value) } }))} placeholder="Leave blank" /></div></label>
      </div>
      <label className="consent-row compact"><input type="checkbox" checked={state.workAuthorization.willingToRelocate} onChange={(event) => setState((current) => ({ ...current, workAuthorization: { ...current.workAuthorization, willingToRelocate: event.target.checked } }))} /><span><strong>I am willing to relocate to my target country</strong><small>This records your preference; it does not claim visa approval.</small></span></label>
    </section>
  );
}

function ProfileView({ state, setState, showToast }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; showToast: (message: string, tone?: "success" | "warning" | "neutral") => void }) {
  const [tab, setTab] = useState<"evidence" | "privacy" | "ai">("evidence");
  const [key, setKey] = useState("");
  const [providerStatus, setProviderStatus] = useState("");
  const conflicts = state.evidence.filter((item) => item.confirmationStatus === "conflict");
  const targetCountries = state.preferences.countries.length ? state.preferences.countries.join(", ") : "Target country not set";
  const workAuthorizationKnown = Boolean(state.workAuthorization.existingAuthorization && !/not confirmed/i.test(state.workAuthorization.existingAuthorization));
  const sponsorshipLabel = state.workAuthorization.requiresSponsorship === null ? "Not confirmed" : state.workAuthorization.requiresSponsorship ? "Required" : "Not required";
  const salaryLabel = state.salaryProfile.amount > 0 ? `${state.salaryProfile.currency} ${state.salaryProfile.amount.toLocaleString()} / ${state.salaryProfile.period}` : "Not provided";
  const resolveConflict = (chosenId: string) => {
    setState((current) => ({ ...current, evidence: current.evidence.map((item) => conflicts.some((conflict) => conflict.id === item.id) ? { ...item, confirmationStatus: item.id === chosenId ? "confirmed" : "unconfirmed", classification: item.id === chosenId ? "Confirmed fact" : "Outdated information", resumeUse: item.id === chosenId, employerUse: item.id === chosenId } : item) }));
    showToast("Conflict resolved. The other version was retained as outdated evidence.", "success");
  };
  const confirmEvidence = (id: string) => {
    setState((current) => ({ ...current, evidence: current.evidence.map((item) => item.id === id ? { ...item, confirmationStatus: "confirmed", classification: "Confirmed fact", resumeUse: true } : item) }));
    showToast("Evidence confirmed. Employer use remains off until you enable it.", "success");
  };
  const deleteConversations = () => {
    setState((current) => ({ ...current, conversations: current.conversations.map((conversation) => ({ ...conversation, status: "deleted" as const })), evidence: current.evidence.filter((item) => !item.source.includes("Conversation")) }));
    showToast("Imported conversation index deleted. Original local files were untouched.", "success");
  };
  const exportData = () => {
    downloadBlob(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }), "grounded-career-data.json");
    showToast("Career data exported", "success");
  };
  const deleteAccountData = async () => {
    if (!window.confirm("Delete all Grounded account data? Original local files will not be touched.")) return;
    await fetch("/api/state", { method: "DELETE" });
    const reset = cloneInitialState();
    reset.onboardingComplete = false;
    setState(reset);
    showToast("Account data deleted. Original local files were untouched.", "success");
  };
  const saveKey = async () => {
    setProviderStatus("Saving securely…");
    const response = await fetch("/api/byok", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "OpenAI-compatible API", credential: key }) });
    const payload = await response.json() as { error?: string; masked?: string };
    if (!response.ok) setProviderStatus(payload.error ?? "Secure storage unavailable");
    else { setProviderStatus(`Saved as ${payload.masked}`); setKey(""); }
  };
  return (
    <>
      <PageHeading eyebrow="Evidence & privacy" title="Your career profile" detail="Inspect every fact, source, permission, and unresolved conflict." action={<button className="button secondary" onClick={exportData}><Download size={16} /> Export my data</button>} />
      <div className="profile-summary panel"><div className="profile-avatar">{initials(state.user.displayName)}</div><div><h2>{state.user.displayName}</h2><p>{state.careerProfile.headline}</p><div className="profile-chips">{state.personalData.currentCountry && <span>{state.personalData.currentCountry}</span>}{state.personalData.yearsExperience !== undefined && <span>{state.personalData.yearsExperience}+ years experience</span>}<span>{targetCountries} target</span></div></div><div className="profile-completeness"><strong>{state.careerProfile.completeness}%</strong><span>Evidence complete</span></div></div>
      <div className="profile-tabs"><button className={tab === "evidence" ? "active" : ""} onClick={() => setTab("evidence")}>Evidence</button><button className={tab === "privacy" ? "active" : ""} onClick={() => setTab("privacy")}>Privacy & consent</button><button className={tab === "ai" ? "active" : ""} onClick={() => setTab("ai")}>AI provider</button></div>
      {tab === "evidence" && <ApplicationFactsCard state={state} setState={setState} showToast={showToast} />}
      {tab === "evidence" && <div className="profile-content"><div className="profile-main">{conflicts.length > 0 && <section className="panel"><div className="panel-header"><div><span className="eyebrow">Conflict requiring confirmation</span><h2>We found different versions of the same fact.</h2></div><AlertCircle className="amber-icon" size={22} /></div><div className="conflict-options">{conflicts.map((item) => <button key={item.id} onClick={() => resolveConflict(item.id)}><span className="conflict-year">{item.claim.match(/20\d{2}/)?.[0] ?? "?"}</span><div><strong>{item.source}</strong><span>{item.reference}</span></div><ChevronRight size={17} /></button>)}</div></section>}<section className="panel evidence-section"><div className="panel-header"><div><span className="eyebrow">Evidence ledger</span><h2>{state.evidence.length} extracted facts</h2></div><span className="source-badge evidence">{state.evidence.filter((item) => item.confirmationStatus === "confirmed").length} confirmed</span></div><div className="evidence-table">{state.evidence.map((item) => <article key={item.id}><div className="evidence-main"><span className={`classification ${item.classification.toLowerCase().replaceAll(" ", "-")}`}>{item.classification}</span><strong>{item.claim}</strong><p><FileText size={13} /> {item.source} · {item.reference}</p></div><div className="evidence-permissions"><span className={`confidence ${item.confidence.toLowerCase()}`}>{item.confidence}</span>{item.confirmationStatus !== "confirmed" && <button className="evidence-confirm" onClick={() => confirmEvidence(item.id)}>Confirm</button>}<label title="May use in resume"><input type="checkbox" checked={item.resumeUse} onChange={(event) => setState((current) => ({ ...current, evidence: current.evidence.map((entry) => entry.id === item.id ? { ...entry, resumeUse: event.target.checked } : entry) }))} /> Resume</label><label title={item.confirmationStatus === "confirmed" ? "May submit to an employer" : "Confirm this fact before employer use"}><input type="checkbox" disabled={item.confirmationStatus !== "confirmed"} checked={item.employerUse} onChange={(event) => setState((current) => ({ ...current, evidence: current.evidence.map((entry) => entry.id === item.id ? { ...entry, employerUse: event.target.checked } : entry) }))} /> Employer</label></div></article>)}</div></section></div><aside className="profile-aside"><section className="panel"><span className="eyebrow">Work authorization</span><h3>{targetCountries}</h3><p>{workAuthorizationKnown ? state.workAuthorization.existingAuthorization : "Nationality and work authorization are not confirmed in the imported resume."}</p><div className="fact-row"><span>Sponsorship</span><strong>{sponsorshipLabel}</strong></div><div className="fact-row"><span>Relocation</span><strong>{state.workAuthorization.willingToRelocate ? state.resumeContent?.relocation ?? "Yes" : "Not confirmed"}</strong></div><div className="fact-row"><span>Notice</span><strong>{state.workAuthorization.noticePeriod ?? "Not confirmed"}</strong></div><p className="fine-print">No visa approval or work authorization is inferred from your résumé.</p></section><section className="panel"><span className="eyebrow">Salary privacy</span><h3>{salaryLabel}</h3><p>Current salary is private and will not be sent to employers without confirmation.</p><span className="privacy-pill"><LockKeyhole size={14} /> Private</span></section></aside></div>}
      {tab === "privacy" && <div className="privacy-settings"><section className="panel"><div className="panel-header"><div><span className="eyebrow">Consent controls</span><h2>Separate choices, always reversible</h2></div><ShieldCheck size={22} /></div>{state.consents.map((consent) => <label className="setting-row" key={consent.id}><div><strong>{consent.type === "personal-analytics" ? "Personal career analytics" : consent.type === "anonymous-product-analytics" ? "Anonymous product analytics" : "Document analysis"}</strong><span>{consent.type === "anonymous-product-analytics" ? "Help improve the product with anonymized usage. Off by default." : consent.type === "document-analysis" ? "Analyze only files you explicitly authorize." : "Use your outcomes to improve recommendations for you."}</span></div><input type="checkbox" checked={consent.granted} onChange={(event) => setState((current) => ({ ...current, consents: current.consents.map((item) => item.id === consent.id ? { ...item, granted: event.target.checked, recordedAt: new Date().toISOString() } : item) }))} /></label>)}</section><section className="panel danger-zone"><span className="eyebrow">Data controls</span><h2>Export, correct, or delete</h2><div className="data-actions"><button onClick={exportData}><Download size={17} /><span><strong>Export all data</strong><small>Download profile, evidence, applications, and audit history.</small></span><ChevronRight size={17} /></button><button onClick={deleteConversations}><Trash2 size={17} /><span><strong>Delete imported conversations</strong><small>Remove conversation indexes and extracted private claims. Originals stay untouched.</small></span><ChevronRight size={17} /></button><button className="danger" onClick={deleteAccountData}><Trash2 size={17} /><span><strong>Delete account data</strong><small>Permanent after this final confirmation step.</small></span><ChevronRight size={17} /></button></div></section></div>}
      {tab === "ai" && <div className="ai-settings"><section className="panel"><div className="panel-header"><div><span className="eyebrow">Bring Your Own AI</span><h2>Use your supported API account</h2></div><KeyRound size={22} /></div><div className="provider-options"><label className="provider-option active"><input type="radio" defaultChecked name="provider" /><span><strong>Limited platform-provided AI</strong><small>Available in this demonstration. Structured, evidence-linked outputs.</small></span><em>Selected</em></label><label className="provider-option"><input type="radio" name="provider" /><span><strong>Your supported API account</strong><small>Requires secure server-side credential storage. A consumer chat subscription does not include API usage.</small></span></label><label className="provider-option disabled"><input type="radio" disabled name="provider" /><span><strong>Local model</strong><small>Planned. Not available in this MVP.</small></span><em>Future</em></label></div><div className="key-form"><label>API credential<input type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Stored encrypted; never shown again" /></label><label>Monthly spending limit<div className="input-cluster"><span>US$</span><input type="number" defaultValue="10" min="1" /></div></label><button className="button secondary" disabled={key.length < 8} onClick={saveKey}><LockKeyhole size={16} /> Encrypt & save</button>{providerStatus && <p className="provider-status">{providerStatus}</p>}</div><div className="safety-summary"><ShieldCheck size={19} /><p>Credentials are encrypted server-side, never placed in client code, never logged, and can be deleted immediately. Configure <code>CREDENTIAL_ENCRYPTION_KEY</code> before enabling this option.</p></div></section></div>}
    </>
  );
}

function AdminView({ state }: { state: AppState }) {
  const cards = [{ label: "Total users", value: "1,284", delta: "+8.2%" }, { label: "Activated users", value: "61%", delta: "+3.1%" }, { label: "Free to paid", value: "4.7%", delta: "+0.6%" }, { label: "Applications prepared", value: "18,420", delta: "+12.4%" }, { label: "Interviews reported", value: "846", delta: "+5.9%" }, { label: "Offers reported", value: "137", delta: "+2.8%" }];
  return <><PageHeading eyebrow="Admin · Aggregated demo" title="Product health, without personal detail" detail="All figures below are seeded, anonymized demonstration data." /><div className="admin-grid">{cards.map((card) => <article className="metric-card" key={card.label}><span>{card.label}</span><strong>{card.value}</strong><p className="positive-delta">{card.delta} this month</p></article>)}</div><div className="admin-layout"><section className="panel admin-chart"><div className="panel-header"><div><span className="eyebrow">Outcome funnel</span><h2>Applications to offers</h2></div><span className="source-badge demo">Demo data</span></div><div className="funnel"><div style={{ width: "100%" }}><span>Submitted</span><strong>12,640</strong></div><div style={{ width: "73%" }}><span>Recruiter response</span><strong>2,418</strong></div><div style={{ width: "51%" }}><span>Interview</span><strong>846</strong></div><div style={{ width: "28%" }}><span>Offer</span><strong>137</strong></div></div></section><section className="panel"><span className="eyebrow">Costs</span><h2>Monthly operating view</h2><div className="cost-row"><span>AI cost</span><strong>US$1,842</strong></div><div className="cost-row"><span>Infrastructure</span><strong>US$612</strong></div><div className="cost-row"><span>Cost / activated user</span><strong>US$0.94</strong></div><div className="cost-row"><span>Demo account audit events</span><strong>{state.auditEvents.length}</strong></div></section></div><div className="admin-layout"><section className="panel"><span className="eyebrow">Common rejected recommendations</span><ul className="ranked-list"><li><span>1</span><p><strong>Wrong location</strong><small>31% of negative feedback</small></p></li><li><span>2</span><p><strong>Wrong seniority</strong><small>24% of negative feedback</small></p></li><li><span>3</span><p><strong>Visa concern</strong><small>18% of negative feedback</small></p></li></ul></section><section className="panel"><span className="eyebrow">Common career gaps</span><div className="tag-cloud"><span>Direct product ownership</span><span>Cloud depth</span><span>People management</span><span>Commercial ownership</span><span>Experimentation</span><span>Local work authorization</span></div></section></div></>;
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof BriefcaseBusiness; title: string; detail: string }) {
  return <div className="empty-state panel"><span><Icon size={26} /></span><h2>{title}</h2><p>{detail}</p><strong>Open Jobs to prepare your first application.</strong></div>;
}

function addFeedback(state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>, type: "job" | "advice" | "resume", targetId: string, value: string, showToast: (message: string, tone?: "success" | "warning" | "neutral") => void) {
  if (state.feedback.some((item) => item.targetId === targetId && item.value === value)) return showToast("You already shared this feedback");
  setState((current) => ({ ...current, feedback: [...current.feedback, { id: crypto.randomUUID(), userId: current.user.id, targetType: type, targetId, value, createdAt: new Date().toISOString() }] }));
  showToast("Feedback saved for your future recommendations", "success");
}

function toggleArray<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
