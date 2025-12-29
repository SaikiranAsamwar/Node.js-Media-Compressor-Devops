# Compressorr — Full Project Explanation (Flow + Interview Justification)

This write-up explains **what Compressorr is**, **how it works end-to-end**, and **why the design choices make sense**. It is based directly on the repository structure and implementation:

- Backend entry: `backend/src/server.js`
- API routes: `backend/src/routes/api.js`, auth routes: `backend/src/routes/auth.js`
- Auth middleware: `backend/src/middleware/auth.js`
- File processing: `backend/src/services/conversionService.js`
- Controllers/job tracking: `backend/src/controllers/fileController.js`
- Metrics: `backend/src/metrics.js` and backend route `GET /metrics`
- Local/compose deployment: `docker-compose.yml`
- Kubernetes deployment manifests: `k8s/`
- CI/CD and quality tooling referenced by: `Jenkinsfile`, `sonar-project.properties`, and README guidance

---

## 1) What the project is (problem + solution)

**Compressorr** is a media conversion and compression platform.

**Problem it solves:** Users often need to quickly convert images to other formats (JPEG/PNG/WebP/AVIF), compress files to reduce size, or run “restore/enhance” style operations — while still keeping track of what they processed and being able to re-download outputs.

**Solution in this repo:**
- A **Node.js + Express** backend exposes a set of protected endpoints for file processing.
- Users authenticate using **JWT** (cookie-based by default) and optionally **Google OAuth** (Passport).
- Uploads are accepted using **Multer** and stored on disk under `uploads/`.
- Image processing uses **Sharp**; PDF operations use **pdf-lib**.
- Each operation creates a **Job** record (MongoDB via Mongoose) so users can see their history.
- The backend exposes **Prometheus metrics** at `/metrics`, allowing dashboards and alerting.
- The repo includes **Docker Compose** for local deployment and **Kubernetes manifests** for production-style deployment (EKS).

---

## 2) Architecture overview

### Runtime components

1. **Frontend**: Static HTML/CSS/JS (also supported with an Nginx container for serving).
2. **Backend API**: Express server handling auth, uploads, processing, and history.
3. **Database**: MongoDB for users + jobs + settings.
4. **Uploads storage**: Local filesystem (`uploads/`) for development/demo.
5. **Monitoring**: Prometheus scrapes backend `/metrics`; Grafana visualizes trends.

### How it’s wired in Docker Compose

From `docker-compose.yml`:
- MongoDB runs as a container and has a healthcheck.
- Backend runs with container port **5000**, exposed on host port **5001** (`5001:5000`).
- Frontend runs behind port **8080**.
- A shared docker network connects them.
- Backend has a volume mount for uploads (`./backend/uploads:/app/uploads`).

This means:
- From your machine you call the backend at `http://localhost:5001/...`.
- Inside the Docker network, services talk to `http://backend:5000` and MongoDB at `mongodb://mongodb:27017/...`.

---

## 3) Backend startup flow

On startup (`backend/src/server.js`):
1. Configures CORS, JSON parsing, cookies, and request logging.
2. Configures `express-session` and Passport (needed for OAuth flows).
3. Ensures directories exist:
   - `uploads/`
   - `uploads/profiles/`
   This prevents runtime failures when Multer tries to write files.
4. Serves static resources:
   - `/uploads` → files from `uploads/`
   - `/` → frontend files from `frontend/`
5. Registers routes:
   - `/auth` → authentication
   - `/api` → protected file operations + profile/settings
6. Exposes `/metrics` for Prometheus.
7. Connects to MongoDB. Notably, if Mongo is unavailable the code logs a warning and **keeps the API running**, so non-DB features can still work.
8. Starts the HTTP server and initializes Socket.IO (foundation for real-time features).

---

## 4) Authentication flow (JWT + optional OAuth)

### A) Signup
Route: `POST /auth/signup`

What happens:
- Input is validated (email format, min password length, min username length).
- The user is created in MongoDB.
- A JWT is created and returned.
- The JWT is also set as an **httpOnly cookie** (`token`).

Why it’s a good design choice:
- JWT makes API auth **stateless** and scalable.
- httpOnly cookies reduce token theft via XSS.

### B) Login
Route: `POST /auth/login`

What happens:
- Looks up user by email.
- Compares password using the user model’s password compare function.
- Issues JWT + sets cookie like signup.

### C) Get current user
Route: `GET /auth/me`

What happens:
- Reads JWT from cookie or Authorization header.
- Verifies JWT.
- Returns the user profile (excluding password).

### D) Protected API routes
Most `/api/*` routes are protected by `authenticateToken` (`backend/src/middleware/auth.js`).

What that middleware does:
- Extracts token
- Verifies JWT
- Attaches decoded payload to `req.user`
- Calls `next()` to continue

**Result:** Controllers can safely do `req.user.userId` to scope access and data writes.

---

## 5) File-processing flow (end-to-end)

The key design pattern is: **Route → Auth middleware → Multer upload → Controller → Service → Persist job → Respond**.

### Flow 1 — Image convert (format conversion)
Route: `POST /api/upload-image`

Steps:
1. **Authenticate**: `authenticateToken` ensures the request is from a valid user.
2. **Upload**: Multer writes the file into `uploads/`.
3. **Create job**: Controller creates a Job record in MongoDB with status `pending`.
4. **Process**: Controller calls `conversionService.convertImage(...)`.
   - Uses Sharp to re-encode into the requested format.
   - Applies quality/resize presets (via `QUALITY_LEVELS`) depending on level.
5. **Finalize**:
   - Writes output file to disk.
   - Updates Job record: status `completed`, output path, output name, compressed size.
6. **Response**:
   - Returns `jobId`, `downloadUrl`, original/compressed sizes, format, level.

What interviewers usually like here:
- Clear separation of responsibilities (HTTP vs processing).
- Job metadata makes the system traceable and user-friendly.
- Output naming avoids collisions.

### Flow 2 — Image compress (reduce size)
Route: `POST /api/compress-image`

Key differences from convert:
- Reads image metadata to determine original format.
- Computes an **estimated compressed size** before actual compression.
- Applies compression settings:
  - JPEG: adjusts quality, uses `mozjpeg`, progressive mode.
  - PNG: for some levels may convert to WebP for better reduction.
  - Modern formats: WebP/AVIF supported.
- Returns **estimated vs actual** reduction and an “accuracy” score.

Interview justification:
- This demonstrates product thinking (setting expectations with estimates).
- Shows understanding of format trade-offs (lossless vs lossy).

### Flow 3 — Image restore/enhance
Route: `POST /api/restore-image`

What to explain:
- “Restore” is an enhancement pipeline; true restoration of detail lost to lossy compression is not perfect.
- The project demonstrates how to apply high-quality output settings and optional upscaling presets.

Interview justification:
- You can clearly state the limitations and why it’s still valuable as a feature.

### Flow 4 — PDF operations
Route: `POST /api/upload-pdf`

Implementation highlights:
- Uses `pdf-lib` to load and write PDFs.
- Produces an output artifact and returns a download URL.

Interview justification:
- Multi-format support increases the platform’s usefulness.

---

## 6) Job tracking & history (why it exists)

A central feature is that every processing operation creates a **Job** record:
- `jobId` (UUID)
- `userId` (links to the authenticated user)
- `type` (convert/compress/restore/pdf)
- `status` (pending/completed/failed)
- `inputName`, `outputName`, `outputPath`
- `originalSize`, `compressedSize`
- `createdAt`

Why this matters in interviews:
- It proves you thought beyond “process and return file.”
- Enables “my jobs/history”, status tracking, and future async/background processing.
- Is a clean stepping stone to a queue/worker architecture.

---

## 7) Serving output files (download flow)

Outputs are served from Express static middleware:
- URL: `/uploads/<filename>`
- Backed by filesystem directory: `uploads/`

Why this design is acceptable (and what to say about production):
- Works well for demos and local deployments.
- In Kubernetes/production, container disk is ephemeral, so the natural upgrade path is:
  - Use a PersistentVolume (PVC) OR
  - Store artifacts in object storage (S3) and keep only URLs/metadata in MongoDB.

---

## 8) Observability (Prometheus + Grafana)

The backend exposes `/metrics` using `prom-client` (`backend/src/metrics.js`).

A key metric is a counter:
- `filetool_jobs_total{type,status}`

How you can explain its value:
- Counters support dashboards and alerting:
  - Throughput: jobs/min by type
  - Failure rate: failed/completed ratios
- Shows production readiness beyond core functionality.

---

## 9) DevOps story (CI/CD + quality)

This repo is not just application code; it includes production tooling patterns:

### Docker
- Reproducible builds (backend/frontend Dockerfiles).
- Docker Compose used for quick local environment bring-up.

### Kubernetes (EKS-style)
- Manifests under `k8s/` for backend, frontend, mongo, and monitoring.
- Great interview topic: readiness/liveness probes, secrets, config maps, scaling.

### Jenkins + SonarQube
- Jenkins pipeline automates building, testing, and deploying.
- SonarQube enforces maintainability/security standards.

Why interviewers care:
- It demonstrates that you can deliver a system that’s deployable and maintainable, not only “works on my machine.”

---

## 10) Key engineering decisions (the “why” behind the code)

Use these points to justify your design choices quickly:

1. **JWT + protected routes**: scalable stateless API security; cookies simplify browser sessions.
2. **Multer disk storage**: simplest reliable upload approach; easy to containerize.
3. **Sharp**: fast and stable image processing, supports modern formats.
4. **Job persistence**: history/auditability and foundation for background workers.
5. **Prometheus metrics**: operational visibility for production environments.
6. **Docker + K8s manifests**: shows readiness for real deployment environments (EKS).

---

## 11) Realistic improvements (great answers for “what would you do next?”)

If asked how you would evolve the system:
- Move conversion into a worker queue (BullMQ/Redis) to decouple HTTP from CPU-heavy tasks.
- Store artifacts in S3 (or equivalent) so pods are stateless.
- Add stricter production CORS rules and rate limiting for upload endpoints.
- Add consistent error handling: mark jobs failed, return proper error codes, clean up temp files.
- Add structured logging and tracing to debug issues across services.

---

## 12) 60–90 second interviewer pitch (ready to speak)

“Compressorr is a full‑stack media conversion and compression platform. Users sign up or log in and receive a JWT stored in an httpOnly cookie. All file endpoints are protected by a JWT middleware. Users upload images or PDFs through Multer, the backend stores the files in an uploads directory, and then the controllers call a conversion service that uses Sharp for images and pdf-lib for PDFs. Each operation creates a Job record in MongoDB, so users can view history, status, and download links. The backend exposes Prometheus metrics at /metrics and the repo includes monitoring dashboards, plus Docker Compose for local deployment and Kubernetes manifests for an EKS-style production deployment. CI/CD is designed around Jenkins and SonarQube so code quality and deployment can be automated.”
