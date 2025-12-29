# Compressorr – Project-Based Interview Question Bank (60)

This document is **100% based on the Compressorr repository** (Node.js/Express backend, MongoDB, JWT auth + Google OAuth via Passport, Sharp/pdf-lib conversions, Docker Compose, Kubernetes manifests for EKS, Jenkins + SonarQube, Prometheus + Grafana).

**Project cues from repo**
- Backend: `backend/src/server.js`, routes in `backend/src/routes/*`, conversions in `backend/src/services/conversionService.js`
- Upload pipeline: Multer disk storage, saved under `uploads/` and served via `/uploads`
- Auth: JWT via `backend/src/middleware/auth.js`, signup/login in `backend/src/routes/auth.js`, OAuth via Passport config
- Observability: Prometheus endpoint `/metrics` using `backend/src/metrics.js`
- Infra: `docker-compose.yml`, Kubernetes manifests under `k8s/`, Jenkins + Sonar + monitoring documented in `README.md`

---

## Table of Contents
1. [MCQ (20)](#mcq-20)
2. [Scenario-Based (20)](#scenario-based-20)
3. [Project Q&A (20)](#project-qa-20)

---

## MCQ (20)

### MCQ 1
**In this project, which port does the backend *listen on inside the container* by default?**
- A) 5001
- B) 5000
- C) 8080
- D) 27017

**Answer: B (5000)**

**Explanation:** In `docker-compose.yml`, the backend container sets `PORT=5000` and maps `5001:5000`. That means the container listens on **5000**, while the host exposes it as **5001**.

---

### MCQ 2
**Which endpoint exposes Prometheus metrics in the backend?**
- A) `/api/metrics`
- B) `/metrics`
- C) `/api/health/metrics`
- D) `/admin/metrics`

**Answer: B (`/metrics`)**

**Explanation:** `backend/src/server.js` registers a route `app.get('/metrics', ...)` and returns `prom-client` registry metrics.

---

### MCQ 3
**What is the main reason this project uses Multer?**
- A) Server-side rendering
- B) JWT token generation
- C) Handling multipart file uploads
- D) MongoDB schema migrations

**Answer: C**

**Explanation:** In `backend/src/routes/api.js`, Multer is configured with `diskStorage` and used via `upload.single('file')` to accept uploaded images/PDFs.

---

### MCQ 4
**Which middleware protects routes like `/api/upload-image`?**
- A) `passport.authenticate('google')`
- B) `authenticateToken`
- C) `morgan('dev')`
- D) `cookieParser()`

**Answer: B (`authenticateToken`)**

**Explanation:** In `backend/src/routes/api.js`, protected routes are defined like `router.post('/upload-image', authenticateToken, upload.single('file'), ...)`.

---

### MCQ 5
**Where are uploaded files served from in the backend?**
- A) `/public` mapped to `frontend/`
- B) `/uploads` mapped to the `uploads/` folder
- C) `/static` mapped to `backend/src/`
- D) `/files` mapped to MongoDB GridFS

**Answer: B**

**Explanation:** `backend/src/server.js` uses `app.use('/uploads', express.static(uploadsDir));` so the URL prefix is `/uploads`.

---

### MCQ 6
**Which library is used to process images in conversion/compression?**
- A) `imagemagick`
- B) `sharp`
- C) `canvas`
- D) `gm`

**Answer: B (`sharp`)**

**Explanation:** `backend/src/services/conversionService.js` imports `const sharp = require('sharp');` and uses it for format conversion, resizing, and compression.

---

### MCQ 7
**Which library is used to work with PDFs in conversion/compression?**
- A) `pdf-lib`
- B) `pdfkit`
- C) `puppeteer`
- D) `wkhtmltopdf`

**Answer: A (`pdf-lib`)**

**Explanation:** `backend/src/services/conversionService.js` imports `const { PDFDocument } = require('pdf-lib');`.

---

### MCQ 8
**When the backend cannot connect to MongoDB on startup, what does the current implementation do?**
- A) Immediately exits the process
- B) Retries indefinitely until it connects
- C) Logs a warning and continues (DB features limited)
- D) Switches to PostgreSQL automatically

**Answer: C**

**Explanation:** In `backend/src/server.js`, MongoDB connect is wrapped in `try/catch`; on failure it logs a warning and keeps the server running (“App will run without database features”).

---

### MCQ 9
**Which authentication mechanism is used for API protection in normal requests?**
- A) Basic Auth
- B) JWT tokens (cookie or Authorization header)
- C) SAML assertions
- D) API keys stored in Redis

**Answer: B**

**Explanation:** Login/signup returns a JWT; `authenticateToken` verifies the token and attaches `req.user`.

---

### MCQ 10
**What is one security-relevant cookie attribute set when issuing the token cookie?**
- A) `httpOnly: true`
- B) `domain: '*'`
- C) `encrypted: true`
- D) `localOnly: true`

**Answer: A**

**Explanation:** In `backend/src/routes/auth.js`, `res.cookie('token', token, { httpOnly: true, ... })` reduces XSS token theft risk.

---

### MCQ 11
**Which statement best describes the job tracking mechanism?**
- A) Jobs are tracked in Redis Streams
- B) Jobs are tracked in a MongoDB collection via a minimal Mongoose model
- C) Jobs are tracked only in-memory
- D) Jobs are tracked in a SQL table

**Answer: B**

**Explanation:** `backend/src/controllers/fileController.js` defines a `jobSchema` and creates `JobModel` using Mongoose.

---

### MCQ 12
**Why does `docker-compose.yml` define a healthcheck for MongoDB?**
- A) To auto-create MongoDB users
- B) To ensure backend only starts after MongoDB is responsive
- C) To enable SSL on MongoDB
- D) To replicate MongoDB to a secondary node

**Answer: B**

**Explanation:** `backend` depends on `mongodb` with `condition: service_healthy`, reducing startup race conditions.

---

### MCQ 13
**What is the maximum upload file size configured for general uploads in the API router?**
- A) 5MB
- B) 10MB
- C) 50MB
- D) 100MB

**Answer: C (50MB)**

**Explanation:** In `backend/src/routes/api.js`, Multer is created with `limits: { fileSize: 50 * 1024 * 1024 }`.

---

### MCQ 14
**What is the maximum upload file size configured for profile pictures?**
- A) 1MB
- B) 2MB
- C) 5MB
- D) 10MB

**Answer: C (5MB)**

**Explanation:** `uploadProfile` uses `limits: { fileSize: 5 * 1024 * 1024 }`.

---

### MCQ 15
**Which route returns a simple service health status in the API?**
- A) `GET /api/health`
- B) `GET /health`
- C) `GET /api/status`
- D) `GET /metrics/health`

**Answer: A**

**Explanation:** In `backend/src/routes/api.js`, `router.get('/health', ...)` returns `{ status: 'ok' }`.

---

### MCQ 16
**Which statement about CORS in this project is most accurate?**
- A) CORS blocks all origins in production and development
- B) CORS allows a set of known origins, but in development it effectively allows all
- C) CORS is disabled entirely
- D) CORS only permits `localhost:8080`

**Answer: B**

**Explanation:** `backend/src/server.js` checks `allowedOrigins`, but returns `callback(null, true)` even for unknown origins (comment suggests permissive development behavior).

---

### MCQ 17
**Which metric type is used to count processed jobs?**
- A) Gauge
- B) Counter
- C) Histogram
- D) Summary

**Answer: B (Counter)**

**Explanation:** `backend/src/metrics.js` uses `new client.Counter({ name: 'filetool_jobs_total', ... })`.

---

### MCQ 18
**In the conversion service, what does the `QUALITY_LEVELS` object represent?**
- A) Role-based access control levels
- B) Image compression presets (quality/resize/target reduction)
- C) MongoDB connection pooling settings
- D) CPU throttling presets for Kubernetes

**Answer: B**

**Explanation:** `backend/src/services/conversionService.js` defines `QUALITY_LEVELS` with fields like `quality`, `resize`, and `targetReduction`.

---

### MCQ 19
**Which module is responsible for issuing JWT tokens during login/signup?**
- A) `backend/src/metrics.js`
- B) `backend/src/middleware/auth.js`
- C) `backend/src/services/conversionService.js`
- D) `frontend/auth.js`

**Answer: B**

**Explanation:** `backend/src/routes/auth.js` imports `{ generateToken }` from `backend/src/middleware/auth.js`.

---

### MCQ 20
**Why does the backend create `uploads/` and `uploads/profiles/` on startup?**
- A) To store JWT secret keys
- B) To avoid errors when Multer writes files to disk
- C) To store MongoDB backups
- D) To store Prometheus TSDB data

**Answer: B**

**Explanation:** `backend/src/server.js` checks directories and creates them with `fs.mkdirSync(..., { recursive: true })` to prevent runtime upload failures.

---

## Scenario-Based (20)

### Scenario 1 — Host/Container port confusion
**Scenario:** A teammate tries to call `http://localhost:5000/api/health` after running Docker Compose and gets connection refused.

**Answer (what to do + why):**
- Use `http://localhost:5001/api/health` on the host.
- Reason: `docker-compose.yml` maps `5001:5000`. The container listens on 5000, but the host port is 5001.
- Verify with `docker ps` and check published ports, or inspect the compose file.

---

### Scenario 2 — Files download URL 404
**Scenario:** The API returns `downloadUrl: /uploads/<file>` but the browser gets 404.

**Answer:**
- Confirm `backend/uploads` is mounted to `/app/uploads` in Docker (`docker-compose.yml` volume `./backend/uploads:/app/uploads`).
- Verify the file is actually written where the server expects (`uploadsDir` in `backend/src/server.js`).
- Ensure the reverse proxy or frontend isn’t intercepting `/uploads/*`.
- In Kubernetes, ensure a persistent volume (or correct container storage strategy) exists; otherwise the file may disappear on pod restart.

---

### Scenario 3 — MongoDB down, but app still runs
**Scenario:** MongoDB is down. Users can still access static pages, but “history” and “my-jobs” endpoints error.

**Answer:**
- Expected behavior: `backend/src/server.js` continues on DB failure.
- For API routes that require DB, decide on a consistent strategy:
  - Return `503 Service Unavailable` with a message like “Database unavailable”.
  - Or queue jobs in-memory temporarily (not recommended for production).
- Add health checks that include DB status if DB features are core.

---

### Scenario 4 — Compression doesn’t reduce PNG size
**Scenario:** User uploads a PNG and “compression” sometimes produces a bigger file.

**Answer:**
- This can happen: PNG is lossless; recompressing may not help, and converting to WebP with certain settings might produce larger output on simple images.
- In `conversionService.compressImage`, PNG at low/medium converts to WebP. Validate output format expectations and ensure UI explains format changes.
- Use content-aware strategy:
  - Detect if WebP output is larger than original; if so, keep original or adjust quality/effort.
  - Provide “preserve format” option vs “best size” option.

---

### Scenario 5 — Token works in Postman but not in browser
**Scenario:** Protected routes work in Postman but fail in browser with 401.

**Answer:**
- Confirm cookie settings: `httpOnly`, `sameSite: 'lax'`, and `secure` only in production.
- Ensure frontend calls include `credentials: 'include'` and backend CORS has `credentials: true` (it does).
- If using Authorization header instead, confirm frontend sets `Authorization: Bearer <token>`.
- Verify origin/port mismatch (e.g., frontend at 8080, backend at 5001).

---

### Scenario 6 — Profile picture rejects valid file
**Scenario:** A user uploads a `.jpg` but gets “Only image files are allowed.”

**Answer:**
- The profile upload filter checks `file.mimetype.startsWith('image/')`. If the client sends an incorrect mimetype, it fails.
- Fix by validating file signature server-side (more robust) or relaxing filter to check extension + mimetype.
- Also ensure the client uses `multipart/form-data` correctly.

---

### Scenario 7 — Job status needs real-time updates
**Scenario:** Product wants live progress bars for conversion/compression.

**Answer:**
- This repo already initializes Socket.IO in `backend/src/server.js`.
- Extend job processing to emit events:
  - On job create: emit `job:created` with jobId
  - During conversion steps: emit `job:progress` with percent
  - On finish/failure: emit `job:completed` / `job:failed`
- Persist status updates in MongoDB so reconnects can catch up.

---

### Scenario 8 — Large file uploads cause server memory pressure
**Scenario:** Under load, the backend crashes when many users upload files.

**Answer:**
- Multer disk storage helps, but you still need:
  - Reverse proxy request size limits (Nginx) aligned with Multer limits.
  - Rate limiting and/or concurrency limits for conversions.
  - Worker queue architecture (BullMQ/Redis) so the web process doesn’t do CPU-heavy work inline.
- Also consider `sharp` CPU usage and use Node cluster or separate worker service.

---

### Scenario 9 — “My Jobs” shows nothing for some users
**Scenario:** Users can convert files, but `/api/my-jobs` is empty.

**Answer:**
- Check that `req.user.userId` is correctly populated by `authenticateToken`.
- Confirm that job creation sets `userId: req.user.userId` (it does for image conversion/compress).
- Ensure the frontend user is actually logged in and using the same token.
- If OAuth users have different identifiers, ensure token generation encodes correct `userId`.

---

### Scenario 10 — `uploads/` grows without bound
**Scenario:** Disk fills up in production after many conversions.

**Answer:**
- Implement retention policy:
  - Delete generated outputs after N days, or on user request.
  - Provide a cron job/K8s CronJob to clean old files.
- Alternatively, store outputs in object storage (S3) and only keep metadata in MongoDB.

---

### Scenario 11 — Prometheus scraping fails
**Scenario:** Prometheus shows target down for backend metrics.

**Answer:**
- Ensure Prometheus is scraping correct port/path:
  - Backend listens on 5000 in cluster; in docker compose it’s exposed on 5001.
  - Endpoint is `/metrics` (not `/api/metrics`).
- Confirm the backend route sets `Content-Type` via `metrics.register.contentType`.
- If behind Nginx/Ingress, ensure it routes `/metrics` to backend.

---

### Scenario 12 — SonarQube flags code smells in conversionService
**Scenario:** SonarQube complains about “magic numbers” and unused variables.

**Answer:**
- Extract presets into named constants (already partly done with `QUALITY_LEVELS`).
- Remove unused variables (e.g., unused destructured `quality`).
- Prefer standard APIs (`Number.parseInt`) and avoid confusing negated conditions.
- Keep linting consistent via CI gate in Jenkins.

---

### Scenario 13 — CORS issues with new domain
**Scenario:** You deploy frontend on a new domain, and API requests fail due to CORS.

**Answer:**
- Add the new domain to `FRONTEND_URL` env var or allowed origin set.
- Because CORS code is permissive in development, test in production mode too.
- Ensure `credentials` behavior matches cookie-based auth.

---

### Scenario 14 — Kubernetes pod restarts lose uploaded files
**Scenario:** In EKS, files disappear after pod restart.

**Answer:**
- Container filesystem is ephemeral. Use:
  - PersistentVolume/PVC mounted to `/app/uploads`, or
  - External storage (S3) for uploads/outputs.
- For stateless pods, object storage is typically the right approach.

---

### Scenario 15 — Conversions are slow
**Scenario:** Image conversion takes several seconds and affects API latency.

**Answer:**
- Separate “request” from “processing”:
  - On upload: store file + create job record, return jobId immediately.
  - Process in background worker(s) and update job status.
- Add caching for repeated conversions (hash input + options).
- Scale workers horizontally in Kubernetes.

---

### Scenario 16 — JWT secret leaked
**Scenario:** Someone accidentally commits a real JWT secret.

**Answer:**
- Rotate the secret immediately (invalidate existing tokens).
- Remove it from git history if required (BFG / filter-repo) and from CI logs.
- Use secret management: Kubernetes Secrets, AWS Secrets Manager, or Jenkins credentials.
- Update `.env` usage and enforce “no secrets in repo”.

---

### Scenario 17 — `/auth/me` intermittently fails
**Scenario:** Users report sporadic failures on `/auth/me`.

**Answer:**
- `/auth/me` reads token from cookie or Authorization header; failures often come from:
  - Token expired
  - Clock skew between services
  - Cookie not sent due to SameSite/Secure
- Add better error telemetry and consistent token expiration policy.

---

### Scenario 18 — Need to support AVIF/WEBP everywhere
**Scenario:** Some browsers can’t display AVIF/WEBP outputs.

**Answer:**
- Offer a “compatibility mode” that outputs JPEG/PNG.
- Store output format in job metadata and serve correct content-type.
- In UI, detect supported formats and adjust allowed options.

---

### Scenario 19 — Admin wants to see global job metrics
**Scenario:** Admin dashboard should show total jobs by type and status.

**Answer:**
- Reuse `filetool_jobs_total{type,status}` counter.
- Build Grafana panels using PromQL like:
  - `sum by (type) (rate(filetool_jobs_total[5m]))`
  - `sum by (status) (increase(filetool_jobs_total[1h]))`
- Ensure you increment the counter consistently on success/failure in controllers.

---

### Scenario 20 — Need rollback-safe deployments
**Scenario:** A new backend release breaks image compression.

**Answer:**
- Use:
  - Kubernetes rolling updates with readiness probes and maxUnavailable=0.
  - Jenkins pipeline with staged deploy + health check + automatic rollback.
  - Versioned Docker images (avoid `latest` in production).
- Ensure backward compatibility for Mongo schemas and API contracts.

---

## Project Q&A (20)

### Q1 — Describe the full request flow for image compression
**Answer:**
- Client calls `POST /api/compress-image` with `multipart/form-data`.
- `authenticateToken` validates JWT and sets `req.user`.
- Multer stores the file on disk under `uploads/`.
- Controller reads file metadata using `sharp`, estimates size via `estimateCompressedSize`, creates a Job document in MongoDB, then calls `conversion.compressImage`.
- After output is written, controller updates job status/output path and responds with `downloadUrl` and size metrics.

---

### Q2 — Why does the project map `./backend/src:/app/src` in Docker Compose?
**Answer:**
- It enables rapid iteration: you can change backend code locally and have the container reflect it immediately.
- Trade-off: in production, you typically do **not** bind-mount source code (use an immutable image instead) to avoid drift and security issues.

---

### Q3 — What is the difference between “convert” and “compress” in this repo?
**Answer:**
- **Convert:** changes output format (e.g., PNG → JPEG/WEBP/AVIF) while aiming for high quality. Implemented by `convertImage`.
- **Compress:** aims to reduce file size, often keeping original format (but the PNG path may switch to WebP for better compression). Implemented by `compressImage`.
- Both use `sharp`, but with different quality/resize goals.

---

### Q4 — Explain how JWT authentication is implemented
**Answer:**
- On login/signup, the server generates a JWT token and sets it in an `httpOnly` cookie.
- For protected routes, `authenticateToken` reads the token (cookie or header), verifies it, and attaches decoded user data to `req.user`.
- Controllers use `req.user.userId` to associate jobs/settings with the authenticated user.

---

### Q5 — How does the project handle Google OAuth and why does it also use sessions?
**Answer:**
- OAuth via Passport typically uses session state to complete redirect-based flows.
- The project configures `express-session` and initializes Passport with `passport.initialize()` and `passport.session()`.
- After OAuth login, a JWT can still be issued for API usage, but session helps manage the OAuth handshake.

---

### Q6 — What are the risks of serving frontend static files from the same Express server?
**Answer:**
- Pros: simpler deployment, same origin can reduce CORS complexity.
- Risks:
  - Tight coupling between frontend and backend scaling.
  - Static file caching concerns.
  - Security: misconfigured routes could expose files.
- In production, a separate Nginx or CDN is typically better (this repo also has a frontend Nginx approach).

---

### Q7 — What would you change to make file processing more reliable at scale?
**Answer:**
- Move CPU-heavy conversion/compression to a worker queue.
- Store artifacts in S3 (or equivalent) rather than local disk.
- Make the backend stateless so Kubernetes scaling and restarts are safe.
- Add retry logic and idempotency keys (jobId + options hash).

---

### Q8 — How would you secure the `/metrics` endpoint?
**Answer:**
- Options (pick based on environment):
  - Only expose it on the cluster network (no public ingress).
  - Add auth (basic auth or bearer token) in non-internal networks.
  - Allowlist Prometheus IP/service account.
- Rationale: metrics can leak operational info.

---

### Q9 — Why is `allowedOrigins` implemented with a Set, and what’s a concern in the current logic?
**Answer:**
- Set gives O(1) lookup and avoids duplicates.
- Concern: the code currently falls back to allowing all origins (returns `callback(null, true)` even when origin isn’t recognized), which may be too permissive for production.

---

### Q10 — What data should be stored in MongoDB vs on disk/object storage?
**Answer:**
- MongoDB: job metadata (userId, status, timestamps, output URL, sizes, options).
- Disk/object storage: actual files (inputs/outputs).
- Reason: DB is not optimized for large binary blobs unless you use GridFS; object storage is cheaper and scales better.

---

### Q11 — How does the system calculate “accuracyPercent” for size estimation?
**Answer:**
- It compares estimated compressed size vs actual compressed size.
- The controller computes an estimation error percent and derives accuracy as `100 - error` capped at 0.
- This gives a user-friendly measure of how close estimation was.

---

### Q12 — Where would you add instrumentation to count successful vs failed jobs?
**Answer:**
- Increment `filetool_jobs_total` in controllers:
  - On job success: `{ type: 'image-compress', status: 'completed' }`
  - On job failure: `{ type: 'image-compress', status: 'failed' }`
- Also update DB job status so UI history matches metrics.

---

### Q13 — What happens if `uploads/` directory doesn’t exist?
**Answer:**
- The server creates it at startup (`fs.mkdirSync(..., { recursive: true })`).
- Without that, Multer disk storage would fail writing, causing upload endpoints to error.

---

### Q14 — Explain how Docker Compose “depends_on” with healthchecks improves reliability
**Answer:**
- It ensures MongoDB is not just started but **healthy** before backend begins.
- Prevents initial connection failures and noisy logs during startup.
- Note: in Kubernetes, you’d use readiness probes and init containers instead.

---

### Q15 — What improvements would you make for error handling in conversion paths?
**Answer:**
- Normalize errors (validation vs processing vs storage vs DB) into consistent HTTP codes.
- On failure, update job status to `failed` and store error message safely.
- Ensure temporary input files are deleted even on errors (use `finally`).

---

### Q16 — What are the benefits of Kubernetes manifests included in this repo?
**Answer:**
- They describe desired state for backend/frontend/mongo/monitoring.
- Enable scaling, rolling updates, and declarative infrastructure.
- Fit EKS deployment described in README (alongside Docker Compose for local/dev).

---

### Q17 — How would you implement rate limiting for upload endpoints?
**Answer:**
- Add a middleware (e.g., express-rate-limit) keyed by userId/IP.
- Different limits per endpoint: stricter for heavy operations like compression.
- In Kubernetes, also enforce via ingress/controller if needed.

---

### Q18 — Why is serving `index.html` on unknown routes useful here?
**Answer:**
- It supports client-side routing for the frontend pages.
- The backend excludes `/api`, `/auth`, and paths with extensions from this fallback to prevent accidental routing of API calls.

---

### Q19 — What would you test first if “restore image” endpoint returns corrupted output?
**Answer:**
- Validate input format handling in `conversionService` restore path (Sharp options).
- Confirm output extension matches actual encoded format.
- Check that the controller isn’t overwriting files and that file paths are correct.
- Add test cases with known images and pixel-level comparisons for critical paths.

---

### Q20 — What’s one CI/CD practice you would enforce for this repo?
**Answer:**
- Treat SonarQube quality gate as a build breaker (no deploy if gate fails).
- Build immutable, versioned images and deploy by tag.
- Run basic API smoke tests (health + auth + one conversion) before promoting to production.

---

### Notes for Interviewers
- All questions can be answered by pointing to actual implementation decisions in the repo (Express routes, Multer config, JWT cookie handling, Sharp/pdf-lib conversion code, and the infra/monitoring stack defined in YAML).
- If you want, you can ask candidates to open specific files and explain them live (great for practical interviews).
