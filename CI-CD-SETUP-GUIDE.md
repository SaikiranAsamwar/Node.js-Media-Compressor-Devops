# 🚀 Complete CI/CD Pipeline Setup Guide
## 3-Stage Pipeline: Git → SonarQube → Docker & DockerHub

---

## 📑 Table of Contents
1. [EC2 Instance Setup](#1-ec2-instance-setup)
2. [Server Initial Configuration](#2-server-initial-configuration)
3. [Stage 1: Git Configuration](#3-stage-1-git-configuration)
4. [Stage 2: SonarQube Setup](#4-stage-2-sonarqube-setup)
5. [Stage 3: Docker & DockerHub Setup](#5-stage-3-docker--dockerhub-setup)
6. [Jenkins Installation & Configuration](#6-jenkins-installation--configuration)
7. [Pipeline Configuration](#7-pipeline-configuration)
8. [Testing the Pipeline](#8-testing-the-pipeline)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. EC2 Instance Setup

### 1.1 Launch EC2 Instance

#### Step 1: Log in to AWS Console
1. Navigate to **AWS Management Console**
2. Go to **EC2 Dashboard**
3. Click **Launch Instance**

#### Step 2: Configure Instance Details
```yaml
Name: Jenkins-SonarQube-Docker-Server
AMI: Amazon Linux 2023 (or Amazon Linux 2)
Instance Type: t3.medium (minimum recommended)
  - vCPUs: 2
  - Memory: 4 GB
  - Storage: 30 GB (GP3 or GP2)
```

#### Step 3: Configure Storage
```
Root Volume: 30 GB (minimum)
Volume Type: gp3 (recommended) or gp2
```

#### Step 4: Configure Security Group
Create a new security group with the following inbound rules:

| Type            | Protocol | Port Range | Source      | Description              |
|-----------------|----------|------------|-------------|--------------------------|
| SSH             | TCP      | 22         | Your IP     | SSH access               |
| HTTP            | TCP      | 80         | 0.0.0.0/0   | HTTP access              |
| HTTPS           | TCP      | 443        | 0.0.0.0/0   | HTTPS access             |
| Custom TCP      | TCP      | 8080       | 0.0.0.0/0   | Jenkins                  |
| Custom TCP      | TCP      | 9000       | 0.0.0.0/0   | SonarQube                |
| Custom TCP      | TCP      | 3000       | 0.0.0.0/0   | Backend App (optional)   |

**Security Group Name:** `Jenkins-CICD-SG`

#### Step 5: Key Pair
1. Create new key pair or use existing
2. **Key pair name:** `jenkins-cicd-key`
3. **Key pair type:** RSA
4. **Format:** .pem (for SSH)
5. **Download and save securely**

#### Step 6: Launch Instance
1. Review all configurations
2. Click **Launch Instance**
3. Wait for instance to be in **Running** state
4. Note down the **Public IPv4 address**

---

## 2. Server Initial Configuration

### 2.1 Connect to EC2 Instance

#### For Windows (Using PowerShell):
```powershell
# Change permissions (if needed)
icacls "C:\path\to\jenkins-cicd-key.pem" /inheritance:r
icacls "C:\path\to\jenkins-cicd-key.pem" /grant:r "%username%:R"

# Connect to EC2
ssh -i "C:\path\to\jenkins-cicd-key.pem" ec2-user@<YOUR-EC2-PUBLIC-IP>
```

#### For Linux/Mac:
```bash
# Change permissions
chmod 400 jenkins-cicd-key.pem

# Connect to EC2
ssh -i jenkins-cicd-key.pem ec2-user@<YOUR-EC2-PUBLIC-IP>
```

### 2.2 Update System

```bash
# Update all packages
sudo yum update -y

# Install basic utilities
sudo yum install -y wget curl vim git unzip
```

### 2.3 Set Hostname (Optional but Recommended)

```bash
# Set hostname
sudo hostnamectl set-hostname jenkins-cicd-server

# Update hosts file
sudo vim /etc/hosts
# Add: 127.0.0.1 jenkins-cicd-server

# Logout and login again to see new hostname
exit
```

### 2.4 Increase System Limits for SonarQube

```bash
# Edit sysctl.conf
sudo vim /etc/sysctl.conf

# Add the following lines:
vm.max_map_count=524288
fs.file-max=131072

# Edit limits.conf
sudo vim /etc/security/limits.conf

# Add the following lines:
sonarqube   -   nofile   131072
sonarqube   -   nproc    8192

# Apply changes
sudo sysctl -p
```

### 2.5 Configure Firewall (if enabled)

```bash
# Check firewall status
sudo systemctl status firewalld

# If firewalld is active, add rules:
sudo firewall-cmd --permanent --add-port=8080/tcp  # Jenkins
sudo firewall-cmd --permanent --add-port=9000/tcp  # SonarQube
sudo firewall-cmd --reload
```

---

## 3. Stage 1: Git Configuration

### 3.1 Install Git

```bash
# Git should already be installed, but verify:
git --version

# If not installed:
sudo yum install git -y
```

### 3.2 Configure Git

```bash
# Set global git configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify configuration
git config --list
```

### 3.3 Generate SSH Key for Git (Optional - for private repos)

```bash
# Generate SSH key
ssh-keygen -t rsa -b 4096 -C "your.email@example.com"

# Press Enter for default location
# Press Enter for no passphrase (or set one)

# Display public key
cat ~/.ssh/id_rsa.pub

# Copy this key and add to GitHub/GitLab:
# GitHub: Settings > SSH and GPG keys > New SSH key
```

### 3.4 Test Git Access

```bash
# Test GitHub connection
ssh -T git@github.com

# Clone your repository (test)
git clone https://github.com/yourusername/Compressorr.git
cd Compressorr
git status
```

---

## 4. Stage 2: SonarQube Setup

### 4.1 Install Java (Required for SonarQube)

```bash
# Install Java 17 (required for SonarQube 10.x)
sudo yum install java-17-amazon-corretto -y

# Verify installation
java -version

# Set JAVA_HOME
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-amazon-corretto' | sudo tee -a /etc/profile
echo 'export PATH=$JAVA_HOME/bin:$PATH' | sudo tee -a /etc/profile
source /etc/profile

# Verify JAVA_HOME
echo $JAVA_HOME
```

### 4.2 Install PostgreSQL (SonarQube Database)

```bash
# Install PostgreSQL 14
sudo yum install postgresql14 postgresql14-server -y

# Initialize database
sudo postgresql-setup --initdb

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### 4.3 Configure PostgreSQL for SonarQube

```bash
# Switch to postgres user
sudo -i -u postgres

# Create SonarQube database and user
psql

# Run these SQL commands:
CREATE DATABASE sonarqube;
CREATE USER sonarqube WITH ENCRYPTED PASSWORD 'sonar123';
GRANT ALL PRIVILEGES ON DATABASE sonarqube TO sonarqube;
ALTER DATABASE sonarqube OWNER TO sonarqube;
\q

# Exit postgres user
exit
```

#### Configure PostgreSQL Authentication

```bash
# Edit pg_hba.conf
sudo vim /var/lib/pgsql/data/pg_hba.conf

# Find the lines with 'peer' and 'ident' and change to 'md5':
# Change from:
# local   all             all                                     peer
# host    all             all             127.0.0.1/32            ident

# To:
# local   all             all                                     md5
# host    all             all             127.0.0.1/32            md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 4.4 Create SonarQube User

```bash
# Create system user for SonarQube
sudo useradd -r -s /bin/bash sonarqube

# Create SonarQube directory
sudo mkdir -p /opt/sonarqube
sudo chown -R sonarqube:sonarqube /opt/sonarqube
```

### 4.5 Download and Install SonarQube

```bash
# Download SonarQube (Latest LTS version)
cd /tmp
wget https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-10.3.0.82913.zip

# Unzip
sudo unzip sonarqube-10.3.0.82913.zip -d /opt/

# Move and rename
sudo mv /opt/sonarqube-10.3.0.82913 /opt/sonarqube

# Set ownership
sudo chown -R sonarqube:sonarqube /opt/sonarqube
```

### 4.6 Configure SonarQube

```bash
# Edit SonarQube configuration
sudo vim /opt/sonarqube/conf/sonar.properties

# Uncomment and modify these lines:
sonar.jdbc.username=sonarqube
sonar.jdbc.password=sonar123
sonar.jdbc.url=jdbc:postgresql://localhost:5432/sonarqube

# Set web server properties:
sonar.web.host=0.0.0.0
sonar.web.port=9000

# Save and exit (:wq)
```

### 4.7 Create SonarQube Systemd Service

```bash
# Create service file
sudo vim /etc/systemd/system/sonarqube.service

# Add the following content:
```

```ini
[Unit]
Description=SonarQube service
After=syslog.target network.target

[Service]
Type=forking
ExecStart=/opt/sonarqube/bin/linux-x86-64/sonar.sh start
ExecStop=/opt/sonarqube/bin/linux-x86-64/sonar.sh stop
User=sonarqube
Group=sonarqube
Restart=always
LimitNOFILE=131072
LimitNPROC=8192

[Install]
WantedBy=multi-user.target
```

```bash
# Save and reload systemd
sudo systemctl daemon-reload

# Start SonarQube
sudo systemctl start sonarqube

# Enable SonarQube to start on boot
sudo systemctl enable sonarqube

# Check status
sudo systemctl status sonarqube

# Check logs if needed
sudo tail -f /opt/sonarqube/logs/sonar.log
```

### 4.8 Access SonarQube Web Interface

```bash
# Wait 2-3 minutes for SonarQube to start
# Access: http://<YOUR-EC2-PUBLIC-IP>:9000

# Default credentials:
Username: admin
Password: admin

# You'll be prompted to change password on first login
```

### 4.9 Install SonarQube Scanner

```bash
# Download SonarQube Scanner
cd /tmp
wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip

# Unzip
sudo unzip sonar-scanner-cli-5.0.1.3006-linux.zip -d /opt/

# Rename
sudo mv /opt/sonar-scanner-5.0.1.3006-linux /opt/sonar-scanner

# Add to PATH
echo 'export PATH=$PATH:/opt/sonar-scanner/bin' | sudo tee -a /etc/profile
source /etc/profile

# Verify installation
sonar-scanner --version
```

### 4.10 Configure SonarQube Scanner

```bash
# Edit scanner configuration
sudo vim /opt/sonar-scanner/conf/sonar-scanner.properties

# Uncomment and set:
sonar.host.url=http://localhost:9000
sonar.sourceEncoding=UTF-8

# Save and exit
```

### 4.11 Generate SonarQube Token for Jenkins

1. **Access SonarQube:** http://&lt;YOUR-EC2-IP&gt;:9000
2. **Login** with admin credentials
3. **Navigate to:** My Account → Security → Generate Tokens
4. **Token Name:** `jenkins-token`
5. **Type:** Global Analysis Token
6. **Expires in:** 90 days (or No expiration)
7. **Click Generate** and **COPY THE TOKEN** (you won't see it again!)
8. **Save it securely:** Example: `squ_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0`

---

## 5. Stage 3: Docker & DockerHub Setup

### 5.1 Install Docker

```bash
# Install Docker
sudo yum install docker -y

# Start Docker service
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Verify Docker installation
docker --version
sudo docker ps
```

### 5.2 Configure Docker Permissions

```bash
# Add ec2-user to docker group
sudo usermod -aG docker ec2-user

# Add jenkins user to docker group (will be created later)
# Note: Run this after Jenkins is installed
sudo usermod -aG docker jenkins

# Apply group changes (logout/login or run):
newgrp docker

# Verify docker works without sudo
docker ps
```

### 5.3 Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 5.4 Create DockerHub Account

1. **Visit:** https://hub.docker.com
2. **Click:** Sign Up
3. **Create account** with email and password
4. **Verify email** address
5. **Create repository:**
   - Click **Create Repository**
   - Name: `compressor-backend`
   - Visibility: Public (or Private)
   - Click **Create**
6. **Repeat** for `compressor-frontend`
7. **Note your DockerHub username:** Example: `saikiranasamwar4`

### 5.5 Generate DockerHub Access Token

1. **Login to DockerHub:** https://hub.docker.com
2. **Navigate to:** Account Settings → Security → New Access Token
3. **Token Description:** `jenkins-cicd-token`
4. **Access permissions:** Read, Write, Delete
5. **Click Generate** and **COPY THE TOKEN**
6. **Save securely:** Example: `dckr_pat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 5.6 Test Docker Login

```bash
# Login to DockerHub (from EC2)
docker login -u <your-dockerhub-username>
# Enter your password or access token when prompted

# Verify login
docker info | grep Username

# Logout (for security)
docker logout
```

### 5.7 Configure Docker Daemon (Optional but Recommended)

```bash
# Create daemon.json
sudo vim /etc/docker/daemon.json

# Add the following:
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
```

```bash
# Restart Docker
sudo systemctl restart docker
```

---

## 6. Jenkins Installation & Configuration

### 6.1 Install Jenkins

```bash
# Add Jenkins repository
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo

# Import Jenkins GPG key
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key

# Install Jenkins
sudo yum install jenkins -y

# Start Jenkins
sudo systemctl start jenkins

# Enable Jenkins to start on boot
sudo systemctl enable jenkins

# Check status
sudo systemctl status jenkins
```

### 6.2 Configure Jenkins User for Docker

```bash
# Add jenkins user to docker group
sudo usermod -aG docker jenkins

# Restart Jenkins to apply changes
sudo systemctl restart jenkins
```

### 6.3 Get Jenkins Initial Admin Password

```bash
# Get initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

# Copy this password (you'll need it for setup)
```

### 6.4 Access Jenkins Web Interface

1. **Open browser:** http://&lt;YOUR-EC2-PUBLIC-IP&gt;:8080
2. **Paste** the initial admin password
3. **Click Continue**

### 6.5 Jenkins Initial Setup

#### Install Suggested Plugins
1. **Select:** Install suggested plugins
2. **Wait** for all plugins to install (takes 5-10 minutes)

#### Create First Admin User
```
Username: admin
Password: <your-secure-password>
Full name: CI/CD Admin
Email: your.email@example.com
```

#### Jenkins URL Configuration
```
Jenkins URL: http://<YOUR-EC2-PUBLIC-IP>:8080/
Click: Save and Finish
Click: Start using Jenkins
```

### 6.6 Install Required Jenkins Plugins

1. **Navigate to:** Dashboard → Manage Jenkins → Plugins
2. **Click:** Available plugins
3. **Search and select** the following plugins:

#### Essential Plugins:
- [ ] **SonarQube Scanner** (for SonarQube integration)
- [ ] **Docker Pipeline** (for Docker operations in pipeline)
- [ ] **Docker** (for Docker integration)
- [ ] **Git** (should already be installed)
- [ ] **Pipeline** (should already be installed)
- [ ] **Credentials Binding** (should already be installed)

4. **Click:** Install
5. **Check:** Restart Jenkins when installation is complete
6. **Wait** for Jenkins to restart

### 6.7 Configure SonarQube in Jenkins

#### Add SonarQube Server

1. **Navigate to:** Manage Jenkins → System
2. **Scroll to:** SonarQube servers
3. **Click:** Add SonarQube
4. **Configure:**
   ```
   Name: SonarQube
   Server URL: http://localhost:9000
   Server authentication token: [Select from dropdown - we'll create this next]
   ```

#### Create SonarQube Credentials

1. **Click:** Add → Jenkins
2. **Kind:** Secret text
3. **Secret:** Paste your SonarQube token (from step 4.11)
4. **ID:** `sonarqube-token`
5. **Description:** `SonarQube Authentication Token`
6. **Click:** Add
7. **Select** the newly created credential
8. **Click:** Save

#### Configure SonarQube Scanner

1. **Navigate to:** Manage Jenkins → Tools
2. **Scroll to:** SonarQube Scanner installations
3. **Click:** Add SonarQube Scanner
4. **Configure:**
   ```
   Name: SonarQube Scanner
   Install automatically: [Check]
   Version: [Select latest version]
   ```
5. **Click:** Save

### 6.8 Configure Docker Credentials in Jenkins

#### Add DockerHub Credentials

1. **Navigate to:** Manage Jenkins → Credentials
2. **Click:** (global) domain
3. **Click:** Add Credentials
4. **Configure:**
   ```
   Kind: Username with password
   Scope: Global
   Username: <your-dockerhub-username>
   Password: <your-dockerhub-token-or-password>
   ID: dockerhub-credentials
   Description: DockerHub Credentials
   ```
5. **Click:** Create

### 6.9 Configure Git in Jenkins

#### Install Git on Jenkins

```bash
# Verify git is accessible by Jenkins
sudo -u jenkins git --version

# If not found, create symlink
sudo ln -s /usr/bin/git /usr/local/bin/git
```

#### Configure Git in Jenkins

1. **Navigate to:** Manage Jenkins → Tools
2. **Scroll to:** Git installations
3. **Configure:**
   ```
   Name: Default
   Path to Git executable: git
   ```
4. **Click:** Save

---

## 7. Pipeline Configuration

### 7.1 Create Jenkins Pipeline Job

1. **Navigate to:** Jenkins Dashboard
2. **Click:** New Item
3. **Enter name:** `Compressorr-CICD-Pipeline`
4. **Select:** Pipeline
5. **Click:** OK

### 7.2 Configure Pipeline

#### General Section:
- **Description:** `3-Stage CI/CD Pipeline: Git → SonarQube → Docker & DockerHub`
- **Check:** GitHub project (if using GitHub)
- **Project URL:** `https://github.com/yourusername/Compressorr`

#### Build Triggers (Optional):
- [ ] **GitHub hook trigger for GITScm polling** (for automatic builds on push)
- [ ] **Poll SCM:** `H/5 * * * *` (check for changes every 5 minutes)

#### Pipeline Section:

**Definition:** Pipeline script from SCM

**SCM:** Git

**Repository URL:** `https://github.com/yourusername/Compressorr.git`  
(Or your Git repository URL)

**Credentials:** (Select if private repo, or leave as "none" for public)

**Branch Specifier:** `*/main` (or `*/master` depending on your branch)

**Script Path:** `Jenkinsfile`

**Click:** Save

### 7.3 Verify Jenkinsfile in Repository

Ensure your Jenkinsfile exists in the repository root:

```groovy
pipeline {
  agent any

  environment {
    DOCKERHUB_USERNAME = 'saikiranasamwar4'
    DOCKERHUB_BACKEND  = "${DOCKERHUB_USERNAME}/compressor-backend"
    DOCKERHUB_FRONTEND = "${DOCKERHUB_USERNAME}/compressor-frontend"
  }

  stages {
    // Stage 1: Git Checkout
    // Stage 2: SonarQube Analysis
    // Stage 3: Docker Build & Push
  }

  post {
    always {
      sh 'docker logout || true'
    }
  }
}
```

---

## 8. Testing the Pipeline

### 8.1 Manual Build Test

1. **Navigate to:** Pipeline job → `Compressorr-CICD-Pipeline`
2. **Click:** Build Now
3. **Monitor:** Build progress in Build History
4. **Click:** On the build number → Console Output

### 8.2 Expected Pipeline Stages

You should see the following stages execute:

```
✅ Stage 1: Git Checkout
   └─ Cloning repository
   └─ Checking out branch

✅ Stage 2: SonarQube Analysis
   └─ Installing npm dependencies
   └─ Running SonarQube scanner
   └─ Waiting for Quality Gate
   └─ Quality Gate: PASSED

✅ Stage 3: Build & Push Docker Images
   └─ Docker login to DockerHub
   └─ Building backend image
   └─ Pushing backend image (build number + latest)
   └─ Building frontend image
   └─ Pushing frontend image (build number + latest)
   └─ Docker logout
```

### 8.3 Verify Build Success

#### Check Jenkins Console Output:
```
✅ Pipeline executed successfully
✅ All images pushed to DockerHub
```

#### Verify on DockerHub:
1. **Login to:** https://hub.docker.com
2. **Navigate to:** Repositories
3. **Verify images:**
   - `compressor-backend:latest`
   - `compressor-backend:1` (build number)
   - `compressor-frontend:latest`
   - `compressor-frontend:1` (build number)

#### Check SonarQube Results:
1. **Access:** http://&lt;YOUR-EC2-IP&gt;:9000
2. **Login** and navigate to Projects
3. **Click:** compressorr
4. **Review:** Code quality metrics, bugs, vulnerabilities

### 8.4 Test Automatic Triggers (Optional)

#### Setup GitHub Webhook:

1. **Navigate to:** Your GitHub repository → Settings → Webhooks
2. **Click:** Add webhook
3. **Payload URL:** `http://<YOUR-EC2-PUBLIC-IP>:8080/github-webhook/`
4. **Content type:** application/json
5. **Events:** Just the push event
6. **Active:** ✓
7. **Click:** Add webhook

#### Test Webhook:
```bash
# Make a small change and push
echo "# Test change" >> README.md
git add README.md
git commit -m "Test webhook trigger"
git push origin main
```

**Expected:** Jenkins automatically starts a new build

---

## 9. Troubleshooting

### 9.1 Jenkins Issues

#### Jenkins not starting:
```bash
# Check logs
sudo journalctl -u jenkins -f

# Check Java version
java -version

# Restart Jenkins
sudo systemctl restart jenkins
```

#### Permission denied for Docker:
```bash
# Add jenkins to docker group
sudo usermod -aG docker jenkins

# Restart Jenkins
sudo systemctl restart jenkins

# Verify
sudo -u jenkins docker ps
```

### 9.2 SonarQube Issues

#### SonarQube not starting:
```bash
# Check logs
sudo tail -f /opt/sonarqube/logs/sonar.log
sudo tail -f /opt/sonarqube/logs/web.log

# Check system limits
ulimit -a

# Restart SonarQube
sudo systemctl restart sonarqube
```

#### Database connection error:
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test connection
psql -U sonarqube -d sonarqube -h localhost -W

# Check pg_hba.conf authentication
sudo vim /var/lib/pgsql/data/pg_hba.conf
```

#### Quality Gate timeout:
```yaml
# In Jenkinsfile, increase timeout:
stage('Quality Gate') {
  steps {
    timeout(time: 10, unit: 'MINUTES') {  # Increased from 5 to 10
      waitForQualityGate abortPipeline: true
    }
  }
}
```

### 9.3 Docker Issues

#### Docker daemon not running:
```bash
# Start Docker
sudo systemctl start docker

# Enable on boot
sudo systemctl enable docker

# Check status
sudo systemctl status docker
```

#### Cannot push to DockerHub:
```bash
# Re-login
docker login -u <username>

# Check credentials in Jenkins
# Manage Jenkins → Credentials → dockerhub-credentials

# Test manually
docker tag compressor-backend:latest username/compressor-backend:test
docker push username/compressor-backend:test
```

#### Out of disk space:
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes -f

# Remove old images
docker image prune -a -f
```

### 9.4 Git Issues

#### Authentication failed:
```bash
# For HTTPS, use personal access token instead of password
# GitHub: Settings → Developer settings → Personal access tokens

# For SSH:
ssh-keygen -t rsa -b 4096
cat ~/.ssh/id_rsa.pub
# Add to GitHub/GitLab SSH keys
```

#### Jenkinsfile not found:
```bash
# Verify Jenkinsfile exists in repo root
ls -la Jenkinsfile

# Check branch name in Jenkins pipeline config
# Should match your actual branch (main/master)

# Check repository URL
git remote -v
```

### 9.5 Common Pipeline Errors

#### SonarQube scanner not found:
```bash
# Install manually and add to PATH
export PATH=$PATH:/opt/sonar-scanner/bin

# Or in Jenkins → Manage Jenkins → Tools → SonarQube Scanner
# Set installation directory: /opt/sonar-scanner
```

#### npm ci fails:
```bash
# Install Node.js on Jenkins server
sudo yum install nodejs npm -y

# Verify
node --version
npm --version
```

#### Build fails with "permission denied":
```bash
# Check file permissions
ls -la Dockerfiles/

# Ensure Docker socket is accessible
sudo chmod 666 /var/run/docker.sock
```

---

## 10. Verification Checklist

### ✅ Pre-Pipeline Checklist

- [ ] EC2 instance running and accessible
- [ ] Security group configured correctly
- [ ] Git installed and configured
- [ ] Java 17 installed
- [ ] SonarQube running on port 9000
- [ ] Docker installed and running
- [ ] DockerHub account created
- [ ] Jenkins running on port 8080
- [ ] All required Jenkins plugins installed
- [ ] SonarQube server configured in Jenkins
- [ ] DockerHub credentials added to Jenkins
- [ ] Jenkinsfile present in repository

### ✅ Post-Pipeline Checklist

- [ ] Build completed successfully
- [ ] All 3 stages executed (Git, SonarQube, Docker)
- [ ] Quality Gate passed
- [ ] Docker images pushed to DockerHub
- [ ] Images tagged with build number and latest
- [ ] No errors in Jenkins console output

---

## 11. Important URLs & Credentials

### Services Access

| Service      | URL                                          | Default Credentials      |
|--------------|----------------------------------------------|--------------------------|
| Jenkins      | http://&lt;EC2-IP&gt;:8080                   | admin / &lt;your-password&gt; |
| SonarQube    | http://&lt;EC2-IP&gt;:9000                   | admin / &lt;new-password&gt;  |
| DockerHub    | https://hub.docker.com                       | &lt;your-account&gt;          |

### Jenkins Credential IDs

| ID                     | Type              | Usage                    |
|------------------------|-------------------|--------------------------|
| dockerhub-credentials  | Username/Password | Docker login             |
| sonarqube-token        | Secret text       | SonarQube authentication |

### Important Paths

| Service      | Path                              |
|--------------|-----------------------------------|
| Jenkins      | /var/lib/jenkins                  |
| SonarQube    | /opt/sonarqube                    |
| Sonar Scanner| /opt/sonar-scanner                |
| Docker       | /var/lib/docker                   |

---

## 12. Maintenance Commands

### Jenkins

```bash
# Start/Stop/Restart
sudo systemctl start jenkins
sudo systemctl stop jenkins
sudo systemctl restart jenkins

# View logs
sudo journalctl -u jenkins -f

# Backup Jenkins
sudo tar -czf jenkins-backup-$(date +%F).tar.gz /var/lib/jenkins
```

### SonarQube

```bash
# Start/Stop/Restart
sudo systemctl start sonarqube
sudo systemctl stop sonarqube
sudo systemctl restart sonarqube

# View logs
sudo tail -f /opt/sonarqube/logs/sonar.log

# Backup database
pg_dump -U sonarqube sonarqube > sonarqube-backup-$(date +%F).sql
```

### Docker

```bash
# Clean up
docker system prune -a -f

# View images
docker images

# View containers
docker ps -a

# Remove all stopped containers
docker container prune -f
```

---

## 📝 Summary

You now have a complete 3-stage CI/CD pipeline:

1. **Git** - Automatically checks out code from repository
2. **SonarQube** - Analyzes code quality and enforces quality gates
3. **Docker & DockerHub** - Builds and pushes container images

Every push to your repository will trigger:
- ✅ Code quality analysis
- ✅ Automated testing
- ✅ Docker image creation
- ✅ Image deployment to DockerHub

---

## 🎯 Next Steps

After mastering these 3 stages, you can add:
- Stage 4: Unit Testing
- Stage 5: Integration Testing
- Stage 6: Security Scanning (Trivy, OWASP)
- Stage 7: Kubernetes Deployment
- Stage 8: Monitoring & Alerting

---

**Document Version:** 1.0  
**Last Updated:** December 22, 2025  
**Author:** CI/CD Team  
**Status:** Production Ready
