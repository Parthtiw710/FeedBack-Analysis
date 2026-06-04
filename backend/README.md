# 📋 Feedback Forms Backend

A Node.js + Express backend for collecting, processing, and analysing customer feedback across 13 industry-standard form types. Built with PostgreSQL (AWS RDS) and an AI-powered daily insights pipeline.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (AWS RDS or local)
- npm

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the **backend folder**:

```
DATABASE_URL=postgresql://user:password@your-rds-host:5432/mydb
```

> ⚠️ Never commit `.env` to git. Add it to `.gitignore`.

### Run

```bash
# Development
node server.js

# With concurrently (from root)
npm run dev
```

Server starts on **http://localhost:4000**

---

## 📁 Project Structure

```
backend/
├── server.js        # Express server + pipeline (single merged file)
├── .env             # DB credentials (never commit this)
└── package.json
```

---

## 📝 Form Types

| ID | Name |
|----|------|
| `nps` | Net Promoter Score |
| `csat` | Customer Satisfaction Score |
| `ces` | Customer Effort Score |
| `productFeedback` | Product Feedback |
| `supportTicket` | Support Ticket |
| `bugReport` | Bug Report |
| `churnSurvey` | Churn / Cancellation Survey |
| `featureRequest` | Feature Request |
| `onboardingFeedback` | Onboarding Feedback |
| `winLoss` | Win / Loss Survey |
| `betaFeedback` | Beta Feature Feedback |
| `developerExperience` | Developer / API Experience |
| `pricingFeedback` | Pricing & Value Perception |

---

## 🔌 API Reference

### Forms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/forms` | List all form type IDs |
| GET | `/forms/:type` | Get full schema for a form |
| POST | `/submit/:type` | Submit a form response |

**Submit example:**
```bash
curl -X POST http://localhost:4000/submit/nps \
  -H "Content-Type: application/json" \
  -d '{"score": 9, "reason": "Great product!", "segment": "individual"}'
```

---

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics` | All processed rows (`?from` `?to` `?formType`) |
| GET | `/analytics/nps` | NPS score + distribution (`?days=30`) |
| GET | `/analytics/scores` | Per-form score averages + percentiles (`?days=30`) |
| GET | `/analytics/scores/trend` | Daily score trend for charts (`?days=30&formType=csat`) |
| GET | `/analytics/categories` | Category breakdown per form (`?days=30`) |
| GET | `/analytics/priority` | Priority distribution (`?days=30`) |
| GET | `/analytics/volume` | Daily submission volume (`?days=90`) |
| GET | `/analytics/sentiment` | Sentiment distribution (`?days=30`) |
| GET | `/analytics/churn` | Churn reasons + would-return rate (`?days=90`) |
| GET | `/analytics/winloss` | Win/loss rates + loss reasons (`?days=90`) |
| GET | `/analytics/pricing` | Pricing perception + Van Westendorp (`?days=90`) |

---

### AI Insights

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/insights` | All stored insights (`?limit=20`) |
| GET | `/insights/latest` | Most recent batch of insights |
| POST | `/insights/trigger` | Manually trigger the AI batch run |

---

### Submissions Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/submissions` | HTML dashboard of recent submissions |
| DELETE | `/submissions/:id` | Delete a submission by ID |

---

## ⚙️ How Processing Works

### Real-time Preprocessing

Every submission is preprocessed immediately after it is saved to the database via `setImmediate`. This extracts:

- **Scalar columns** — `score_primary`, `nps_segment`, `priority`, `sentiment_label`, etc.
- **JSONB columns** — `scores`, `categories`, `freetext`, `derived`, `clean_payload`

### Unprocessed Submission Catch-up

A built-in safety mechanism handles submissions that fail to process (e.g. after a server crash):

- `pendingProcessCount` tracks unprocessed submissions in memory
- `UNPROCESSED_BATCH_THRESHOLD = 10` — if 10 or more submissions are unprocessed, a catch-up run is triggered automatically
- On every server startup, the DB is checked for any unprocessed rows and catch-up runs immediately if needed

### Daily AI Batch

A cron job runs every night at **02:00** and:

1. Reads all processed submissions from the last 24 hours
2. Builds a structured summary batch (scores, NPS, churn, freetext samples, escalations)
3. Sends it to the AI agent
4. Stores insights in the `ai_insights` table

You can also trigger it manually via `POST /insights/trigger`.

---

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `submissions` | Raw form payloads as submitted |
| `processed_submissions` | Normalised, enriched data with scalar + JSONB columns |
| `ai_insights` | AI-generated insight batches |

---

## 🔒 Security

- Store all credentials in `.env` — never hardcode them
- `.env` must be in `.gitignore`
- RDS instance should use SSL (`rejectUnauthorized: false` for AWS RDS)
- Rotate your DB password immediately if it is ever accidentally exposed

---

## 📦 Dependencies

```json
"express"
"cors"
"pg"
"node-cron"
"dotenv"
```
