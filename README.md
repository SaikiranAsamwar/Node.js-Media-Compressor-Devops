# Compressorr - Media Conversion & Compression Platform

A full-stack Node.js application for image and PDF conversion, compression, and restoration. Built with Express, MongoDB, and containerized for production deployment on AWS EKS.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Part 1: EC2 Instance Setup](#part-1-ec2-instance-setup)
- [Part 2: Install Required Tools](#part-2-install-required-tools)
- [Part 3: Application Setup](#part-3-application-setup)
- [Part 4: Docker Deployment](#part-4-docker-deployment)
- [Part 5: Kubernetes (EKS) Deployment](#part-5-kubernetes-eks-deployment)
- [Part 6: CI/CD with Jenkins](#part-6-cicd-with-jenkins)
- [Part 7: Code Quality with SonarQube](#part-7-code-quality-with-sonarqube)
- [Part 8: Monitoring Setup](#part-8-monitoring-setup)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

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

## Part 1: EC2 Instance Setup

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

## Part 2: Install Required Tools

### 2.1 Install Docker

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

### 2.2 Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 2.3 Install Node.js

```bash
# Install Node.js 18
sudo dnf install -y nodejs

# Verify installation
node --version
npm --version

# Install global packages
sudo npm install -g pm2
```

### 2.4 Install AWS CLI v2

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

### 2.5 Install kubectl

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

### 2.6 Install eksctl

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

### 2.7 Install Java (for Jenkins & SonarQube)

```bash
# Install Amazon Corretto 17 (OpenJDK)
sudo dnf install -y java-17-amazon-corretto

# Verify
java -version
```

---

## Part 3: Application Setup

### 3.1 Clone Repository

```bash
# Clone your repository
git clone <your-repo-url>
cd Compressorr
```

### 3.2 Configure Environment Variables

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

### 3.3 Create Required Directories

```bash
# Create upload directories
mkdir -p uploads/profiles

# Set permissions
chmod -R 755 uploads
```

---

## Part 4: Docker Deployment

### 4.1 Login to DockerHub

```bash
# Login to DockerHub
docker login

# Enter username and password when prompted
```

### 4.2 Build Docker Images

```bash
# Build backend image
docker build -f Dockerfiles/backend.Dockerfile -t saikiranasamwar4/compressor-backend:latest ./backend

# Build frontend image
docker build -f Dockerfiles/frontend.Dockerfile -t saikiranasamwar4/compressor-frontend:latest ./frontend
```

### 4.3 Push Images to DockerHub

```bash
# Push backend
docker push saikiranasamwar4/compressor-backend:latest

# Push frontend
docker push saikiranasamwar4/compressor-frontend:latest
```

### 4.4 Run with Docker Compose

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

### 4.5 Verify Application

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

## Part 5: Kubernetes (EKS) Deployment

### 5.1 Create EKS Cluster

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

### 5.2 Create Namespace

```bash
# Create namespace
kubectl create namespace media-app

# Set as default
kubectl config set-context --current --namespace=media-app
```

### 5.3 Create MongoDB Secret

```bash
# Create secret for MongoDB
kubectl apply -f k8s/mongo/mongo-secret.yaml

# Verify
kubectl get secrets
```

### 5.4 Deploy MongoDB

```bash
# Deploy MongoDB StatefulSet
kubectl apply -f k8s/mongo/mongo-statefulset.yaml

# Deploy MongoDB Service
kubectl apply -f k8s/mongo/mongo-service.yaml

# Check status
kubectl get statefulsets
kubectl get pods
```

### 5.5 Deploy Backend

```bash
# Deploy backend
kubectl apply -f k8s/backend/backend-deployment.yaml
kubectl apply -f k8s/backend/backend-service.yaml

# Check status
kubectl get deployments
kubectl get pods
kubectl get services
```

### 5.6 Deploy Frontend

```bash
# Deploy frontend
kubectl apply -f k8s/frontend/frontend-deployment.yaml
kubectl apply -f k8s/frontend/frontend-service.yaml

# Check all resources
kubectl get all
```

### 5.7 Access Application

```bash
# Get LoadBalancer URL for frontend
kubectl get service frontend-service

# Note the EXTERNAL-IP
# Access: http://<EXTERNAL-IP>
```

### 5.8 EKS Cluster Management

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

## Part 6: CI/CD with Jenkins

### 6.1 Install Jenkins

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

### 6.2 Configure Jenkins

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

### 6.3 Install Jenkins Plugins

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

### 6.4 Configure Jenkins Credentials

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

### 6.5 Create Jenkins Pipeline

1. New Item → Pipeline
2. Name: `Compressorr-Deploy`
3. Pipeline → Definition: Pipeline script from SCM
4. SCM: Git
5. Repository URL: Your repo URL
6. Script Path: `Jenkinsfile`
7. Save

### 6.6 Run Pipeline

```bash
# Trigger build from Jenkins UI
# Or push to GitHub to trigger automatically
```

---

## Part 7: Code Quality with SonarQube

### 7.1 Install SonarQube

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

### 7.2 Configure SonarQube Service

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

### 7.3 Access SonarQube

```bash
# Wait for startup (1-2 minutes)
# Access: http://your-ec2-public-ip:9000

# Default credentials:
# Username: admin
# Password: admin
```

### 7.4 Configure SonarQube Project

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

### 7.5 Run Code Analysis

```bash
# Run analysis locally
cd /path/to/Compressorr
docker run --rm \
  -e SONAR_HOST_URL=http://your-ec2-public-ip:9000 \
  -e SONAR_LOGIN=your-token \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli
```

---

## Part 8: Monitoring Setup

### 8.1 Deploy Prometheus

```bash
# Create Prometheus config
kubectl apply -f k8s/monitoring/prometheus-config.yaml

# Deploy Prometheus
kubectl apply -f k8s/monitoring/prometheus-deployment.yaml

# Check status
kubectl get pods -l app=prometheus
```

### 8.2 Deploy Grafana

```bash
# Deploy Grafana
kubectl apply -f k8s/monitoring/grafana-deployment.yaml

# Get Grafana service URL
kubectl get service grafana

# Access: http://<EXTERNAL-IP>:3000
# Default credentials: admin/admin
```

### 8.3 Configure Grafana

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

### 8.4 View Metrics

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
