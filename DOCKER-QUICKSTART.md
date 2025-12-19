# Quick Docker Commands for Compressorr

## ✅ What's Ready
- Backend Docker image: **BUILT** ✓
- Frontend Docker image: **BUILT** ✓
- MongoDB image: **NEEDS PULLING** (network issue)

## 🚀 To Start (Once Network is Stable)

### Option 1: Start Everything
```powershell
cd a:\Resume-Projects\Compressorr
docker compose up -d
```

### Option 2: Pull MongoDB First
```powershell
# Pull MongoDB separately
docker pull mongo:latest

# Then start all services
docker compose up -d
```

### Option 3: Use Alternative MongoDB Version
If mongo:latest doesn't work, try mongo:7.0:
```powershell
# Edit docker-compose.yml and change image to mongo:7.0
docker pull mongo:7.0
docker compose up -d
```

## 📊 Check Status
```powershell
docker compose ps
```

## 📝 View Logs
```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
```

## 🛑 Stop Services
```powershell
docker compose down
```

## 🔄 Restart After Code Changes
```powershell
docker compose up -d --build
```

## 🌐 Access URLs
- Frontend: http://localhost:8080
- Backend: http://localhost:3000/api/health
- MongoDB: localhost:27017

---
See **DOCKERIZATION-COMPLETE.md** for full documentation.
