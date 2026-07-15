export const forms: Record<string, any> = {

  /* ── 1. NPS — Net Promoter Score ────────────────────────────────
     Gold-standard loyalty metric. Short by design — high completion.
     0–6 Detractor | 7–8 Passive | 9–10 Promoter
  ─────────────────────────────────────────────────────────────────── */
  nps: {
    id: "nps", version: 1,
    title: "How likely are you to recommend us?",
    description: "Net Promoter Score. Send post-interaction or monthly.",
    submitUrl: "/submit/nps",
    fields: [
      {
        id: "score", type: "range",
        label: "On a scale of 0–10, how likely are you to recommend us to a friend or colleague?",
        required: true, min: 0, max: 10
      },
      {
        id: "reason", type: "textarea",
        label: "What's the main reason for your score?",
        required: true, minLength: 10, maxLength: 500,
        placeholder: "Be specific — your answer shapes our roadmap."
      },
      {
        id: "segment", type: "select",
        label: "Which best describes you?",
        options: [
          { label: "End user / Individual",       value: "individual" },
          { label: "Team lead / Manager",         value: "team_lead"  },
          { label: "Executive / Decision maker",  value: "executive"  },
          { label: "Developer / Technical",       value: "developer"  },
        ]
      },
      {
        id: "product_area", type: "select",
        label: "Which part of the product do you use most?",
        options: [
          { label: "Core product",          value: "core"         },
          { label: "Integrations / API",    value: "integrations" },
          { label: "Reporting / Analytics", value: "analytics"    },
          { label: "Mobile app",            value: "mobile"       },
          { label: "Admin / Settings",      value: "admin"        },
        ]
      },
    ]
  },

  /* ── 2. CSAT — Customer Satisfaction Score ───────────────────────
     Sent right after a support interaction closes.
     Measures moment-in-time satisfaction across multiple dimensions.
  ─────────────────────────────────────────────────────────────────── */
  csat: {
    id: "csat", version: 1,
    title: "How satisfied were you?",
    description: "Post-interaction CSAT. Include ticket_id in payload when sending.",
    submitUrl: "/submit/csat",
    fields: [
      {
        id: "satisfaction", type: "rating",
        label: "Overall, how satisfied were you with your experience today?",
        required: true, min: 1, max: 5
      },
      {
        id: "interaction_type", type: "select",
        label: "What kind of interaction was this?",
        required: true,
        options: [
          { label: "Support ticket resolved", value: "support_resolved" },
          { label: "Live chat",               value: "live_chat"        },
          { label: "Onboarding session",      value: "onboarding"       },
          { label: "Sales / Demo call",       value: "sales_call"       },
          { label: "Billing inquiry",         value: "billing"          },
        ]
      },
      {
        id: "resolution_quality", type: "rating",
        label: "How well did we resolve your issue?",
        min: 1, max: 5
      },
      {
        id: "response_speed", type: "rating",
        label: "How satisfied were you with our response time?",
        min: 1, max: 5
      },
      {
        id: "agent_helpfulness", type: "rating",
        label: "How helpful was the person you spoke with?",
        min: 1, max: 5
      },
      {
        id: "comment", type: "textarea",
        label: "Anything you'd like to add?",
        maxLength: 600, placeholder: "What went well? What could have been better?"
      },
      {
        id: "follow_up_ok", type: "checkbox",
        label: "I'm happy for the team to follow up with me about this feedback."
      },
    ]
  },

  /* ── 3. CES — Customer Effort Score ─────────────────────────────
     Measures how easy it was to get something done.
     Industry-standard 7-point Likert scale.
     Strong predictor of churn and repeat contact volume.
  ─────────────────────────────────────────────────────────────────── */
  ces: {
    id: "ces", version: 1,
    title: "How easy was that?",
    description: "Customer Effort Score. Send after task completion.",
    submitUrl: "/submit/ces",
    fields: [
      {
        id: "effort", type: "rating",
        label: "The company made it easy for me to handle my issue.",
        required: true, min: 1, max: 7,
        scaleLabels: { 1: "Strongly Disagree", 4: "Neutral", 7: "Strongly Agree" }
      },
      {
        id: "task", type: "select",
        label: "What were you trying to do?",
        required: true,
        options: [
          { label: "Resolve a support issue",    value: "support"    },
          { label: "Complete a purchase",        value: "purchase"   },
          { label: "Set up / configure product", value: "setup"      },
          { label: "Find information / docs",    value: "find_info"  },
          { label: "Update account or billing",  value: "account"    },
          { label: "Cancel or downgrade",        value: "cancel"     },
          { label: "Other",                      value: "other"      },
        ]
      },
      {
        id: "friction_point", type: "select",
        label: "If it wasn't easy, where did you get stuck?",
        options: [
          { label: "Hard to find the right page", value: "navigation"     },
          { label: "Too many steps",              value: "too_many_steps" },
          { label: "Unclear instructions",        value: "unclear_docs"   },
          { label: "Had to contact support",      value: "needed_support" },
          { label: "Technical error",             value: "tech_error"     },
          { label: "No problem",                  value: "na"             },
        ]
      },
      {
        id: "comment", type: "textarea",
        label: "Tell us more (optional).",
        maxLength: 400
      },
    ]
  },

  /* ── 4. Product Feedback ─────────────────────────────────────────
     Mid-lifecycle structured feedback. Surfaces feature gaps,
     UX pain points, and competitive risk. For engaged users.
  ─────────────────────────────────────────────────────────────────── */
  productFeedback: {
    id: "productFeedback", version: 1,
    title: "Share your product feedback",
    description: "In-app feedback. Trigger contextually after feature use.",
    submitUrl: "/submit/productFeedback",
    fields: [
      {
        id: "area", type: "select",
        label: "Which area does your feedback relate to?",
        required: true,
        options: [
          { label: "UI / Visual design",   value: "ui"            },
          { label: "Performance / Speed",  value: "performance"   },
          { label: "Missing feature",      value: "feature_gap"   },
          { label: "Confusing UX / Flow",  value: "ux_confusion"  },
          { label: "Data / Accuracy",      value: "data_accuracy" },
          { label: "Integrations",         value: "integrations"  },
          { label: "Documentation",        value: "docs"          },
          { label: "General",              value: "general"       },
        ]
      },
      {
        id: "overall_rating", type: "rating",
        label: "Overall product rating",
        required: true, min: 1, max: 5
      },
      {
        id: "ease_of_use", type: "rating",
        label: "How easy is the product to use?",
        required: true, min: 1, max: 5
      },
      {
        id: "value_for_money", type: "rating",
        label: "How well does it deliver value for what you pay?",
        min: 1, max: 5
      },
      {
        id: "would_recommend", type: "radio",
        label: "Would you recommend this product?",
        required: true,
        options: [
          { label: "Yes, definitely",  value: "yes"   },
          { label: "Maybe / depends",  value: "maybe" },
          { label: "No",               value: "no"    },
        ]
      },
      {
        id: "best_aspect", type: "text",
        label: "What do you value most about the product?",
        maxLength: 250, placeholder: "e.g. speed, integrations, simplicity…"
      },
      {
        id: "biggest_pain", type: "textarea",
        label: "What is your biggest frustration or pain point?",
        required: true, minLength: 15, maxLength: 600
      },
      {
        id: "feature_request", type: "textarea",
        label: "Is there a feature you wish existed?",
        maxLength: 400, placeholder: "Describe what you'd build if you could."
      },
      {
        id: "use_frequency", type: "select",
        label: "How often do you use the product?",
        options: [
          { label: "Multiple times a day", value: "daily_heavy" },
          { label: "Once a day",           value: "daily"       },
          { label: "A few times a week",   value: "weekly"      },
          { label: "A few times a month",  value: "monthly"     },
          { label: "Rarely",               value: "rarely"      },
        ]
      },
    ]
  },

  /* ── 5. Support Ticket ───────────────────────────────────────────
     Full structured intake. Maps to ITSM fields.
     Routes correctly and gives agents full context up front.
  ─────────────────────────────────────────────────────────────────── */
  supportTicket: {
    id: "supportTicket", version: 1,
    title: "Submit a support ticket",
    description: "Customer-facing support intake.",
    submitUrl: "/submit/supportTicket",
    fields: [
      {
        id: "email", type: "email",
        label: "Your email address",
        required: true
      },
      {
        id: "category", type: "select",
        label: "What area does your issue relate to?",
        required: true,
        options: [
          { label: "Billing / Payment",       value: "billing"     },
          { label: "Account / Access",        value: "account"     },
          { label: "Bug / Something broken",  value: "bug"         },
          { label: "Performance / Slow",      value: "performance" },
          { label: "Data / Wrong results",    value: "data"        },
          { label: "Integration / API",       value: "integration" },
          { label: "Feature request",         value: "feature"     },
          { label: "Security concern",        value: "security"    },
          { label: "Other",                   value: "other"       },
        ]
      },
      {
        id: "priority", type: "radio",
        label: "How severely is this affecting you?",
        required: true,
        options: [
          { label: "Low — minor inconvenience",         value: "low"      },
          { label: "Medium — impacting my work",        value: "medium"   },
          { label: "High — blocking key workflows",     value: "high"     },
          { label: "Critical — total loss of service",  value: "critical" },
        ]
      },
      {
        id: "issue_title", type: "text",
        label: "Give your issue a short title",
        required: true, minLength: 5, maxLength: 100,
        placeholder: "e.g. 'Dashboard not loading for enterprise accounts'"
      },
      {
        id: "issue_description", type: "textarea",
        label: "Describe the issue in detail",
        required: true, minLength: 30, maxLength: 2000,
        placeholder: "What happened? What did you expect?"
      },
      {
        id: "steps_to_reproduce", type: "textarea",
        label: "Steps to reproduce (if applicable)",
        maxLength: 1000, placeholder: "1. Go to…  2. Click…  3. See error…"
      },
      {
        id: "impact_scope", type: "select",
        label: "Who is affected?",
        options: [
          { label: "Just me",                  value: "individual" },
          { label: "My team",                  value: "team"       },
          { label: "Entire organisation",      value: "org"        },
          { label: "My customers / end users", value: "customers"  },
        ]
      },
      {
        id: "environment", type: "text",
        label: "Browser / OS / App version (if relevant)",
        maxLength: 150
      },
      {
        id: "first_occurrence", type: "radio",
        label: "When did this start?",
        options: [
          { label: "Just now",               value: "just_now"  },
          { label: "Today",                  value: "today"     },
          { label: "In the last week",       value: "this_week" },
          { label: "Longer than a week ago", value: "older"     },
        ]
      },
    ]
  },

  /* ── 6. Bug Report ───────────────────────────────────────────────
     Developer/power-user facing. More technical than support ticket.
     Shown on error screens or via a "Report a bug" button.
  ─────────────────────────────────────────────────────────────────── */
  bugReport: {
    id: "bugReport", version: 1,
    title: "Report a bug",
    description: "Technical bug report. Show on error screens or report button.",
    submitUrl: "/submit/bugReport",
    fields: [
      {
        id: "severity", type: "select",
        label: "Severity",
        required: true,
        options: [
          { label: "Critical — app crash / data loss",  value: "critical" },
          { label: "High — feature completely broken",  value: "high"     },
          { label: "Medium — partial / degraded",       value: "medium"   },
          { label: "Low — visual / minor",              value: "low"      },
        ]
      },
      {
        id: "component", type: "select",
        label: "Which part of the app?",
        required: true,
        options: [
          { label: "Dashboard / Home",    value: "dashboard"     },
          { label: "Data tables / Lists", value: "data_tables"   },
          { label: "Forms / Inputs",      value: "forms"         },
          { label: "Charts / Graphs",     value: "charts"        },
          { label: "Auth / Login",        value: "auth"          },
          { label: "Settings / Admin",    value: "settings"      },
          { label: "Notifications",       value: "notifications" },
          { label: "API / Webhooks",      value: "api"           },
          { label: "Mobile app",          value: "mobile"        },
          { label: "Other / Unknown",     value: "other"         },
        ]
      },
      {
        id: "title", type: "text",
        label: "One-line description of the bug",
        required: true, minLength: 5, maxLength: 120
      },
      {
        id: "what_happened", type: "textarea",
        label: "What happened?",
        required: true, minLength: 20, maxLength: 1500
      },
      {
        id: "expected_behaviour", type: "textarea",
        label: "What did you expect to happen?",
        required: true, minLength: 10, maxLength: 800
      },
      {
        id: "steps", type: "textarea",
        label: "Steps to reproduce",
        minLength: 10, maxLength: 1000,
        placeholder: "1. Navigate to…\n2. Click…\n3. Observe…"
      },
      {
        id: "frequency", type: "radio",
        label: "How often does this occur?",
        options: [
          { label: "Every time",        value: "always"     },
          { label: "Most of the time",  value: "frequently" },
          { label: "Occasionally",      value: "sometimes"  },
          { label: "Once so far",       value: "once"       },
        ]
      },
      {
        id: "browser_env", type: "text",
        label: "Browser / OS / App version",
        maxLength: 200
      },
      {
        id: "workaround_exists", type: "radio",
        label: "Is there a workaround?",
        options: [
          { label: "Yes",       value: "yes"     },
          { label: "No",        value: "no"      },
          { label: "Not sure",  value: "unknown" },
        ]
      },
    ]
  },

  /* ── 7. Churn / Cancellation Survey ─────────────────────────────
     Triggered at cancellation or downgrade.
     Critical for understanding why customers leave.
     Feeds directly into retention analysis.
  ─────────────────────────────────────────────────────────────────── */
  churnSurvey: {
    id: "churnSurvey", version: 1,
    title: "Before you go — help us improve",
    description: "Exit survey. Trigger at account cancellation or plan downgrade.",
    submitUrl: "/submit/churnSurvey",
    fields: [
      {
        id: "primary_reason", type: "select",
        label: "What's the main reason you're leaving?",
        required: true,
        options: [
          { label: "Too expensive / pricing",         value: "pricing"          },
          { label: "Switching to a competitor",       value: "competitor"       },
          { label: "Missing a feature I need",        value: "missing_feature"  },
          { label: "Too hard to use",                 value: "too_complex"      },
          { label: "Poor performance / reliability",  value: "performance"      },
          { label: "Poor customer support",           value: "poor_support"     },
          { label: "No longer need the product",      value: "no_longer_needed" },
          { label: "Just testing / evaluating",       value: "was_testing"      },
          { label: "Project ended / company change",  value: "project_ended"    },
          { label: "Other",                           value: "other"            },
        ]
      },
      {
        id: "competitor_name", type: "text",
        label: "If switching, which tool are you moving to?",
        maxLength: 100, placeholder: "Optional — helps us understand the market."
      },
      {
        id: "missing_feature_detail", type: "textarea",
        label: "What feature was missing that you needed?",
        maxLength: 500
      },
      {
        id: "satisfaction_overall", type: "rating",
        label: "Overall, how satisfied were you during your time with us?",
        required: true, min: 1, max: 5
      },
      {
        id: "would_return", type: "radio",
        label: "Would you consider returning in the future?",
        options: [
          { label: "Yes, likely", value: "likely" },
          { label: "Maybe",       value: "maybe"  },
          { label: "No",          value: "no"     },
        ]
      },
      {
        id: "prevention_comment", type: "textarea",
        label: "Is there anything we could have done to keep you?",
        maxLength: 600
      },
      {
        id: "final_comment", type: "textarea",
        label: "Any final thoughts?",
        maxLength: 400
      },
    ]
  },

  /* ── 8. Feature Request ──────────────────────────────────────────
     Structured feature request that maps to product backlog fields.
     Forces context so "add this please" becomes actionable.
  ─────────────────────────────────────────────────────────────────── */
  featureRequest: {
    id: "featureRequest", version: 1,
    title: "Request a feature",
    description: "In-product feature request. Routes to product backlog.",
    submitUrl: "/submit/featureRequest",
    fields: [
      {
        id: "title", type: "text",
        label: "Feature title (keep it short)",
        required: true, minLength: 5, maxLength: 100,
        placeholder: "e.g. 'Export reports as PDF'"
      },
      {
        id: "problem_statement", type: "textarea",
        label: "What problem does this solve for you?",
        required: true, minLength: 20, maxLength: 800,
        placeholder: "Describe the situation where you feel stuck or limited."
      },
      {
        id: "proposed_solution", type: "textarea",
        label: "How do you imagine it working?",
        maxLength: 600, placeholder: "Optional — describe your ideal solution."
      },
      {
        id: "area", type: "select",
        label: "Which area of the product is this for?",
        required: true,
        options: [
          { label: "Dashboard / Overview",    value: "dashboard"     },
          { label: "Reporting / Analytics",   value: "analytics"     },
          { label: "Integrations / API",      value: "integrations"  },
          { label: "Notifications / Alerts",  value: "notifications" },
          { label: "Collaboration / Sharing", value: "collaboration" },
          { label: "Admin / Permissions",     value: "admin"         },
          { label: "Mobile",                  value: "mobile"        },
          { label: "Other",                   value: "other"         },
        ]
      },
      {
        id: "urgency", type: "radio",
        label: "How urgently do you need this?",
        required: true,
        options: [
          { label: "Nice to have",                          value: "nice_to_have" },
          { label: "Would significantly improve my workflow", value: "high_value" },
          { label: "Blocking me from using the product fully", value: "blocking" },
        ]
      },
      {
        id: "business_impact", type: "textarea",
        label: "What's the business impact if this doesn't get built?",
        maxLength: 400
      },
      {
        id: "beta_willing", type: "radio",
        label: "Would you beta test this if we built it?",
        options: [
          { label: "Yes",   value: "yes"   },
          { label: "Maybe", value: "maybe" },
          { label: "No",    value: "no"    },
        ]
      },
    ]
  },

  /* ── 9. Onboarding Feedback ──────────────────────────────────────
     Sent at day 7–14 or after first key action.
     Surfaces friction in the onboarding funnel before users churn.
  ─────────────────────────────────────────────────────────────────── */
  onboardingFeedback: {
    id: "onboardingFeedback", version: 1,
    title: "How's your first experience been?",
    description: "Sent to new users at day 7 or after first meaningful action.",
    submitUrl: "/submit/onboardingFeedback",
    fields: [
      {
        id: "setup_ease", type: "rating",
        label: "How easy was it to get set up?",
        required: true, min: 1, max: 5
      },
      {
        id: "time_to_value", type: "select",
        label: "How quickly did you see value from the product?",
        required: true,
        options: [
          { label: "Within minutes",    value: "minutes"   },
          { label: "Within a day",      value: "day"       },
          { label: "Within a week",     value: "week"      },
          { label: "Still waiting",     value: "not_yet"   },
          { label: "Haven't tried yet", value: "no_action" },
        ]
      },
      {
        id: "setup_blocker", type: "select",
        label: "Did anything block you during setup?",
        options: [
          { label: "Nothing — smooth setup",              value: "none"             },
          { label: "Confusing initial steps",             value: "confusing_steps"  },
          { label: "Integration / connection failed",     value: "integration_fail" },
          { label: "Missing a feature I expected",        value: "missing_feature"  },
          { label: "Docs weren't helpful",                value: "bad_docs"         },
          { label: "Had to contact support",              value: "needed_support"   },
        ]
      },
      {
        id: "onboarding_rating", type: "rating",
        label: "Overall, how would you rate your onboarding experience?",
        required: true, min: 1, max: 5
      },
      {
        id: "biggest_win", type: "text",
        label: "What's the first thing that worked really well for you?",
        maxLength: 250
      },
      {
        id: "biggest_confusion", type: "textarea",
        label: "What was most confusing or frustrating?",
        maxLength: 500
      },
      {
        id: "goal", type: "select",
        label: "What's your primary goal with this product?",
        options: [
          { label: "Improve team productivity",     value: "productivity" },
          { label: "Replace an existing tool",      value: "replacement"  },
          { label: "Automate a process",            value: "automation"   },
          { label: "Better reporting / visibility", value: "reporting"    },
          { label: "Just evaluating options",       value: "evaluating"   },
          { label: "Other",                         value: "other"        },
        ]
      },
      {
        id: "support_needed", type: "checkbox",
        label: "I'd like someone to walk me through setup."
      },
    ]
  },

  /* ── 10. Win / Loss Survey ────────────────────────────────────────
     Sent to prospects after a deal closes OR is lost.
     One of the highest-value forms for a B2B SaaS company —
     tells you exactly why you win and why you lose.
     trigger: deal_stage = 'closed_won' | 'closed_lost'
  ─────────────────────────────────────────────────────────────────── */
  winLoss: {
    id: "winLoss", version: 1,
    title: "Help us understand your decision",
    description: "Win/Loss survey. Sent after deal close or loss. Include deal_id in payload.",
    submitUrl: "/submit/winLoss",
    fields: [
      {
        id: "outcome", type: "radio",
        label: "What was the outcome of your evaluation?",
        required: true,
        options: [
          { label: "We chose your product",           value: "won"         },
          { label: "We chose a different product",    value: "lost"        },
          { label: "We decided not to buy anything",  value: "no_decision" },
          { label: "We're still evaluating",          value: "ongoing"     },
        ]
      },
      {
        id: "primary_reason", type: "select",
        label: "What was the single biggest factor in your decision?",
        required: true,
        options: [
          { label: "Price / Total cost",              value: "price"           },
          { label: "Product features / capabilities", value: "features"        },
          { label: "Ease of use / UX",                value: "ux"              },
          { label: "Integration with existing tools", value: "integrations"    },
          { label: "Vendor reputation / trust",       value: "reputation"      },
          { label: "Sales / Support experience",      value: "sales_support"   },
          { label: "Security / Compliance",           value: "security"        },
          { label: "Speed of implementation",         value: "implementation"  },
          { label: "Recommendation from peer",        value: "peer_referral"   },
          { label: "Other",                           value: "other"           },
        ]
      },
      {
        id: "competitor_chosen", type: "text",
        label: "If you chose another product, which one?",
        maxLength: 100,
        placeholder: "e.g. Salesforce, HubSpot, a custom internal tool…"
      },
      {
        id: "competitor_reason", type: "textarea",
        label: "What did the alternative offer that we didn't?",
        maxLength: 600
      },
      {
        id: "evaluation_length", type: "select",
        label: "How long did your evaluation take?",
        options: [
          { label: "Less than a week",    value: "under_week"   },
          { label: "1–4 weeks",           value: "weeks"        },
          { label: "1–3 months",          value: "months"       },
          { label: "More than 3 months",  value: "over_3months" },
        ]
      },
      {
        id: "stakeholders", type: "select",
        label: "How many people were involved in the decision?",
        options: [
          { label: "Just me",      value: "solo"   },
          { label: "2–4 people",   value: "small"  },
          { label: "5–10 people",  value: "medium" },
          { label: "10+ people",   value: "large"  },
        ]
      },
      {
        id: "our_strengths", type: "textarea",
        label: "What did we do well during your evaluation?",
        maxLength: 500
      },
      {
        id: "our_weaknesses", type: "textarea",
        label: "What should we have done better?",
        required: true, minLength: 10, maxLength: 600
      },
      {
        id: "price_perception", type: "radio",
        label: "How did you perceive our pricing?",
        options: [
          { label: "Much too expensive",   value: "way_too_high"  },
          { label: "Slightly too high",    value: "too_high"      },
          { label: "About right",          value: "fair"          },
          { label: "Good value",           value: "good_value"    },
          { label: "Excellent value",      value: "great_value"   },
        ]
      },
      {
        id: "would_reconsider", type: "radio",
        label: "Would you consider us again in the future?",
        options: [
          { label: "Yes, definitely",  value: "yes"   },
          { label: "Maybe",            value: "maybe" },
          { label: "No",               value: "no"    },
        ]
      },
    ]
  },

  /* ── 11. Beta Feature Feedback ───────────────────────────────────
     Sent to beta testers after using a specific new feature.
     Gives structured signal before GA — prevents shipping broken things.
     Include feature_id and feature_name in payload when triggering.
  ─────────────────────────────────────────────────────────────────── */
  betaFeedback: {
    id: "betaFeedback", version: 1,
    title: "Beta feature feedback",
    description: "Sent to beta testers. Include feature_id and feature_name in payload.",
    submitUrl: "/submit/betaFeedback",
    fields: [
      {
        id: "feature_name", type: "text",
        label: "Which feature are you giving feedback on?",
        required: true, maxLength: 100,
        placeholder: "Auto-filled by the product if triggered in-app."
      },
      {
        id: "used_it", type: "radio",
        label: "Have you actually used this feature yet?",
        required: true,
        options: [
          { label: "Yes, several times",  value: "yes_multiple" },
          { label: "Yes, once",           value: "yes_once"     },
          { label: "Tried but failed",    value: "tried_failed" },
          { label: "Not yet",             value: "no"           },
        ]
      },
      {
        id: "usefulness", type: "rating",
        label: "How useful is this feature for your workflow?",
        required: true, min: 1, max: 5
      },
      {
        id: "usability", type: "rating",
        label: "How easy was it to understand and use?",
        required: true, min: 1, max: 5
      },
      {
        id: "met_expectations", type: "radio",
        label: "Did it work the way you expected?",
        required: true,
        options: [
          { label: "Yes, exactly as expected",   value: "met"      },
          { label: "Mostly, with minor issues",  value: "mostly"   },
          { label: "Partially",                  value: "partial"  },
          { label: "No, it behaved differently", value: "unmet"    },
        ]
      },
      {
        id: "bugs_found", type: "radio",
        label: "Did you encounter any bugs or errors?",
        required: true,
        options: [
          { label: "No issues",          value: "none"     },
          { label: "Minor visual issue", value: "minor"    },
          { label: "Functional bug",     value: "bug"      },
          { label: "Blocker / crash",    value: "blocker"  },
        ]
      },
      {
        id: "bug_description", type: "textarea",
        label: "Describe the bug or unexpected behaviour.",
        maxLength: 800
      },
      {
        id: "missing_piece", type: "textarea",
        label: "What's the one thing missing that would make this feature complete for you?",
        maxLength: 500
      },
      {
        id: "use_in_production", type: "radio",
        label: "Would you use this feature once it's released?",
        required: true,
        options: [
          { label: "Yes, it solves a real problem",    value: "yes_need_it"  },
          { label: "Yes, occasionally",                value: "yes_sometimes"},
          { label: "Probably not",                     value: "unlikely"     },
          { label: "No",                               value: "no"           },
        ]
      },
      {
        id: "overall_impression", type: "textarea",
        label: "Overall impression — what worked, what didn't?",
        required: true, minLength: 15, maxLength: 800
      },
      {
        id: "priority_for_ga", type: "radio",
        label: "How urgently do you want this released?",
        options: [
          { label: "ASAP — I need it now",          value: "urgent"      },
          { label: "Soon — within the next release", value: "soon"        },
          { label: "No rush",                        value: "no_rush"     },
        ]
      },
    ]
  },

  /* ── 12. Developer / API Experience ─────────────────────────────
     For developer-facing products: APIs, SDKs, webhooks, CLI tools.
     Technical signals that product/CSAT forms completely miss.
     Triggered after first API call, after integration setup, or monthly.
  ─────────────────────────────────────────────────────────────────── */
  developerExperience: {
    id: "developerExperience", version: 1,
    title: "Developer experience feedback",
    description: "For API / SDK / integration users. Triggered after first integration or monthly.",
    submitUrl: "/submit/developerExperience",
    fields: [
      {
        id: "integration_type", type: "multiselect",
        label: "Which parts of our developer offering have you used?",
        required: true,
        options: [
          { label: "REST API",              value: "rest_api"    },
          { label: "Webhooks",              value: "webhooks"    },
          { label: "Official SDK",          value: "sdk"         },
          { label: "GraphQL API",           value: "graphql"     },
          { label: "CLI tool",              value: "cli"         },
          { label: "OAuth / SSO",           value: "auth"        },
          { label: "Data export / import",  value: "data_io"     },
          { label: "MCP / AI integration",  value: "ai"          },
        ]
      },
      {
        id: "dx_overall", type: "rating",
        label: "Overall developer experience rating",
        required: true, min: 1, max: 5
      },
      {
        id: "docs_quality", type: "rating",
        label: "Quality and completeness of documentation",
        required: true, min: 1, max: 5
      },
      {
        id: "api_design", type: "rating",
        label: "How well-designed and intuitive is the API?",
        min: 1, max: 5
      },
      {
        id: "sdk_quality", type: "rating",
        label: "Quality of official SDKs / libraries (if used)",
        min: 1, max: 5
      },
      {
        id: "time_to_first_call", type: "select",
        label: "How long did it take to make your first successful API call?",
        required: true,
        options: [
          { label: "Under 15 minutes",  value: "under_15m"  },
          { label: "15–60 minutes",     value: "under_1h"   },
          { label: "A few hours",       value: "hours"      },
          { label: "A full day",        value: "day"        },
          { label: "More than a day",   value: "over_day"   },
        ]
      },
      {
        id: "biggest_dx_pain", type: "select",
        label: "What's your biggest friction point as a developer?",
        required: true,
        options: [
          { label: "Docs are incomplete or outdated",    value: "bad_docs"          },
          { label: "SDK missing for my language",        value: "missing_sdk"       },
          { label: "Rate limits are too restrictive",    value: "rate_limits"       },
          { label: "Authentication is complex",          value: "auth_complexity"   },
          { label: "Inconsistent API design / naming",   value: "api_inconsistency" },
          { label: "Poor error messages",                value: "poor_errors"       },
          { label: "No sandbox / test environment",      value: "no_sandbox"        },
          { label: "Slow API response times",            value: "slow_api"          },
          { label: "Webhook reliability issues",         value: "webhook_issues"    },
          { label: "No issues — works great",            value: "none"              },
        ]
      },
      {
        id: "language", type: "select",
        label: "Primary programming language",
        options: [
          { label: "JavaScript / TypeScript", value: "js_ts"   },
          { label: "Python",                  value: "python"  },
          { label: "Go",                      value: "go"      },
          { label: "Java / Kotlin",           value: "java"    },
          { label: "Ruby",                    value: "ruby"    },
          { label: "PHP",                     value: "php"     },
          { label: "C# / .NET",              value: "dotnet"  },
          { label: "Rust",                    value: "rust"    },
          { label: "Other",                   value: "other"   },
        ]
      },
      {
        id: "missing_endpoint", type: "textarea",
        label: "Is there an API endpoint or SDK method you needed but couldn't find?",
        maxLength: 400
      },
      {
        id: "docs_feedback", type: "textarea",
        label: "Specific documentation feedback — what's missing or wrong?",
        maxLength: 600
      },
      {
        id: "would_recommend_api", type: "radio",
        label: "Would you recommend our API to another developer?",
        required: true,
        options: [
          { label: "Yes, without hesitation",  value: "yes"          },
          { label: "Yes, with some caveats",   value: "yes_caveats"  },
          { label: "Probably not",             value: "unlikely"     },
          { label: "No",                       value: "no"           },
        ]
      },
    ]
  },

  /* ── 13. Pricing & Value Perception ──────────────────────────────
     Measures how customers perceive your pricing relative to value.
     Simplified Van Westendorp + intent signals.
     Run quarterly or before a pricing change.
  ─────────────────────────────────────────────────────────────────── */
  pricingFeedback: {
    id: "pricingFeedback", version: 1,
    title: "Pricing and value feedback",
    description: "Pricing perception survey. Run quarterly or before a pricing change.",
    submitUrl: "/submit/pricingFeedback",
    fields: [
      {
        id: "current_plan", type: "select",
        label: "Which plan are you currently on?",
        required: true,
        options: [
          { label: "Free / Trial",   value: "free"       },
          { label: "Starter",        value: "starter"    },
          { label: "Pro / Growth",   value: "pro"        },
          { label: "Business",       value: "business"   },
          { label: "Enterprise",     value: "enterprise" },
        ]
      },
      {
        id: "value_perception", type: "radio",
        label: "How would you describe the value you get for what you pay?",
        required: true,
        options: [
          { label: "Exceptional — worth far more than I pay",   value: "exceptional"    },
          { label: "Good — fairly priced for the value",        value: "good"           },
          { label: "Acceptable — could be better",             value: "acceptable"     },
          { label: "Poor — I feel overcharged",                value: "poor"           },
          { label: "I'm on the free plan so I can't say yet",  value: "free_plan"      },
        ]
      },
      {
        id: "price_vs_competitors", type: "radio",
        label: "Compared to alternatives you've evaluated, how is our pricing?",
        options: [
          { label: "Much cheaper",       value: "much_cheaper"  },
          { label: "Slightly cheaper",   value: "cheaper"       },
          { label: "About the same",     value: "similar"       },
          { label: "Slightly more",      value: "more"          },
          { label: "Much more expensive",value: "much_more"     },
          { label: "Haven't compared",   value: "not_compared"  },
        ]
      },
      {
        id: "too_expensive_at", type: "text",
        label: "At what monthly price would this feel too expensive? (enter a number)",
        placeholder: "e.g. 200",
        pattern: "^[0-9]+$"
      },
      {
        id: "great_value_at", type: "text",
        label: "At what price would this feel like a great deal? (enter a number)",
        placeholder: "e.g. 80",
        pattern: "^[0-9]+$"
      },
      {
        id: "willing_to_pay_more", type: "radio",
        label: "Would you pay more if we added the features you most need?",
        options: [
          { label: "Yes, definitely",        value: "yes"        },
          { label: "Depends on the feature", value: "depends"    },
          { label: "No — price is already at my limit", value: "no" },
        ]
      },
      {
        id: "pricing_model_preference", type: "radio",
        label: "What pricing model do you prefer?",
        options: [
          { label: "Flat monthly fee",                value: "flat"         },
          { label: "Per seat / per user",             value: "per_seat"     },
          { label: "Usage-based (pay for what I use)", value: "usage_based" },
          { label: "Freemium with paid add-ons",      value: "freemium"     },
          { label: "Annual only (cheaper)",            value: "annual"       },
        ]
      },
      {
        id: "upgrade_blocker", type: "select",
        label: "What is preventing you from upgrading to a higher plan (if anything)?",
        options: [
          { label: "Cost is too high",              value: "cost"            },
          { label: "Current plan meets my needs",   value: "sufficient"      },
          { label: "Missing features I need",       value: "missing_features"},
          { label: "Need to get budget approval",   value: "budget_approval" },
          { label: "Not sure what the higher plan offers", value: "unclear"  },
          { label: "N/A — already on the top plan", value: "na"             },
        ]
      },
      {
        id: "pricing_comment", type: "textarea",
        label: "Any other thoughts on our pricing or packaging?",
        maxLength: 500
      },
    ]
  },



};
