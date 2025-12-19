# Compressorr - Docker Deployment Guide

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Docker Compose v2.x or higher

### Start the Application

1. **Clone and navigate to the project**
   ```bash
   cd Compressorr
   ```

2. **Create environment file (optional)**
   ```bash
   copy .env.example .env
   # Edit .env with your configurations if needed
   ```

3. **Start all services**
   ```bash
   docker compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000
   - MongoDB: localhost:27017

### Stop the Application
```bash
docker compose down
```

### Stop and remove volumes (complete cleanup)
```bash
docker compose down -v
```

## Services

### Frontend (Port 8080)
- Nginx serving static HTML/JS/CSS files
- Proxies API requests to backend
- Auto-restart enabled

### Backend (Port 3000)
- Node.js/Express API server
- Handles file conversions, authentication, user management
- Connected to MongoDB
- Auto-restart enabled

### MongoDB (Port 27017)
- Persistent data storage
- Database: `filetool`
- Data persisted in Docker volume

## Useful Commands

### View logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

### Restart a service
```bash
docker compose restart backend
```

### Rebuild after code changes
```bash
# Rebuild all services
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build backend
```

### Check service status
```bash
docker compose ps
```

### Access container shell
```bash
# Backend
docker exec -it compressorr-backend sh

# Frontend
docker exec -it compressorr-frontend sh

# MongoDB
docker exec -it compressorr-mongodb mongosh
```

### Create admin user
```bash
docker exec -it compressorr-backend npm run create-admin
```

## Environment Variables

Configure these in `.env` file (copy from `.env.example`):

- `JWT_SECRET` - Secret key for JWT tokens
- `SESSION_SECRET` - Secret key for sessions
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (optional)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (optional)
- `GOOGLE_CALLBACK_URL` - Google OAuth callback URL

## Troubleshooting

### Port already in use
If ports 3000, 8080, or 27017 are already in use:

1. Edit `docker-compose.yml` to change port mappings:
   ```yaml
   ports:
     - "NEW_PORT:CONTAINER_PORT"
   ```

### MongoDB connection issues
- Wait for MongoDB health check to pass (check with `docker compose ps`)
- View MongoDB logs: `docker compose logs mongodb`

### Backend not starting
- Check logs: `docker compose logs backend`
- Ensure MongoDB is healthy: `docker compose ps`
- Verify environment variables in `.env`

### Frontend can't reach backend
- Check nginx.conf proxy settings
- Ensure backend is running: `docker compose ps backend`
- Check backend logs for errors

### Clear everything and start fresh
```bash
docker compose down -v
docker system prune -f
docker compose up -d --build
```

## Development Mode

For development with hot-reload:

1. Update `docker-compose.yml` backend service:
   ```yaml
   command: npm run dev
   volumes:
     - ./backend:/app
     - /app/node_modules
   ```

2. Restart services:
   ```bash
   docker compose up -d --build
   ```

## Production Deployment

For production:

1. Update `.env` with secure secrets
2. Consider using Docker secrets or environment variable injection
3. Set up reverse proxy (nginx/Traefik) with SSL
4. Configure proper MongoDB authentication
5. Set resource limits in docker-compose.yml
6. Enable monitoring and logging

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│   MongoDB   │
│   (nginx)   │     │  (Node.js)  │     │             │
│   :8080     │     │    :3000    │     │   :27017    │
└─────────────┘     └─────────────┘     └─────────────┘
```

All services communicate through the `compressorr-network` bridge network.

## Volumes

- `mongodb_data` - Persists MongoDB database files
- `./backend/uploads` - Mounted for file uploads (temporary storage)

## Health Checks

All services include health checks:
- **MongoDB**: Responds to ping command
- **Backend**: HTTP health check on `/api/health`
- **Frontend**: HTTP check on root path

View health status: `docker compose ps`
