# 🚀 Complete CI/CD Pipeline Setup Guide
## 4-Stage Pipeline: Git → Docker & DockerHub → EKS Deployment → Health Check

---

## 📑 Table of Contents
1. [EC2 Instance Setup](#1-ec2-instance-setup)
2. [Server Initial Configuration](#2-server-initial-configuration)
3. [Stage 1: Git Configuration](#3-stage-1-git-configuration)
4. [Stage 2: Docker & DockerHub Setup](#4-stage-2-docker--dockerhub-setup)
5. [Stage 3: EKS Cluster Setup](#5-stage-3-eks-cluster-setup)
6. [Stage 4: Kubernetes Configuration](#6-stage-4-kubernetes-configuration)
7. [Jenkins Installation & Configuration](#7-jenkins-installation--configuration)
8. [Pipeline Configuration](#8-pipeline-configuration)
9. [Testing the Pipeline](#9-testing-the-pipeline)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. EC2 Instance Setup

### 1.1 Launch EC2 Instance

#### Step 1: Log in to AWS Console
1. Navigate to **AWS Management Console**
2. Go to **EC2 Dashboard**
3. Click **Launch Instance**

#### Step 2: Configure Instance Details
```yaml
Name: Jenkins-Docker-EKS-Server
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

### 2.4 Configure Firewall (if enabled)

```bash
# Check firewall status
sudo systemctl status firewalld

# If firewalld is active, add rules:
sudo firewall-cmd --permanent --add-port=8080/tcp  # Jenkins
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

## 4. Stage 2: Docker & DockerHub Setup

### 4.1 Install Docker

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

### 4.2 Configure Docker Permissions

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

### 4.3 Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 4.4 Create DockerHub Account

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

### 4.5 Generate DockerHub Access Token

1. **Login to DockerHub:** https://hub.docker.com
2. **Navigate to:** Account Settings → Security → New Access Token
3. **Token Description:** `jenkins-cicd-token`
4. **Access permissions:** Read, Write, Delete
5. **Click Generate** and **COPY THE TOKEN**
6. **Save securely:** Example: `dckr_pat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 4.6 Test Docker Login

```bash
# Login to DockerHub (from EC2)
docker login -u <your-dockerhub-username>
# Enter your password or access token when prompted

# Verify login
docker info | grep Username

# Logout (for security)
docker logout
```

### 4.7 Configure Docker Daemon (Optional but Recommended)

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

## 5. Stage 3: EKS Cluster Setup

### 5.1 Install AWS CLI

```bash
# Download and install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

### 5.2 Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# You'll be prompted for:
AWS Access Key ID: <YOUR_ACCESS_KEY>
AWS Secret Access Key: <YOUR_SECRET_KEY>
Default region name: us-east-1
Default output format: json
```

#### To Get AWS Credentials:

1. **Login to AWS Console**
2. **Navigate to:** IAM → Users → Your User
3. **Click:** Security credentials tab
4. **Click:** Create access key
5. **Select:** Command Line Interface (CLI)
6. **Click:** Next → Create access key
7. **Copy** Access Key ID and Secret Access Key
8. **Important:** Download and save securely!

### 5.3 Install kubectl

```bash
# Download kubectl binary
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Make it executable
chmod +x kubectl

# Move to PATH
sudo mv kubectl /usr/local/bin/

# Verify installation
kubectl version --client
```

### 5.4 Install eksctl

```bash
# Download eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp

# Move to PATH
sudo mv /tmp/eksctl /usr/local/bin

# Verify installation
eksctl version
```

### 5.5 Create EKS Cluster

#### Option 1: Using eksctl (Recommended for beginners)

```bash
# Create cluster with eksctl
eksctl create cluster \
  --name media-compressor-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 3 \
  --managed

# This will take 15-20 minutes
```

#### Option 2: Using AWS Console

1. **Navigate to:** EKS Console
2. **Click:** Create cluster
3. **Cluster name:** `media-compressor-cluster`
4. **Kubernetes version:** Latest stable (e.g., 1.28)
5. **Cluster service role:** Create new or select existing
6. **Click:** Next
7. **VPC:** Use default VPC or create new
8. **Subnets:** Select at least 2 subnets in different AZs
9. **Security groups:** Default
10. **Cluster endpoint access:** Public
11. **Click:** Next → Next → Create

#### Create Node Group (if using AWS Console):

1. **Navigate to:** Your cluster → Compute → Add node group
2. **Node group name:** `standard-workers`
3. **Node IAM role:** Create new or select existing
4. **Click:** Next
5. **Instance type:** t3.medium
6. **Disk size:** 20 GB
7. **Desired size:** 2
8. **Minimum size:** 1
9. **Maximum size:** 3
10. **Click:** Next → Next → Create

### 5.6 Verify EKS Cluster

```bash
# Update kubeconfig
aws eks update-kubeconfig --name media-compressor-cluster --region us-east-1

# Verify cluster connection
kubectl get nodes

# You should see 2 nodes in Ready state
# Example output:
# NAME                           STATUS   ROLES    AGE   VERSION
# ip-192-168-1-10.ec2.internal   Ready    <none>   5m    v1.28.0
# ip-192-168-1-11.ec2.internal   Ready    <none>   5m    v1.28.0
```

### 5.7 Create IAM User for Jenkins (EKS Access)

```bash
# Create IAM policy for Jenkins
cat > jenkins-eks-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eks:DescribeCluster",
                "eks:ListClusters",
                "eks:UpdateClusterConfig",
                "eks:DescribeNodegroup",
                "eks:ListNodegroups",
                "eks:DescribeUpdate",
                "eks:ListUpdates"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Create IAM policy
aws iam create-policy \
    --policy-name Jenkins-EKS-Access \
    --policy-document file://jenkins-eks-policy.json

# Note the Policy ARN from output
```

#### Create IAM User via AWS Console:

1. **Navigate to:** IAM → Users → Create user
2. **User name:** `jenkins-eks-user`
3. **Click:** Next
4. **Attach policies:**
   - `Jenkins-EKS-Access` (custom policy created above)
   - `AmazonEKSClusterPolicy`
5. **Click:** Next → Create user
6. **Click on user** → Security credentials
7. **Create access key** → CLI
8. **Copy and save** Access Key ID and Secret Key

---

## 6. Stage 4: Kubernetes Configuration

### 6.1 Create Kubernetes Namespace

```bash
# Create namespace for the application
kubectl create namespace media-app

# Verify namespace
kubectl get namespaces
```

### 6.2 Deploy MongoDB to EKS

```bash
# Navigate to your project k8s directory
cd ~/Compressorr/k8s

# Create namespace first (if not created)
kubectl apply -f namespace.yaml

# Deploy MongoDB secret
kubectl apply -f mongo/mongo-secret.yaml

# Deploy MongoDB StatefulSet
kubectl apply -f mongo/mongo-statefulset.yaml

# Deploy MongoDB Service
kubectl apply -f mongo/mongo-service.yaml

# Verify MongoDB pods
kubectl get pods -n media-app

# Wait until MongoDB pod is Running
kubectl wait --for=condition=ready pod -l app=mongodb -n media-app --timeout=300s
```

### 6.3 Deploy Backend to EKS

```bash
# Deploy backend deployment
kubectl apply -f backend/backend-deployment.yaml

# Deploy backend service
kubectl apply -f backend/backend-service.yaml

# Verify backend deployment
kubectl get deployments -n media-app
kubectl get pods -n media-app
```

### 6.4 Deploy Frontend to EKS

```bash
# Deploy frontend deployment
kubectl apply -f frontend/frontend-deployment.yaml

# Deploy frontend service
kubectl apply -f frontend/frontend-service.yaml

# Verify frontend deployment
kubectl get deployments -n media-app
kubectl get pods -n media-app
```

### 6.5 Verify All Deployments

```bash
# Check all resources in namespace
kubectl get all -n media-app

# Check pod logs (if needed)
kubectl logs -f <pod-name> -n media-app

# Get service endpoints
kubectl get svc -n media-app
```

### 6.6 Access the Application

```bash
# Get LoadBalancer URL (if using LoadBalancer service type)
kubectl get svc frontend -n media-app

# The EXTERNAL-IP column will show the LoadBalancer URL
# Access: http://<EXTERNAL-IP>
```

---

## 7. Jenkins Installation & Configuration

### 7.1 Install Jenkins

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

### 7.2 Configure Jenkins User for Docker

```bash
# Add jenkins user to docker group
sudo usermod -aG docker jenkins

# Restart Jenkins to apply changes
sudo systemctl restart jenkins
```

### 7.3 Get Jenkins Initial Admin Password

```bash
# Get initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

# Copy this password (you'll need it for setup)
```

### 7.4 Access Jenkins Web Interface

1. **Open browser:** http://&lt;YOUR-EC2-PUBLIC-IP&gt;:8080
2. **Paste** the initial admin password
3. **Click Continue**

### 7.5 Jenkins Initial Setup

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

### 7.6 Install Required Jenkins Plugins

1. **Navigate to:** Dashboard → Manage Jenkins → Plugins
2. **Click:** Available plugins
3. **Search and select** the following plugins:

#### Essential Plugins:
- [ ] **Docker Pipeline** (for Docker operations in pipeline)
- [ ] **Docker** (for Docker integration)
- [ ] **Kubernetes** (for K8s deployment)
- [ ] **Kubernetes CLI** (for kubectl commands)
- [ ] **AWS Credentials** (for AWS authentication)
- [ ] **Git** (should already be installed)
- [ ] **Pipeline** (should already be installed)
- [ ] **Credentials Binding** (should already be installed)

4. **Click:** Install
5. **Check:** Restart Jenkins when installation is complete
6. **Wait** for Jenkins to restart

### 7.7 Configure Docker Credentials in Jenkins

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

### 7.8 Configure AWS Credentials in Jenkins

#### Add AWS Credentials

1. **Navigate to:** Manage Jenkins → Credentials
2. **Click:** (global) domain
3. **Click:** Add Credentials
4. **Configure:**
   ```
   Kind: AWS Credentials
   Scope: Global
   Access Key ID: <jenkins-eks-user-access-key>
   Secret Access Key: <jenkins-eks-user-secret-key>
   ID: aws-credentials
   Description: AWS EKS Access Credentials
   ```
5. **Click:** Create

### 7.9 Install kubectl and AWS CLI on Jenkins Server

```bash
# These should already be installed from earlier steps
# Verify they are accessible by jenkins user
sudo -u jenkins kubectl version --client
sudo -u jenkins aws --version

# Configure AWS for jenkins user
sudo -u jenkins aws configure
# Enter the same credentials as before
```

### 7.10 Configure Git in Jenkins

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

## 8. Pipeline Configuration

### 8.1 Create Jenkins Pipeline Job

1. **Navigate to:** Jenkins Dashboard
2. **Click:** New Item
3. **Enter name:** `Compressorr-CICD-Pipeline`
4. **Select:** Pipeline
5. **Click:** OK

### 8.2 Configure Pipeline

#### General Section:
- **Description:** `4-Stage CI/CD Pipeline: Git → Docker & DockerHub → EKS Deployment → Health Check`
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

### 8.3 Verify Jenkinsfile in Repository

Ensure your Jenkinsfile exists in the repository root with the following structure:

```groovy
pipeline {
  agent any

  environment {
    DOCKERHUB_USERNAME = 'saikiranasamwar4'
    DOCKERHUB_BACKEND  = "${DOCKERHUB_USERNAME}/compressor-backend"
    DOCKERHUB_FRONTEND = "${DOCKERHUB_USERNAME}/compressor-frontend"
    AWS_REGION  = 'us-east-1'
    EKS_CLUSTER = 'media-compressor-cluster'
    NAMESPACE   = 'media-app'
  }

  stages {
    // Stage 1: Git Checkout
    // Stage 2: Docker Build & Push
    // Stage 3: EKS Deployment
    // Stage 4: Health Check
  }

  post {
    always {
      sh 'docker logout || true'
    }
  }
}
```

---

## 9. Testing the Pipeline

### 9.1 Manual Build Test

1. **Navigate to:** Pipeline job → `Compressorr-CICD-Pipeline`
2. **Click:** Build Now
3. **Monitor:** Build progress in Build History
4. **Click:** On the build number → Console Output

### 9.2 Expected Pipeline Stages

You should see the following stages execute:

```
✅ Stage 1: Git Checkout
   └─ Cloning repository
   └─ Checking out branch

✅ Stage 2: Build & Push Docker Images
   └─ Docker login to DockerHub
   └─ Building backend image
   └─ Pushing backend image (build number + latest)
   └─ Building frontend image
   └─ Pushing frontend image (build number + latest)
   └─ Docker logout

✅ Stage 3: Deploy to Amazon EKS
   └─ Updating kubeconfig for EKS
   └─ Updating backend deployment
   └─ Updating frontend deployment
   └─ Waiting for rollout completion

✅ Stage 4: Post-Deployment Health Check
   └─ Checking pod status
   └─ Checking service status
```

### 9.3 Verify Build Success

#### Check Jenkins Console Output:
```
✅ Pipeline executed successfully
✅ All images pushed to DockerHub
✅ Deployment to EKS completed
✅ Health checks passed
```

#### Verify on DockerHub:
1. **Login to:** https://hub.docker.com
2. **Navigate to:** Repositories
3. **Verify images:**
   - `compressor-backend:latest`
   - `compressor-backend:1` (build number)
   - `compressor-frontend:latest`
   - `compressor-frontend:1` (build number)

#### Check EKS Deployment:
```bash
# Check pods
kubectl get pods -n media-app

# Check deployments
kubectl get deployments -n media-app

# Check services
kubectl get svc -n media-app

# Check pod logs
kubectl logs -f deployment/backend -n media-app
```

#### Access the Application:
```bash
# Get frontend service URL
kubectl get svc frontend -n media-app

# Access the application
# http://<LOAD-BALANCER-URL>
```

### 9.4 Test Automatic Triggers (Optional)

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

## 10. Troubleshooting

### 10.1 Jenkins Issues

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

### 10.2 Docker Issues

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

### 10.3 EKS & Kubernetes Issues

#### Cannot connect to EKS cluster:
```bash
# Update kubeconfig
aws eks update-kubeconfig --name media-compressor-cluster --region us-east-1

# Verify AWS credentials
aws sts get-caller-identity

# Check cluster status
aws eks describe-cluster --name media-compressor-cluster --region us-east-1
```

#### Pods not starting:
```bash
# Describe pod to see error
kubectl describe pod <pod-name> -n media-app

# Check pod logs
kubectl logs <pod-name> -n media-app

# Common issues:
# - ImagePullBackOff: Check image name and DockerHub credentials
# - CrashLoopBackOff: Check application logs
# - Pending: Check node resources (kubectl describe nodes)
```

#### Image pull errors:
```bash
# Verify image exists on DockerHub
# Verify image name in deployment YAML matches DockerHub repo

# For private repos, create image pull secret:
kubectl create secret docker-registry dockerhub-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=<username> \
  --docker-password=<token> \
  -n media-app

# Add to deployment spec:
# imagePullSecrets:
#   - name: dockerhub-secret
```

#### Service LoadBalancer stuck in pending:
```bash
# Check service
kubectl describe svc frontend -n media-app

# Verify AWS Load Balancer Controller is installed
# Or use NodePort/ClusterIP instead of LoadBalancer

# To use NodePort:
kubectl patch svc frontend -n media-app -p '{"spec":{"type":"NodePort"}}'

# Get node IP and NodePort
kubectl get nodes -o wide
kubectl get svc frontend -n media-app
# Access: http://<NODE-EXTERNAL-IP>:<NODE-PORT>
```

### 10.4 Git Issues

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

### 10.5 Common Pipeline Errors

#### AWS credentials error:
```bash
# Verify credentials in Jenkins
# Manage Jenkins → Credentials → aws-credentials

# Test AWS CLI access
aws eks describe-cluster --name media-compressor-cluster --region us-east-1

# Verify IAM user has proper permissions
```

#### kubectl command not found:
```bash
# Install kubectl (if not installed)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Verify jenkins user can access kubectl
sudo -u jenkins kubectl version --client
```

#### Deployment rollout timeout:
```bash
# Check pod status
kubectl get pods -n media-app

# Increase timeout in Jenkinsfile:
kubectl -n media-app rollout status deployment/backend --timeout=10m

# Or remove rollout wait completely for faster pipeline
```

---

## 11. Verification Checklist

### ✅ Pre-Pipeline Checklist

- [ ] EC2 instance running and accessible
- [ ] Security group configured correctly
- [ ] Git installed and configured
- [ ] Docker installed and running
- [ ] DockerHub account created
- [ ] EKS cluster created and running
- [ ] kubectl installed and configured
- [ ] AWS CLI installed and configured
- [ ] Kubernetes resources deployed (namespace, mongo, etc.)
- [ ] Jenkins running on port 8080
- [ ] All required Jenkins plugins installed
- [ ] DockerHub credentials added to Jenkins
- [ ] AWS credentials added to Jenkins
- [ ] Jenkinsfile present in repository

### ✅ Post-Pipeline Checklist

- [ ] Build completed successfully
- [ ] All 4 stages executed (Git, Docker, EKS, Health Check)
- [ ] Docker images pushed to DockerHub
- [ ] Images tagged with build number and latest
- [ ] Pods deployed and running in EKS
- [ ] Services accessible
- [ ] No errors in Jenkins console output
- [ ] Application accessible via LoadBalancer/NodePort

---

## 12. Important URLs & Credentials

### Services Access

| Service      | URL                                          | Default Credentials      |
|--------------|----------------------------------------------|--------------------------|
| Jenkins      | http://&lt;EC2-IP&gt;:8080                   | admin / &lt;your-password&gt; |
| DockerHub    | https://hub.docker.com                       | &lt;your-account&gt;          |
| EKS Console  | https://console.aws.amazon.com/eks           | AWS credentials          |

### Jenkins Credential IDs

| ID                     | Type              | Usage                    |
|------------------------|-------------------|--------------------------|
| dockerhub-credentials  | Username/Password | Docker login             |
| aws-credentials        | AWS Credentials   | EKS deployment           |

### Important Paths

| Service      | Path                              |
|--------------|-----------------------------------|
| Jenkins      | /var/lib/jenkins                  |
| Docker       | /var/lib/docker                   |
| kubectl config| ~/.kube/config                   |

### AWS Resources

| Resource     | Name                              |
|--------------|-----------------------------------|
| EKS Cluster  | media-compressor-cluster          |
| Namespace    | media-app                         |
| Region       | us-east-1                         |

---

## 13. Maintenance Commands

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

### Kubernetes

```bash
# Get all resources
kubectl get all -n media-app

# Delete and recreate deployment
kubectl delete deployment backend -n media-app
kubectl apply -f k8s/backend/backend-deployment.yaml

# Restart deployment
kubectl rollout restart deployment/backend -n media-app

# Scale deployment
kubectl scale deployment/backend --replicas=3 -n media-app

# View logs
kubectl logs -f deployment/backend -n media-app
```

### EKS Cluster

```bash
# Update kubeconfig
aws eks update-kubeconfig --name media-compressor-cluster --region us-east-1

# Get cluster info
kubectl cluster-info

# Get nodes
kubectl get nodes

# Drain node (for maintenance)
kubectl drain <node-name> --ignore-daemonsets

# Delete cluster (CAUTION!)
eksctl delete cluster --name media-compressor-cluster --region us-east-1
```

---

## 📝 Summary

You now have a complete 4-stage CI/CD pipeline:

1. **Git** - Automatically checks out code from repository
2. **Docker & DockerHub** - Builds and pushes container images
3. **EKS Deployment** - Deploys to Amazon EKS cluster
4. **Health Check** - Verifies deployment health

Every push to your repository will trigger:
- ✅ Automated code checkout
- ✅ Docker image creation
- ✅ Image deployment to DockerHub
- ✅ Kubernetes deployment to EKS
- ✅ Health verification

---

## 🎯 Next Steps

After mastering these 4 stages, you can add:
- Code quality analysis (SonarQube)
- Unit Testing
- Integration Testing  
- Security Scanning (Trivy, OWASP)
- Advanced monitoring (Prometheus, Grafana)
- Auto-scaling configurations
- Blue-Green deployments

---

## 📚 Additional Resources

- **Jenkins Documentation:** https://www.jenkins.io/doc/
- **Docker Documentation:** https://docs.docker.com/
- **Kubernetes Documentation:** https://kubernetes.io/docs/
- **EKS Documentation:** https://docs.aws.amazon.com/eks/
- **eksctl Documentation:** https://eksctl.io/

---

**Document Version:** 2.0  
**Last Updated:** December 22, 2025  
**Author:** CI/CD Team  
**Status:** Production Ready
