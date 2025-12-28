# Compressorr - Media Conversion & Compression Platform

A full-stack Node.js application for image and PDF conversion, compression, and restoration. Built with Express, MongoDB, and containerized for production deployment on AWS EKS.

## 📋 Table of Contents

### SECTION A: INSTALLATION & CONFIGURATION
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Step 1: EC2 Instance Setup](#step-1-ec2-instance-setup)
- [Step 2: Install Docker](#step-2-install-docker)
- [Step 3: Install Docker Compose](#step-3-install-docker-compose)
- [Step 4: Install Node.js](#step-4-install-nodejs)
- [Step 5: Install AWS CLI](#step-5-install-aws-cli)
- [Step 6: Install kubectl](#step-6-install-kubectl)
- [Step 7: Install eksctl](#step-7-install-eksctl)
- [Step 8: Install Java](#step-8-install-java)
- [Step 9: Install PostgreSQL](#step-9-install-postgresql-for-sonarqube)
- [Step 10: Install & Configure Jenkins](#step-10-install--configure-jenkins)
- [Step 11: Install & Configure SonarQube](#step-11-install--configure-sonarqube)

### SECTION B: DEPLOYMENT
- [Step 12: Clone & Configure Application](#step-12-clone--configure-application)
- [Step 13: Docker Deployment](#step-13-docker-deployment)
- [Step 14: Kubernetes (EKS) Deployment](#step-14-kubernetes-eks-deployment)
- [Step 15: Setup CI/CD Pipeline](#step-15-setup-cicd-pipeline)
- [Step 16: Deploy Monitoring](#step-16-deploy-monitoring)

### SECTION C: REFERENCE
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Quick Reference Commands](#quick-reference-commands)
- [Project Structure](#project-structure)

---

## Architecture Overview

```
├── Backend (Node.js + Express) - Port 5000
├── Frontend (HTML/CSS/JS + Nginx) - Port 80
├── Database (MongoDB) - Port 27017
├── Container Registry (DockerHub)
├── Orchestration (Amazon EKS)
├── CI/CD (Jenkins)
├── Code Quality (SonarQube)
└── Monitoring (Prometheus + Grafana)
```

---

## Prerequisites

### AWS Requirements
- AWS Account with IAM user
- Access to EC2, EKS, IAM, VPC services
- SSH key pair for EC2 access

### Local Requirements
- Git installed
- SSH client
- DockerHub account

---

# SECTION A: INSTALLATION & CONFIGURATION

---

# SECTION A: INSTALLATION & CONFIGURATION

## Step 1: EC2 Instance Setup

### 1.1 Launch EC2 Instance

**Instance Configuration:**
- **AMI:** Amazon Linux 2023
- **Instance Type:** t3.large (minimum for running Jenkins + SonarQube)
- **Storage:** 50 GB gp3
- **Security Group Ports:**
  - 22 (SSH)
  - 80 (Frontend)
  - 5000 (Backend)
  - 8080 (Jenkins)
  - 9000 (SonarQube)
  - 9090 (Prometheus)
  - 3000 (Grafana)

### 1.2 Connect to EC2

```bash
# Set permissions for your key
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ec2-user@your-ec2-public-ip
```

### 1.3 Initial System Update

```bash
# Update all packages
sudo dnf update -y

# Install basic utilities
sudo dnf install -y git wget curl tar unzip vim
```

---

## Step 2: Install Docker

```bash
# Install Docker
sudo dnf install -y docker

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add ec2-user to docker group (avoid sudo)
sudo usermod -aG docker ec2-user

# Apply group changes
newgrp docker

# Verify installation
docker --version
docker ps
```

---

## Step 3: Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

---

## Step 4: Install Node.js

```bash
# Install Node.js 18
sudo dnf install -y nodejs

# Verify installation
node --version
npm --version

# Install global packages
sudo npm install -g pm2
```

---

## Step 5: Install AWS CLI

```bash
# Download AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip

# Unzip
unzip awscliv2.zip

# Install
sudo ./aws/install

# Verify
aws --version

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
```

---

## Step 6: Install kubectl

```bash
# Download kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Make executable
chmod +x kubectl

# Move to PATH
sudo mv kubectl /usr/local/bin/

# Verify
kubectl version --client
```

---

## Step 7: Install eksctl

```bash
# Download eksctl
curl -sLO "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_Linux_amd64.tar.gz"

# Extract
tar -xzf eksctl_Linux_amd64.tar.gz

# Move to PATH
sudo mv eksctl /usr/local/bin/

# Verify
eksctl version
```

---

## Step 8: Install Java

```bash
# Install Amazon Corretto 17 (OpenJDK)
sudo dnf install -y java-17-amazon-corretto

# Verify
java -version
```

---

## Step 9: Install PostgreSQL (for SonarQube)

```bash
# Install PostgreSQL 15
sudo dnf install -y postgresql15-server

# Initialize database
sudo postgresql-setup --initdb

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### Configure PostgreSQL for SonarQube

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run these commands:
CREATE USER sonarqube WITH ENCRYPTED PASSWORD 'sonar123';
CREATE DATABASE sonarqube OWNER sonarqube;
GRANT ALL PRIVILEGES ON DATABASE sonarqube TO sonarqube;
\q

# Edit PostgreSQL authentication config
sudo nano /var/lib/pgsql/data/pg_hba.conf
```

**Add this line before the other entries:**
```
host    sonarqube       sonarqube       127.0.0.1/32            md5
```

**Restart PostgreSQL:**
```bash
sudo systemctl restart postgresql

# Test connection
psql -h localhost -U sonarqube -d sonarqube
# Enter password: sonar123
# Type \q to exit
```

---

## Step 10: Install & Configure Jenkins

### 10.1 Install Jenkins

```bash
# Add Jenkins repository
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo

# Import Jenkins key
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key

# Install Jenkins
sudo dnf install -y jenkins

# Start Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Check status
sudo systemctl status jenkins
```

### 10.2 Configure Jenkins Initial Setup

```bash
# Get initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

# Access Jenkins UI
# Open browser: http://your-ec2-public-ip:8080
```

**Jenkins Initial Setup:**
1. Paste the initial admin password
2. Install suggested plugins
3. Create admin user
4. Configure Jenkins URL

### 10.3 Install Required Jenkins Plugins

**Required Plugins:**
- Docker Pipeline
- Kubernetes
- Git
- Pipeline
- AWS Steps
- SonarQube Scanner

**Install via UI:**
1. Dashboard → Manage Jenkins → Plugins
2. Search and install each plugin
3. Restart Jenkins

### 10.4 Configure Jenkins Credentials

**Add DockerHub Credentials:**
1. Manage Jenkins → Credentials → System → Global credentials
2. Add Credentials → Username with password
3. ID: `dockerhub-credentials`
4. Username: Your DockerHub username
5. Password: Your DockerHub password

**Add AWS Credentials:**
1. Add Credentials → AWS Credentials
2. ID: `aws-credentials`
3. Access Key ID: Your AWS access key
4. Secret Access Key: Your AWS secret key

**Add GitHub Credentials (for Private Repositories):**
1. Add Credentials → Username with password (or Personal Access Token)
2. ID: `github-credentials`
3. Username: Your GitHub username
4. Password: GitHub Personal Access Token
   - Generate token at: https://github.com/settings/tokens
   - Required scopes: `repo`, `admin:repo_hook`

**Add SonarQube Token:**
1. First, generate token in SonarQube UI:
   - Login to SonarQube: `http://your-ec2-public-ip:9000`
   - My Account → Security → Generate Token
   - Name: `jenkins`
   - Copy the generated token
2. Back in Jenkins → Add Credentials → Secret text
3. ID: `sonarqube-token`
4. Secret: Paste the SonarQube token

### 10.5 Configure GitHub Webhook (for Auto-Trigger)

**In GitHub Repository:**
1. Go to your repository → Settings → Webhooks
2. Click **Add webhook**
3. Payload URL: `http://your-ec2-public-ip:8080/github-webhook/`
4. Content type: `application/json`
5. Select events: **Just the push event**
6. Active: ✓ Check
7. Click **Add webhook**

**In Jenkins Job Configuration:**
1. Open your pipeline job
2. Build Triggers → Check **GitHub hook trigger for GITScm polling**
3. Save

### 10.6 Configure SonarQube Integration

**In Jenkins:**
1. Manage Jenkins → Configure System
2. Scroll to **SonarQube servers**
3. Click **Add SonarQube**
4. Name: `SonarQube`
5. Server URL: `http://localhost:9000`
6. Server authentication token: Select `sonarqube-token` from dropdown
7. Click **Save**

---

## Step 11: Install & Configure SonarQube

### 11.1 Install SonarQube

```bash
# Create sonarqube user
sudo useradd -r -s /bin/false sonarqube

# Download SonarQube
cd /opt
sudo wget https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-9.9.0.65466.zip

# Unzip
sudo unzip sonarqube-9.9.0.65466.zip
sudo mv sonarqube-9.9.0.65466 sonarqube

# Set ownership
sudo chown -R sonarqube:sonarqube /opt/sonarqube

# Set system limits
sudo tee /etc/security/limits.d/99-sonarqube.conf << EOF
sonarqube   -   nofile   65536
sonarqube   -   nproc    4096
EOF

# Set kernel parameters
sudo tee -a /etc/sysctl.conf << EOF
vm.max_map_count=262144
fs.file-max=65536
EOF

# Apply settings
sudo sysctl -p
```

### 11.2 Configure SonarQube Database Connection

```bash
# Edit SonarQube configuration
sudo nano /opt/sonarqube/conf/sonar.properties
```

**Uncomment and update these lines:**
```properties
sonar.jdbc.username=sonarqube
sonar.jdbc.password=sonar123
sonar.jdbc.url=jdbc:postgresql://localhost/sonarqube
```

**Save and exit (Ctrl+X, Y, Enter)**

### 11.3 Configure SonarQube Service

```bash
# Create systemd service
sudo tee /etc/systemd/system/sonarqube.service << 'EOF'
[Unit]
Description=SonarQube service
After=network.target

[Service]
Type=forking
ExecStart=/opt/sonarqube/bin/linux-x86-64/sonar.sh start
ExecStop=/opt/sonarqube/bin/linux-x86-64/sonar.sh stop
User=sonarqube
Group=sonarqube
Restart=always
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Start SonarQube
sudo systemctl start sonarqube
sudo systemctl enable sonarqube

# Check status
sudo systemctl status sonarqube
```

### 11.4 Access SonarQube UI

```bash
# Wait for startup (1-2 minutes)
# Access: http://your-ec2-public-ip:9000

# Default credentials:
# Username: admin
# Password: admin
```

### 11.5 Configure SonarQube Project

**In SonarQube UI:**
1. Create new project
2. Project key: `compressorr`
3. Generate token
4. Copy token

**Configure in Jenkins:**
1. Manage Jenkins → Configure System
2. SonarQube servers → Add SonarQube
3. Name: `SonarQube`
4. Server URL: `http://localhost:9000`
5. Add token in credentials

---

# SECTION B: DEPLOYMENT

## Step 12: Clone & Configure Application

### 12.1 Clone Repository

```bash
# Clone your repository
git clone <your-repo-url>
cd Compressorr
```

### 12.2 Configure Environment Variables

```bash
# Edit .env file
nano .env
```

**Update the following values:**
```bash
JWT_SECRET=your-super-secret-jwt-key-here-change-this
SESSION_SECRET=your-super-secret-session-key-here-change-this
GOOGLE_CLIENT_ID=your-google-client-id-if-using-oauth
GOOGLE_CLIENT_SECRET=your-google-client-secret-if-using-oauth
GOOGLE_CALLBACK_URL=http://your-domain-or-ip:5000/auth/google/callback
MONGO_URI=mongodb://mongodb:27017/filetool
PORT=5000
NODE_ENV=production
```

### 12.3 Create Required Directories

```bash
# Create upload directories
mkdir -p uploads/profiles

# Set permissions
chmod -R 755 uploads
```

---

## Step 13: Docker Deployment

### 13.2 Build Docker Images

```bash
# Build backend image
docker build -f Dockerfiles/backend.Dockerfile -t saikiranasamwar4/compressor-backend:latest ./backend

# Build frontend image
docker build -f Dockerfiles/frontend.Dockerfile -t saikiranasamwar4/compressor-frontend:latest ./frontend

# Enter username and password when prompted
```

### 12.2 Build Docker Images

```bash
# Build backend image
docker build -f Dockerfiles/backend.Dockerfile -t saikiranasamwar4/compressor-backend:latest ./backend

# Build frontend image
docker build -f Dockerfiles/frontend.Dockerfile -t saikiranasamwar4/compressor-frontend:latest ./frontend
```

### 12.3 Push Images to DockerHub

```bash
# Push backend
docker push saikiranasamwar4/compressor-backend:latest

# Push frontend
docker push saikiranasamwar4/compressor-frontend:latest
```

### 12.4 Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check running containers
docker ps

# Stop services
docker-compose down
```

### 12.5 Verify Application

```bash
# Check backend health
curl http://localhost:5000/api/health

# Access frontend
curl http://localhost:8080
```

**Access in browser:**
- Frontend: `http://your-ec2-public-ip:8080`
- Backend API: `http://your-ec2-public-ip:5001`

---

## Step 14: Kubernetes (EKS) Deployment

### 14.1 Create EKS Cluster

```bash
# Create EKS cluster (takes 15-20 minutes)
eksctl create cluster \
  --name compressorr-cluster \
  --region us-east-1 \
  --nodegroup-name compressorr-nodes \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 3 \
  --managed

# Verify cluster
kubectl get nodes
```

### 14.2 Create Namespace

```bash
# Create namespace
kubectl create namespace media-app

# Set as default
kubectl config set-context --current --namespace=media-app
```

### 14.3 Create MongoDB Secret

```bash
# Create secret for MongoDB
kubectl apply -f k8s/mongo/mongo-secret.yaml

# Verify
kubectl get secrets
```

### 14.4 Deploy MongoDB

```bash
# Deploy MongoDB StatefulSet
kubectl apply -f k8s/mongo/mongo-statefulset.yaml

# Deploy MongoDB Service
kubectl apply -f k8s/mongo/mongo-service.yaml

# Check status
kubectl get statefulsets
kubectl get pods
```

### 14.5 Deploy Backend

```bash
# Deploy backend
kubectl apply -f k8s/backend/backend-deployment.yaml
kubectl apply -f k8s/backend/backend-service.yaml

# Check status
kubectl get deployments
kubectl get pods
kubectl get services
```

### 14.6 Deploy Frontend

```bash
# Deploy frontend
kubectl apply -f k8s/frontend/frontend-deployment.yaml
kubectl apply -f k8s/frontend/frontend-service.yaml

# Check all resources
kubectl get all
```

### 14.7 Access Application

```bash
# Get LoadBalancer URL for frontend
kubectl get service frontend-service

# Note the EXTERNAL-IP
# Access: http://<EXTERNAL-IP>
```

### 14.8 EKS Cluster Management

```bash
# View logs
kubectl logs <pod-name>
kubectl logs -f <pod-name>  # Follow logs

# Describe resources
kubectl describe pod <pod-name>
kubectl describe service <service-name>

# Scale deployment
kubectl scale deployment backend --replicas=3

# Update image
kubectl set image deployment/backend backend=saikiranasamwar4/compressor-backend:v2

# Delete cluster (cleanup)
eksctl delete cluster --name compressorr-cluster --region us-east-1
```

---

## Step 15: Setup CI/CD Pipeline

### 15.1 Create Jenkins Pipeline

1. Open Jenkins UI: `http://your-ec2-public-ip:8080`
2. Click **New Item**
3. Name: `Compressorr-Deploy`
4. Select **Pipeline**
5. Click **OK**

### 15.2 Configure Pipeline

1. **Pipeline** section:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: Your repository URL
   - Credentials: Add if private repo
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
2. Click **Save**

### 15.3 Run Pipeline

```bash
# Trigger build from Jenkins UI by clicking "Build Now"
# Or push code to GitHub to trigger automatically
```

### 15.4 Monitor Pipeline Execution

1. Click on build number (#1, #2, etc.)
2. Click **Console Output** to view logs
3. Monitor stages: Checkout → Build → Push → Deploy

---

## Step 16: Deploy Monitoring

### 16.1 Deploy Prometheus

```bash
# Create Prometheus config
kubectl apply -f k8s/monitoring/prometheus-config.yaml

# Deploy Prometheus
kubectl apply -f k8s/monitoring/prometheus-deployment.yaml

# Check status
kubectl get pods -l app=prometheus
```

### 16.2 Deploy Grafana

```bash
# Deploy Grafana
kubectl apply -f k8s/monitoring/grafana-deployment.yaml

# Get Grafana service URL
kubectl get service grafana

# Access: http://<EXTERNAL-IP>:3000
# Default credentials: admin/admin
```

### 16.3 Configure Grafana Data Source

**Add Prometheus Data Source:**
1. Login to Grafana
2. Configuration → Data Sources → Add data source
3. Select Prometheus
4. URL: `http://prometheus:9090`
5. Save & Test

**Import Dashboard:**
1. Dashboard → Import
2. Upload `monitoring/grafana-dashboards/compressorr-dashboard.json`
3. Select Prometheus data source
4. Import

### 16.4 View Metrics & Dashboards

**Access Prometheus:**
- URL: `http://<prometheus-external-ip>:9090`
- Query examples:
  - `up` - Service health
  - `http_requests_total` - Request count
  - `nodejs_heap_size_used_bytes` - Memory usage

**Access Grafana:**
- URL: `http://<grafana-external-ip>:3000`
- View imported Compressorr dashboard

---

# SECTION C: REFERENCE

## Environment Variables

### Required Variables (.env file)

```bash
# Security
JWT_SECRET=<random-string-min-32-chars>
SESSION_SECRET=<random-string-min-32-chars>

# OAuth (Optional)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=http://your-domain:5000/auth/google/callback

# Database
MONGO_URI=mongodb://mongodb:27017/filetool

# Server
PORT=5000
NODE_ENV=production
```

### Generate Secure Secrets

```bash
# Generate random JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate random session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Troubleshooting

### Docker Issues

**Problem: Permission denied**
```bash
# Solution: Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

**Problem: Container won't start**
```bash
# Check logs
docker logs <container-name>

# Check if port is in use
sudo netstat -tulpn | grep <port>
```

### Kubernetes Issues

**Problem: Pods in CrashLoopBackOff**
```bash
# Check pod logs
kubectl logs <pod-name>

# Describe pod for events
kubectl describe pod <pod-name>

# Check if images exist
docker pull saikiranasamwar4/compressor-backend:latest
```

**Problem: Service not accessible**
```bash
# Check service
kubectl get service <service-name>

# Check endpoints
kubectl get endpoints <service-name>

# Port forward for testing
kubectl port-forward service/<service-name> 8080:80
```

### MongoDB Connection Issues

**Problem: Backend can't connect to MongoDB**
```bash
# Check MongoDB pod
kubectl get pods -l app=mongo

# Check MongoDB logs
kubectl logs <mongo-pod-name>

# Test connection from backend pod
kubectl exec -it <backend-pod> -- sh
nc -zv mongo 27017
```

### Jenkins Issues

**Problem: Jenkins won't start**
```bash
# Check Java version
java -version

# Check Jenkins logs
sudo journalctl -u jenkins -f

# Check disk space
df -h
```

### EKS Issues

**Problem: kubectl can't connect to cluster**
```bash
# Update kubeconfig
aws eks update-kubeconfig --name compressorr-cluster --region us-east-1

# Verify connection
kubectl cluster-info

# Check AWS credentials
aws sts get-caller-identity
```

### SonarQube Issues

**Problem: SonarQube won't start**
```bash
# Check system limits
ulimit -n
ulimit -u

# Check kernel parameters
sysctl vm.max_map_count

# Check logs
tail -f /opt/sonarqube/logs/sonar.log
```

### Application Issues

**Problem: 502 Bad Gateway**
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Check nginx logs (in Docker)
docker logs compressorr-frontend

# Check backend logs
docker logs compressorr-backend
```

**Problem: File upload fails**
```bash
# Check upload directory permissions
ls -la uploads/

# Create if missing
mkdir -p uploads/profiles
chmod -R 755 uploads
```

### Network Issues

**Problem: Can't access from browser**
```bash
# Check security group rules
aws ec2 describe-security-groups

# Check if service is listening
sudo netstat -tulpn | grep <port>

# Test from EC2
curl http://localhost:<port>
```

---

## Quick Reference Commands

### Docker
```bash
docker ps                              # List running containers
docker logs <container>                # View logs
docker exec -it <container> sh         # Shell into container
docker-compose up -d                   # Start services
docker-compose down                    # Stop services
docker system prune -a                 # Clean up
```

### Kubernetes
```bash
kubectl get all                        # List all resources
kubectl get pods -o wide               # Detailed pod info
kubectl logs -f <pod>                  # Follow logs
kubectl exec -it <pod> -- sh           # Shell into pod
kubectl delete pod <pod>               # Delete pod
kubectl rollout restart deployment/<name>  # Restart deployment
```

### AWS
```bash
aws eks list-clusters                  # List EKS clusters
aws eks update-kubeconfig --name <cluster>  # Update kubeconfig
aws ec2 describe-instances             # List EC2 instances
eksctl get cluster                     # Get cluster info
```

### System
```bash
sudo systemctl status <service>        # Check service status
sudo systemctl restart <service>       # Restart service
sudo journalctl -u <service> -f        # View service logs
df -h                                  # Check disk space
free -h                                # Check memory
top                                    # Monitor processes
```

---

## Project Structure

```
Compressorr/
├── backend/
│   ├── src/
│   │   ├── server.js              # Main server file
│   │   ├── routes/                # API routes
│   │   ├── controllers/           # Business logic
│   │   ├── models/                # MongoDB models
│   │   ├── middleware/            # Auth & validation
│   │   └── config/                # Configuration files
│   └── package.json
├── frontend/
│   ├── *.html                     # Frontend pages
│   ├── *.js                       # Client-side scripts
│   ├── styles.css                 # Styles
│   └── nginx.conf                 # Nginx configuration
├── Dockerfiles/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── nginx.conf
├── k8s/
│   ├── backend/                   # Backend K8s manifests
│   ├── frontend/                  # Frontend K8s manifests
│   ├── mongo/                     # MongoDB K8s manifests
│   └── monitoring/                # Prometheus & Grafana
├── monitoring/
│   ├── prometheus.yml
│   └── grafana-dashboards/
├── ansible/                       # Ansible playbooks
├── docker-compose.yml             # Docker Compose config
├── Jenkinsfile                    # CI/CD pipeline
├── sonar-project.properties       # SonarQube config
└── .env                           # Environment variables
```

---

## License

MIT

## Support

For issues and questions, please open an issue in the repository.
