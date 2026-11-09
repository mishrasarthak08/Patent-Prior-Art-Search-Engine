# CLOUD DEPLOYMENT & ZERO-LOCAL INFRASTRUCTURE GUIDE
## Patent Prior-Art Search Engine
### Turnkey Cloud Architecture, Multi-Service Blueprints, and Production Deployment Runbook

---

## 1. ARCHITECTURE OVERVIEW: ZERO LOCAL RUNTIME

To transition the **Patent Prior-Art Search Engine** entirely away from local execution so that **nothing runs on your local machine**, the system is architected into three fully managed cloud tiers:

```mermaid
flowchart TD
    subgraph Clients["Global Web Access"]
        Users["Patent Practitioners & Attorneys<br/>(Chrome, Safari, Edge)"]
    end

    subgraph FrontendTier["Cloud Frontend Tier (Next.js 16)"]
        VercelRender["Vercel or Render Edge CDN<br/>(Static HTML + Turbopack SSR)"]
    end

    subgraph BackendTier["Cloud Compute & AI Tier (FastAPI)"]
        FastAPICloud["Managed Container (Render / Railway / Cloud Run)<br/>Python 3.12 + In-Process Dense & Lexical Search"]
    end

    subgraph DataTier["Cloud Database Tier (PostgreSQL 16)"]
        ManagedPG[("Managed Cloud PostgreSQL 16<br/>FORCE ROW LEVEL SECURITY (RLS)<br/>58 Gold Patents + Tenant Workspaces")]
    end

    Users -->|HTTPS / WSS| VercelRender
    VercelRender -->|REST API Requests| FastAPICloud
    FastAPICloud -->|Session Variables + RLS| ManagedPG
```

---

## 2. DEPLOYMENT OPTION A: 1-CLICK RENDER BLUEPRINT (RECOMMENDED)

The repository includes a production-ready Render Blueprint specification ([`render.yaml`](file:///Users/SarMish/Patent-Prior-Art-Search-Engine/render.yaml)) that automatically provisions all three components with zero manual configuration.

### What Render Automatically Provisions:
1. **`patent-platform-pg`**: Managed PostgreSQL 16 database with engine-level Row-Level Security.
2. **`patent-search-backend`**: FastAPI web service running Python 3.12, auto-migrating tables and auto-seeding the 58 gold battery publications on boot.
3. **`patent-search-frontend`**: Next.js 16 web application automatically linked to the backend's internal host.

### Step-by-Step Deployment:
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** &rarr; **Blueprint**.
3. Select your GitHub repository: `mishrasarthak08/Patent-Prior-Art-Search-Engine`.
4. Render detects [`render.yaml`](file:///Users/SarMish/Patent-Prior-Art-Search-Engine/render.yaml) and displays the 3 services.
5. Click **Apply**.
6. Render deploys the database, builds the backend, builds the frontend, and outputs two live HTTPS URLs:
   - Backend API: `https://patent-search-backend-xxxx.onrender.com`
   - Frontend App: `https://patent-search-frontend-xxxx.onrender.com`

---

## 3. DEPLOYMENT OPTION B: RAILWAY (ALL-IN-ONE)

Railway offers continuous deployment with built-in PostgreSQL plugins and container builds from GitHub.

### Step-by-Step Deployment:
1. Log into [Railway](https://railway.app).
2. Click **New Project** &rarr; **Deploy from GitHub repo**.
3. Select `mishrasarthak08/Patent-Prior-Art-Search-Engine`.
4. Add **PostgreSQL**: Click **New** &rarr; **Database** &rarr; **Add PostgreSQL**.
5. Set the following Environment Variables on the Backend service:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `CONFIDENTIAL_MODE`: `true`
   - `API_KEY`: `pat_live_prod_key`
6. Add a second service from the same repo for the Frontend:
   - Set Root Directory: `frontend`
   - Set `NEXT_PUBLIC_API_URL`: `${{patent-search-backend.RAILWAY_STATIC_URL}}`
7. Railway builds and exposes live public domains for both services.

---

## 4. DEPLOYMENT OPTION C: HYBRID VERCEL (FRONTEND) + CLOUD BACKEND

For optimal edge delivery and sub-50ms page loads, you can deploy the Next.js frontend to **Vercel** while hosting the backend and database on Render or Railway.

### Step-by-Step Deployment:
1. **Deploy Backend & Database** on Render or Railway (per Option A or B) and copy your live backend HTTPS URL (e.g. `https://patent-backend.onrender.com`).
2. Log into [Vercel](https://vercel.com).
3. Click **Add New...** &rarr; **Project** &rarr; Import `mishrasarthak08/Patent-Prior-Art-Search-Engine`.
4. Vercel automatically detects the [`vercel.json`](file:///Users/SarMish/Patent-Prior-Art-Search-Engine/vercel.json) configuration.
5. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://patent-backend.onrender.com`
   - `NEXT_PUBLIC_APP_API_KEY` = `dev_key` (or your production API key)
6. Click **Deploy**. Vercel compiles the 37 routes with Turbopack and assigns a production domain (e.g. `https://patent-prior-art.vercel.app`).

---

## 5. ENVIRONMENT VARIABLES REFERENCE

| Variable Name | Required | Default / Recommended Value | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql+psycopg://user:pass@host:5432/db` | Production PostgreSQL connection string (auto-normalized) |
| `CONFIDENTIAL_MODE` | Yes | `true` | Enforces zero socket egress to external AI models |
| `API_KEY` | Yes | `pat_live_prod_xxxx` | Master API key for backend endpoints |
| `JWT_SECRET_KEY` | Yes | Secure 64-char random hex string | Signs user authentication tokens |
| `NEXT_PUBLIC_API_URL` | Yes | `https://your-backend.onrender.com` | Public URL of the backend API |
| `NEXT_PUBLIC_APP_API_KEY` | No | `dev_key` | Matching public API key header |
| `EMAIL_BACKEND` | No | `smtp` (or `spool`) | `smtp` for live email delivery, `spool` for testing |
| `SMTP_HOST` | If SMTP | `smtp.sendgrid.net` / `smtp.mailgun.org` | Outgoing email server |
| `SMTP_PORT` | If SMTP | `587` | Outgoing SMTP TLS port |
| `SMTP_USER` | If SMTP | `apikey` | SMTP username |
| `SMTP_PASSWORD` | If SMTP | Cloud API token | SMTP password |

---

## 6. DECOMMISSIONING LOCAL PROCESSES (NOTHING RUNNING LOCALLY)

Once your cloud services are deployed and healthy:

1. **Stop Local Backend & Frontend Tasks**:
   - Background tasks `task-2786` (local Next.js on port 3001) and `task-3226` (local Uvicorn on port 8001) can be terminated immediately via `manage_task(Action='kill')`.
2. **Stop Local PostgreSQL**:
   - `brew services stop postgresql@16` or `pg_ctl stop`.
3. **Verify Pure Cloud Access**:
   - Open your deployed cloud URL (e.g. `https://patent-search-frontend.onrender.com` or `https://patent-prior-art.vercel.app`) in any browser or mobile device.
   - All searches, claim decompositions, claim charts, and dossier exports execute entirely on cloud infrastructure.

---
*Production cloud deployment guide verified on November 2026.*
