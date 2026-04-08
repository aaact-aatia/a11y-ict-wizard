# Docker Compose Setup Guide - A11y ICT Wizard

This guide provides detailed instructions for running the A11y ICT Wizard application using Docker Compose for local development.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Services](#services)
- [Environment Configuration](#environment-configuration)
- [Database Management](#database-management)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Docker Commands Reference](#docker-commands-reference)

## Overview

The Docker Compose setup provides:
- **MongoDB 6.0** - Database with automatic initialization from JSON files
- **mongo-express** - Web-based database admin interface
- **Node.js application** - The A11y ICT Wizard app with hot-reload support

**Why Docker Compose?**
- No local MongoDB installation required
- Consistent environment across all developers
- Database automatically populated on first run
- Easy cleanup and fresh starts
- Isolated from other local projects

## Prerequisites

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) which includes Docker Engine and Docker Compose.

**Verify installation:**
```bash
docker --version
docker compose version
```

## Quick Start

1. **Clone and navigate to the repository:**
   ```bash
   git clone https://github.com/aaact-aatia/a11y-ict-wizard
   cd a11y-ict-wizard
   ```

2. **Create your environment configuration:**
   ```bash
   cp .env.sample .env
   ```
   
   The default `.env.sample` is pre-configured for Docker with:
   - `DBURI=mongodb://mongo:27017/a11y-req-dev-2025`
   - Local development settings

3. **Start all services:**
   ```bash
   docker compose up
   ```
   
   First startup will:
   - Download Docker images (~500MB)
   - Build the application container
   - Start MongoDB and wait for it to be ready
   - Automatically populate the database from `/JSON` files
   - Start the application

4. **Access the application:**
   - **Main app**: http://localhost:3001
   - **MongoDB admin**: http://localhost:8081 (username: `admin`, password: `admin`)
   - **CMS editor**: http://localhost:3001/edit (username: `admin`, password: `admin`)

5. **Stop services:**
   ```bash
   # Press Ctrl+C in the terminal running docker compose
   # Or in another terminal:
   docker compose down
   ```

## Services

### MongoDB (`mongo`)
- **Image**: `mongo:6.0`
- **Port**: 27017 (mapped to host)
- **Data**: Persisted in Docker volume `a11y-ict-wizard-mongo-data`
- **Database**: `a11y-req-dev-2025`
- **Health check**: Ensures MongoDB is ready before starting dependent services

### mongo-express (`mongo-express`)
- **Image**: `mongo-express:latest`
- **Port**: 8081 → http://localhost:8081
- **Credentials**: username `admin`, password `admin`
- **Purpose**: View and manage database collections, documents, and indexes

**Features:**
- Browse collections (questions, clauses, infos)
- View/edit documents
- Execute queries
- Manage indexes

### Application (`app`)
- **Base**: Node.js 22 Alpine
- **Port**: 3001 → http://localhost:3001
- **Hot reload**: Code changes reflect immediately (no rebuild needed)
- **Auto-initialization**: Database populated from `/JSON` files on first startup

## Environment Configuration

### Using .env for Different Scenarios

The `.env` file controls which database to use. The application reads this file automatically.

#### Scenario 1: Local Docker (Default)
```bash
# .env
DBURI=mongodb://mongo:27017/a11y-req-dev-2025
EN_VERSION="EN 301 549 V4.1.1 (2025) - Development"
BASICAUTHUSERNAME=admin
BASICAUTHPASSWORD=change-this-password
```

Run with: `docker compose up`

#### Scenario 2: Remote MongoDB Database
To connect to a remote database instead of Docker:

1. **Edit `.env`** - Comment out Docker settings, uncomment remote section:
   ```bash
   # .env
   # DBURI=mongodb://mongo:27017/a11y-req-dev-2025  # <-- Comment out
   
   # Uncomment remote connection:
   DBURI=mongodb+srv://user:pass@cluster.mongodb.net/a11y-req-2025?retryWrites=true
   EN_VERSION="EN 301 549 V4.1.1 (2025)"
   ```

2. **Run natively** (no Docker needed):
   ```bash
   npm run devstart
   ```

### Environment Variables Reference

| Variable | Purpose | Docker Default |
|----------|---------|----------------|
| `PORT` | Application port | `3001` |
| `DBURI` | MongoDB connection string | `mongodb://mongo:27017/a11y-req-dev-2025` |
| `EN_VERSION` | Standard version displayed | `"EN 301 549 V4.1.1 (2025) - Development"` |
| `BASICAUTHUSERNAME` | CMS login username | `admin` |
| `BASICAUTHPASSWORD` | CMS login password | `admin` |
| `SESSION_SECRET` | Express session encryption | Auto-generated |
| `GITHUB_CLIENT_ID` | GitHub OAuth (optional) | Empty |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth (optional) | Empty |

**Note**: `docker-compose.yml` overrides `DBURI` to ensure the app uses the Docker MongoDB service name.

## Database Management

### Automatic Initialization

On first startup, if the database is empty, it will automatically populate from:
- `/JSON/questions_list.json` → `questions` collection
- `/JSON/clauses_list.json` → `clauses` collection
- `/JSON/infos_list.json` → `infos` collection

**Initialization logs:**
```
🔄 Checking database initialization status...
✅ Initialized clauses collection with 247 documents
✅ Initialized infos collection with 89 documents
✅ Initialized questions collection with 34 documents
✅ Database initialization complete
```

If collections already have data, initialization is skipped:
```
ℹ️  clauses collection already has 247 documents - skipping initialization
ℹ️  Database already initialized - no changes needed
```

### Fresh Start (Reset Database)

To completely reset the database:

```bash
# Stop and remove volumes
docker compose down -v

# Start again (will re-initialize)
docker compose up
```

**Warning**: This deletes all data including any changes made via the CMS.

### Backing Up Data

#### Export via CMS (Recommended)
1. Visit http://localhost:3001/edit
2. Login (admin/admin)
3. Use the download buttons to export collections as JSON
4. Save files for backup

#### Export via mongo-express
1. Visit http://localhost:8081
2. Navigate to database → collection
3. Click "Export" button

#### Command-line Export
```bash
# Export all collections
docker exec a11y-ict-wizard-mongo mongodump --db=a11y-req-dev-2025 --out=/data/backup

# Copy backup to host
docker cp a11y-ict-wizard-mongo:/data/backup ./backup
```

### Restoring Data

#### Restore via CMS
1. Visit http://localhost:3001/edit
2. Use the restore/upload functionality for each collection

#### Command-line Restore
```bash
# Copy backup into container
docker cp ./backup a11y-ict-wizard-mongo:/data/backup

# Restore from backup
docker exec a11y-ict-wizard-mongo mongorestore --db=a11y-req-dev-2025 /data/backup/a11y-req-dev-2025
```

## Development Workflow

### Making Code Changes

The application container uses a bind mount for hot-reload:

1. **Edit any file** in your project directory
2. **Nodemon automatically restarts** the app
3. **Refresh browser** to see changes

**Watched files:**
- `.js` files (controllers, routes, models, scripts)
- `.pug` templates (views)
- `.css` stylesheets

**Not auto-reloaded:**
- Changes to `package.json` → Rebuild container
- Changes to `Dockerfile` → Rebuild container
- Changes to `docker-compose.yml` → Restart services

### Rebuilding Containers

After updating dependencies or Docker configuration:

```bash
# Rebuild and restart
docker compose up --build

# Or rebuild without starting
docker compose build
```

### Viewing Logs

```bash
# All services
docker compose logs

# Follow logs (live)
docker compose logs -f

# Specific service
docker compose logs app
docker compose logs mongo

# Last 50 lines
docker compose logs --tail=50
```

### Accessing Container Shell

```bash
# Node.js app container
docker exec -it a11y-ict-wizard-app sh

# MongoDB container
docker exec -it a11y-ict-wizard-mongo bash

# MongoDB shell
docker exec -it a11y-ict-wizard-mongo mongosh a11y-req-dev-2025
```

## Troubleshooting

### Port Already in Use

**Error**: `Bind for 0.0.0.0:3001 failed: port is already allocated`

**Solution**: Another application is using the port.

```bash
# Find what's using the port (macOS/Linux)
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3002
```

Then restart: `docker compose up`

### MongoDB Connection Failed

**Error**: `⏳ MongoDB connection failed. Retrying...`

**Possible causes:**
1. MongoDB container not healthy yet → Wait 30 seconds
2. Service name incorrect → Check `DBURI=mongodb://mongo:27017/...`
3. MongoDB crashed → Check logs: `docker compose logs mongo`

**Solution**:
```bash
# Check MongoDB health
docker compose ps

# Restart services
docker compose restart
```

### Database Not Initializing

**Issue**: Database is empty, no data loaded.

**Check:**
1. JSON files exist in `/JSON` directory
2. Initialization logs show success
3. Container has read access to files

**Debug**:
```bash
# Run initialization script manually
docker exec -it a11y-ict-wizard-app node scripts/init-db.js

# Check if JSON files are accessible
docker exec -it a11y-ict-wizard-app ls -la /app/JSON
```

### Changes Not Reflecting

**Issue**: Code changes don't appear in the running app.

**Solutions:**
- Wait for nodemon restart (check logs)
- Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
- Clear browser cache
- If still stuck: `docker compose restart app`

### Container Disk Space

**Error**: `no space left on device`

Docker images and volumes can consume significant disk space.

**Clean up**:
```bash
# Remove stopped containers, unused networks
docker compose down

# Remove all unused Docker resources
docker system prune

# Remove volumes (WARNING: deletes data)
docker system prune --volumes
```

### mongo-express Not Loading

**Issue**: http://localhost:8081 shows connection refused.

**Solutions:**
1. Wait for MongoDB to be healthy: `docker compose ps`
2. Check logs: `docker compose logs mongo-express`
3. Restart service: `docker compose restart mongo-express`

## Docker Commands Reference

### Basic Operations
```bash
# Start services (foreground)
docker compose up

# Start services (background/detached)
docker compose up -d

# Stop services
docker compose down

# Stop services and remove volumes
docker compose down -v

# Restart all services
docker compose restart

# Restart specific service
docker compose restart app
```

### Building
```bash
# Build containers
docker compose build

# Build without cache (clean build)
docker compose build --no-cache

# Build and start
docker compose up --build
```

### Status and Information
```bash
# View running containers
docker compose ps

# View logs
docker compose logs

# Follow logs in real-time
docker compose logs -f

# Service-specific logs
docker compose logs app
```

### Cleanup
```bash
# Stop and remove containers
docker compose down

# Stop, remove containers, and delete volumes
docker compose down -v

# Remove orphaned containers
docker compose down --remove-orphans

# Prune all Docker resources
docker system prune -a --volumes
```

### Advanced
```bash
# Run a command in a running container
docker compose exec app node --version

# Run a one-off command
docker compose run app npm install

# View resource usage
docker compose top

# Validate docker-compose.yml
docker compose config
```

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
- [mongo-express Documentation](https://github.com/mongo-express/mongo-express)
- [Main README](README.md) - Application overview and architecture

## Getting Help

**Application not starting?**
1. Check logs: `docker compose logs`
2. Verify `.env` file exists
3. Ensure Docker Desktop is running
4. Try a fresh start: `docker compose down -v && docker compose up`

**Need to report an issue?**
- [GitHub Issues](https://github.com/aaact-aatia/a11y-ict-wizard/issues)
- Include: OS, Docker version, error logs, steps to reproduce
