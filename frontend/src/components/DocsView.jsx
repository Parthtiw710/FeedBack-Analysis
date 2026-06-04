import React, { useState } from 'react';
import { 
  Terminal, 
  Code, 
  Copy, 
  Check, 
  FileText, 
  Cpu, 
  Zap, 
  RefreshCw, 
  Package, 
  Bot, 
  BarChart3, 
  Star, 
  Activity, 
  Info,
  Layers,
  ChevronRight,
  Search,
  Sparkles,
  HelpCircle,
  Bug,
  LogOut,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  Award,
  FlaskConical,
  Coins,
  BookOpen
} from 'lucide-react';

const codeSnippets = {
  script: `<script src="https://cdn.jsdelivr.net/gh/The-DOOM-710/form/form.js"></script>`,
  react: `import { useEffect, useRef } from "react"

declare global {
  interface Window {
    AcmeFormWidget: {
      mountForm: (
        el: HTMLElement,
        formType: string,
        style?: any
      ) => void
    }
  }
}

export default function AcmeForm({
  formType, style
}: { formType: string; style?: any }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    window.AcmeFormWidget?.mountForm(ref.current, formType, style)
  }, [formType])

  return <div ref={ref} />
}`,
  reactUse: `<AcmeForm formType="nps" />
<AcmeForm formType="supportTicket" />
<AcmeForm formType="churnSurvey" />`,
  nextjs: `import Script from "next/script"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="https://cdn.jsdelivr.net/gh/The-DOOM-710/form/form.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}`,
  html: `<!-- 1. Mount target -->
<div id="form-root"></div>

<!-- 2. Widget -->
<script src="https://cdn.jsdelivr.net/gh/The-DOOM-710/form/form.js"></script>

<!-- 3. Mount -->
<script>
  AcmeFormWidget.mountForm(
    document.getElementById("form-root"),
    "productFeedback"
  )
</script>`
};

const formTypes = [
  {
    id: "nps",
    title: "Net Promoter Score",
    iconKey: "nps",
    fields: "4 fields",
    trigger: "Post-interaction or monthly cadence",
    desc: "The gold-standard loyalty metric. Users score you 0–10 and explain why. The AI agent auto-segments responses into Detractors (0–6), Passives (7–8), and Promoters (9–10), then clusters open-text reasons to surface the dominant themes driving each bucket."
  },
  {
    id: "csat",
    title: "Customer Satisfaction Score",
    iconKey: "csat",
    fields: "7 fields",
    trigger: "Immediately after a support ticket closes",
    desc: "Captures moment-in-time satisfaction immediately after an interaction closes. Rates overall experience, resolution quality, response speed, and agent helpfulness as independent dimensions."
  },
  {
    id: "ces",
    title: "Customer Effort Score",
    iconKey: "ces",
    fields: "4 fields",
    trigger: "After task or workflow completion",
    desc: "Measures how easy it was to complete a task using the industry-standard 7-point Likert scale. A strong predictor of churn and repeat contact volume."
  },
  {
    id: "productFeedback",
    title: "Product Feedback",
    iconKey: "productFeedback",
    fields: "9 fields",
    trigger: "Contextually after key feature use",
    desc: "Mid-lifecycle structured feedback for engaged users. Surfaces feature gaps, UX friction, competitive risk, and value perception across multiple dimensions."
  },
  {
    id: "supportTicket",
    title: "Support Ticket",
    iconKey: "supportTicket",
    fields: "10 fields",
    trigger: "Customer-facing help & support surfaces",
    desc: "Full structured intake mapped to ITSM fields. Captures category, priority, title, description, steps to reproduce, impact scope, and environment."
  },
  {
    id: "bugReport",
    title: "Bug Report",
    iconKey: "bugReport",
    fields: "9 fields",
    trigger: "Error screens or 'Report a bug' button",
    desc: "Developer and power-user facing — more technical depth than a support ticket. Captures severity, component, reproduction steps, expected vs actual behaviour, frequency, and workaround status."
  },
  {
    id: "churnSurvey",
    title: "Churn / Cancellation Survey",
    iconKey: "churnSurvey",
    fields: "7 fields",
    trigger: "Account cancellation or plan downgrade",
    desc: "Triggered at cancellation or downgrade. Captures the primary churn reason, which competitor they're switching to, what feature was missing, and whether they'd return."
  },
  {
    id: "featureRequest",
    title: "Feature Request",
    iconKey: "featureRequest",
    fields: "7 fields",
    trigger: "In-product feedback button or widget",
    desc: "Structured intake that maps directly to product backlog fields. Forces users to articulate the underlying problem before proposing a solution — turning 'add this please' into an actionable backlog item."
  },
  {
    id: "onboardingFeedback",
    title: "Onboarding Feedback",
    iconKey: "onboardingFeedback",
    fields: "8 fields",
    trigger: "Day 7–14 or after first meaningful action",
    desc: "Surfaces friction in the onboarding funnel before new users churn silently. Covers setup ease, time to first value, blockers, biggest win, and biggest confusion."
  },
  {
    id: "winLoss",
    title: "Win / Loss Survey",
    iconKey: "winLoss",
    fields: "10 fields",
    trigger: "After deal_stage = closed_won or closed_lost",
    desc: "One of the highest-value forms for B2B SaaS — tells you exactly why you win deals and why you lose them. Preprocessing layer can enrich this with deal metadata."
  },
  {
    id: "betaFeedback",
    title: "Beta Feature Feedback",
    iconKey: "betaFeedback",
    fields: "11 fields",
    trigger: "After beta tester uses a specific feature",
    desc: "Structured signal from beta testers before GA — prevents shipping incomplete features. Covers usefulness, usability, expectation alignment, bugs, and missing pieces."
  },
  {
    id: "developerExperience",
    title: "Developer Experience",
    iconKey: "developerExperience",
    fields: "11 fields",
    trigger: "After first API call, integration, or monthly",
    desc: "Built for API, SDK, webhook, and CLI users — captures technical signals that standard product forms miss entirely. Rates docs quality, API design, and integration barriers."
  },
  {
    id: "pricingFeedback",
    title: "Pricing & Value Perception",
    iconKey: "pricingFeedback",
    fields: "9 fields",
    trigger: "Quarterly or before a pricing change",
    desc: "Simplified Van Westendorp + intent signals. Measures perceived value vs price, competitor pricing comparison, price sensitivity thresholds, and preferred billing model."
  }
];

const iconMap = {
  nps: BarChart3,
  csat: Star,
  ces: Zap,
  productFeedback: FlaskConical,
  supportTicket: FileText,
  bugReport: Bug,
  churnSurvey: LogOut,
  featureRequest: Lightbulb,
  onboardingFeedback: TrendingUp,
  winLoss: Award,
  betaFeedback: Activity,
  developerExperience: Cpu,
  pricingFeedback: Coins
};

export function DocsView() {
  const [activeTab, setActiveTab] = useState('guides'); // 'guides' | 'pipeline' | 'reference'
  const [copiedKey, setCopiedKey] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const filteredForms = formTypes.filter(f =>
    f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Premium Gradient Hero Card */}
      <div className="relative bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-800 dark:to-indigo-900 rounded-2xl p-6 md:p-8 overflow-hidden shadow-md text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide mb-4">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Acme Form Widget Integration Guide
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Collect feedback. Let the system handle the rest.
          </h2>
          <p className="text-violet-100/90 text-sm md:text-base font-light leading-relaxed font-sans">
            The Acme Form Widget is the entry collection layer of a full feedback intelligence pipeline. Embed in any stack with one script tag — responses flow automatically into the Node.js preprocessing engine and AI analysis agents.
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-gray-200 dark:border-gray-700/60">
        <button
          onClick={() => setActiveTab('guides')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition duration-200 flex items-center gap-2 ${
            activeTab === 'guides'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Code className="w-4 h-4" />
          Integration Guides
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition duration-200 flex items-center gap-2 ${
            activeTab === 'pipeline'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Pipeline Architecture
        </button>
        <button
          onClick={() => setActiveTab('reference')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition duration-200 flex items-center gap-2 ${
            activeTab === 'reference'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Form Types Reference ({formTypes.length})
        </button>
      </div>

      {/* VIEW Content */}
      <div className="space-y-6">
        {activeTab === 'guides' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Guide left/middle content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Script tag */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-6 shadow-xs">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold rounded">Step 1</span>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">Add the Global Script Tag</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed font-sans">
                  Paste this tag just before your closing <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700/60 rounded text-xs font-mono">&lt;/body&gt;</code> tag. It loads the widget globally.
                </p>
                <div className="relative rounded-lg bg-slate-50 dark:bg-gray-950 p-4 font-mono text-xs text-slate-800 dark:text-violet-300 overflow-x-auto border border-gray-200 dark:border-gray-900">
                  <button
                    onClick={() => handleCopy('script', codeSnippets.script)}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1.5 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-650 dark:text-gray-300 rounded text-[10px] font-sans font-semibold transition border border-gray-200 dark:border-gray-800 flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedKey === 'script' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <pre className="pr-16 text-slate-800 dark:text-violet-300">{codeSnippets.script}</pre>
                </div>
              </div>

              {/* Step 2: React Component Wrapper */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-6 shadow-xs">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold rounded">Step 2</span>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">React & Vite Integration</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed font-sans">
                  Create a thin wrapper component to mount the form inside React. It will handle DOM binding contextually.
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-violet-500" />
                  <span>src/components/AcmeForm.jsx</span>
                </div>
                <div className="relative rounded-lg bg-slate-50 dark:bg-gray-950 p-4 font-mono text-xs text-slate-800 dark:text-violet-300 overflow-x-auto border border-gray-200 dark:border-gray-900 max-h-96">
                  <button
                    onClick={() => handleCopy('react', codeSnippets.react)}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1.5 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-650 dark:text-gray-300 rounded text-[10px] font-sans font-semibold transition border border-gray-200 dark:border-gray-800 flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedKey === 'react' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <pre className="pr-16 text-slate-800 dark:text-violet-300">{codeSnippets.react}</pre>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 mb-2 leading-relaxed font-sans">
                  Then mount the wrapper anywhere to load specific schemas:
                </p>
                <div className="relative rounded-lg bg-slate-50 dark:bg-gray-950 p-4 font-mono text-xs text-slate-800 dark:text-violet-300 overflow-x-auto border border-gray-200 dark:border-gray-900">
                  <button
                    onClick={() => handleCopy('reactUse', codeSnippets.reactUse)}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1.5 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-650 dark:text-gray-300 rounded text-[10px] font-sans font-semibold transition border border-gray-200 dark:border-gray-800 flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedKey === 'reactUse' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <pre className="pr-16 text-slate-800 dark:text-violet-300">{codeSnippets.reactUse}</pre>
                </div>
              </div>

              {/* Step 3: Next.js Layout Integration */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-6 shadow-xs">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold rounded">Step 3</span>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">Next.js App Router Setup</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed font-sans">
                  Use Next.js's native script component with <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700/60 rounded text-xs font-mono">afterInteractive</code> strategy in your root layout:
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-violet-500" />
                  <span>app/layout.jsx</span>
                </div>
                <div className="relative rounded-lg bg-slate-50 dark:bg-gray-950 p-4 font-mono text-xs text-slate-800 dark:text-violet-300 overflow-x-auto border border-gray-200 dark:border-gray-900">
                  <button
                    onClick={() => handleCopy('nextjs', codeSnippets.nextjs)}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1.5 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-650 dark:text-gray-300 rounded text-[10px] font-sans font-semibold transition border border-gray-200 dark:border-gray-800 flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedKey === 'nextjs' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <pre className="pr-16 text-slate-800 dark:text-violet-300">{codeSnippets.nextjs}</pre>
                </div>
              </div>
            </div>

            {/* Right column: HTML Guide and Notes card */}
            <div className="space-y-6">
              {/* Plain HTML Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-6 shadow-xs">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-violet-500" />
                  <span>Plain HTML / Webflow</span>
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed font-sans">
                  Direct vanilla integration. Mount forms in static portals or templates.
                </p>
                <div className="relative rounded-lg bg-slate-50 dark:bg-gray-950 p-4 font-mono text-xs text-slate-800 dark:text-violet-300 overflow-x-auto border border-gray-200 dark:border-gray-900">
                  <button
                    onClick={() => handleCopy('html', codeSnippets.html)}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1.5 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-650 dark:text-gray-300 rounded text-[10px] font-sans font-semibold transition border border-gray-200 dark:border-gray-800 flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedKey === 'html' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <pre className="pr-16 text-slate-800 dark:text-violet-300">{codeSnippets.html}</pre>
                </div>
              </div>

              {/* Developer Notes / Best Practices */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-2">
                  Important Notes
                </h3>
                <div className="space-y-4 text-xs leading-relaxed text-gray-550 dark:text-gray-400 font-sans">
                  <div className="flex gap-3">
                    <Zap className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>Script load order:</strong> Always ensure the global widget script is loaded before calling mount.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <RefreshCw className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>Dynamic switches:</strong> Changing the formType prop updates the form layout instantly without reloading.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Package className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>Metadata Enrichment:</strong> Ensure you send contextual fields like <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">ticket_id</code> or <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">deal_id</code> where required.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Bot className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>Auto Analysis:</strong> AI workers preprocess, tag sentiment, and categorize topics completely in the background.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-6 shadow-xs space-y-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              The Feedback Intelligence Pipeline
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-4xl font-sans">
              The form widget is the ingestion node of a larger data analytics pipeline. Every response is captured, queued securely using PgMQ, parsed by the Node.js API server, and automatically processed by deep-analysis AI agents.
            </p>

            {/* Pipeline Visual flowchart block */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-150 dark:border-gray-700/50 rounded-xl text-center flex flex-col items-center">
                <Code className="w-8 h-8 text-violet-500 mb-2" />
                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">1. Form Widget</h4>
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed font-sans">
                  Collects structured user response and passes schemas.
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-150 dark:border-gray-700/50 rounded-xl text-center relative flex flex-col items-center">
                <ChevronRight className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 w-6 h-6" />
                <Cpu className="w-8 h-8 text-violet-500 mb-2" />
                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">2. Node.js Middleware</h4>
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed font-sans">
                  Validates, enriches context, and enqueues request payloads.
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-150 dark:border-gray-700/50 rounded-xl text-center relative flex flex-col items-center">
                <ChevronRight className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 w-6 h-6" />
                <Bot className="w-8 h-8 text-violet-500 mb-2" />
                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">3. AI Analysis Agents</h4>
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed font-sans">
                  Score promoters/detractors, label sentiment, categorize themes.
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-150 dark:border-gray-700/50 rounded-xl text-center relative flex flex-col items-center">
                <ChevronRight className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 w-6 h-6" />
                <TrendingUp className="w-8 h-8 text-violet-500 mb-2" />
                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">4. Intelligence Metrics</h4>
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed font-sans">
                  Aggregate insights, trend models, and product backlog reports.
                </p>
              </div>
            </div>

            <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-sans flex gap-3">
              <Info className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
              <p>
                <strong>Data Isolation Enforcement:</strong> Each form submission is permanently scoped to the client identifier matching the active API Key. Database partition structures prevent data collisions between user profiles.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'reference' && (
          <div className="space-y-4">
            {/* Search filter bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-sans">
                Search or select schema rules for any of the 13 built-in feedback modules.
              </p>
              <div className="relative min-w-[260px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search form types..."
                  className="pl-9 pr-4 py-2 w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Form Types grid cards */}
            {filteredForms.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 text-center text-gray-500 font-sans">
                No form types match your search term.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredForms.map((form) => {
                  const IconComponent = iconMap[form.iconKey] || HelpCircle;
                  return (
                    <div
                      key={form.id}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5 hover:border-violet-500/50 dark:hover:border-violet-500/40 hover:-translate-y-1 transition duration-200 flex flex-col justify-between shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="p-2 bg-violet-100/70 dark:bg-violet-500/10 rounded-lg">
                            <IconComponent className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-mono text-[10px] rounded border border-gray-150 dark:border-gray-700">
                              {form.fields}
                            </span>
                            <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-mono text-[10px] font-bold rounded">
                              {form.id}
                            </span>
                          </div>
                        </div>
                        <h4 className="font-bold text-gray-850 dark:text-gray-100 mb-2">{form.title}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 font-sans">
                          {form.desc}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 space-y-2 text-[11px] font-mono">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 dark:text-gray-550">Trigger:</span>
                          <span className="text-gray-600 dark:text-gray-300 font-sans font-medium text-right truncate max-w-[170px]" title={form.trigger}>
                            {form.trigger}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
