# 🚀 Compressorr - Complete Production Deployment Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Infrastructure Setup](#aws-infrastructure-setup)
3. [EC2 Instance Configuration](#ec2-instance-configuration)
4. [Docker & DockerHub Setup](#docker--dockerhub-setup)
5. [EKS Cluster Deployment](#eks-cluster-deployment)
6. [Ansible Automation](#ansible-automation)
7. [Jenkins CI/CD Pipeline](#jenkins-cicd-pipeline)
8. [SonarQube Integration](#sonarqube-integration)
9. [Prometheus & Grafana Monitoring](#prometheus--grafana-monitoring)
10. [Complete Deployment Workflow](#complete-deployment-workflow)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install eksctl
curl --silent --location "https://github.com/weksctl-io/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Install Ansible
sudo apt update
sudo apt install -y ansible

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Terraform (optional)
wget https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_linux_amd64.zip
unzip terraform_1.6.6_linux_amd64.zip
sudo mv terraform /usr/local/bin/
```

### AWS Account Requirements
- AWS Account with appropriate permissions
- AWS Access Key ID and Secret Access Key
- Default VPC or custom VPC configured
- Required IAM roles for EKS, EC2, and ECR

### Configure AWS CLI
```bash
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region name: us-east-1
# Default output format: json
```

---

## AWS Infrastructure Setup

### Step 1: Create Key Pair
```bash
# Create SSH key pair for EC2 instances
aws ec2 create-key-pair \
  --key-name compressorr-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/compressorr-key.pem

chmod 400 ~/.ssh/compressorr-key.pem
```

### Step 2: Create Security Groups
```bash
# Create security group for Jenkins
aws ec2 create-security-group \
  --group-name jenkins-sg \
  --description "Security group for Jenkins server"

JENKINS_SG_ID=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=jenkins-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Allow SSH, HTTP, and Jenkins port
aws ec2 authorize-security-group-ingress \
  --group-id $JENKINS_SG_ID \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $JENKINS_SG_ID \
  --protocol tcp --port 8080 --cidr 0.0.0.0/0

# Create security group for SonarQube
aws ec2 create-security-group \
  --group-name sonarqube-sg \
  --description "Security group for SonarQube server"

SONAR_SG_ID=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=sonarqube-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $SONAR_SG_ID \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SONAR_SG_ID \
  --protocol tcp --port 9000 --cidr 0.0.0.0/0

# Create security group for Monitoring
aws ec2 create-security-group \
  --group-name monitoring-sg \
  --description "Security group for Prometheus and Grafana"

MONITORING_SG_ID=$(aws ec2 describe-security-group \
  --filters Name=group-name,Values=monitoring-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $MONITORING_SG_ID \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $MONITORING_SG_ID \
  --protocol tcp --port 9090 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $MONITORING_SG_ID \
  --protocol tcp --port 3000 --cidr 0.0.0.0/0

# Create security group for Application
aws ec2 create-security-group \
  --group-name app-sg \
  --description "Security group for Application servers"

APP_SG_ID=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=app-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG_ID \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG_ID \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG_ID \
  --protocol tcp --port 8080 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG_ID \
  --protocol tcp --port 3000 --cidr 0.0.0.0/0
```

---

## EC2 Instance Configuration

### Step 1: Launch EC2 Instances

#### Jenkins Server
```bash
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.medium \
  --key-name compressorr-key \
  --security-group-ids $JENKINS_SG_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Jenkins-Server}]' \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]'
```

#### SonarQube Server
```bash
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.medium \
  --key-name compressorr-key \
  --security-group-ids $SONAR_SG_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=SonarQube-Server}]' \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]'
```

#### Monitoring Server (Prometheus + Grafana)
```bash
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.medium \
  --key-name compressorr-key \
  --security-group-ids $MONITORING_SG_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Monitoring-Server}]' \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]'
```

#### Application Server (Optional - for Docker deployment)
```bash
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.large \
  --key-name compressorr-key \
  --security-group-ids $APP_SG_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=App-Server}]' \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]'
```

### Step 2: Get Instance IPs
```bash
# Get Public IPs
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=Jenkins-Server" \
  --query 'Reservations[*].Instances[*].PublicIpAddress' \
  --output text

aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=SonarQube-Server" \
  --query 'Reservations[*].Instances[*].PublicIpAddress' \
  --output text

aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=Monitoring-Server" \
  --query 'Reservations[*].Instances[*].PublicIpAddress' \
  --output text

aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=App-Server" \
  --query 'Reservations[*].Instances[*].PublicIpAddress' \
  --output text
```

### Step 3: Update Ansible Inventory
Edit `ansible/inventory/hosts.ini` with the actual IP addresses:
```ini
[ec2_instances]
ec2-jenkins ansible_host=<JENKINS_IP> ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/compressorr-key.pem
ec2-sonarqube ansible_host=<SONARQUBE_IP> ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/compressorr-key.pem
ec2-monitoring ansible_host=<MONITORING_IP> ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/compressorr-key.pem
ec2-app ansible_host=<APP_IP> ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/compressorr-key.pem
```

---

## Docker & DockerHub Setup

### Step 1: Build Docker Images Locally
```bash
# Build Backend Image
cd backend
docker build -f ../Dockerfiles/backend.Dockerfile -t saikiranasamwar4/compressor-backend:latest .
docker build -f ../Dockerfiles/backend.Dockerfile -t saikiranasamwar4/compressor-backend:v1.0.0 .

# Build Frontend Image
cd ../frontend
docker build -f ../Dockerfiles/frontend.Dockerfile -t saikiranasamwar4/compressor-frontend:latest .
docker build -f ../Dockerfiles/frontend.Dockerfile -t saikiranasamwar4/compressor-frontend:v1.0.0 .

cd ..
```

### Step 2: Login to DockerHub
```bash
docker login
# Username: saikiranasamwar4
# Password: your_dockerhub_password
```

### Step 3: Push Images to DockerHub
```bash
# Push Backend Images
docker push saikiranasamwar4/compressor-backend:latest
docker push saikiranasamwar4/compressor-backend:v1.0.0

# Push Frontend Images
docker push saikiranasamwar4/compressor-frontend:latest
docker push saikiranasamwar4/compressor-frontend:v1.0.0

# Verify images
docker images | grep compressor
```

### Step 4: Create AWS ECR Repositories (Alternative to DockerHub)
```bash
# Create ECR repositories
aws ecr create-repository --repository-name saikiranasamwar4/backend --region us-east-1
aws ecr create-repository --repository-name saikiranasamwar4/frontend --region us-east-1

# Get ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 514439471441.dkr.ecr.us-east-1.amazonaws.com

# Tag and push to ECR
docker tag saikiranasamwar4/compressor-backend:latest \
  514439471441.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/backend:latest

docker tag saikiranasamwar4/compressor-frontend:latest \
  514439471441.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/frontend:latest

docker push 514439471441.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/backend:latest
docker push 514439471441.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/frontend:latest
```

### Step 5: Test Docker Compose Locally
```bash
# Create .env file
cat > .env << EOF
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
EOF

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Test endpoints
curl http://localhost:3000/api/health
curl http://localhost:8080

# Stop services
docker-compose down
```

---

## EKS Cluster Deployment

### Step 1: Create EKS Cluster
```bash
# Create EKS cluster using eksctl
eksctl create cluster \
  --name media-compressor-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed \
  --version 1.28

# This takes 15-20 minutes
```

### Alternative: Using Custom Configuration
```bash
# Create cluster config file
cat > eks-cluster-config.yaml << EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: media-compressor-cluster
  region: us-east-1
  version: "1.28"

vpc:
  cidr: 10.0.0.0/16

managedNodeGroups:
  - name: standard-workers
    instanceType: t3.medium
    minSize: 2
    maxSize: 5
    desiredCapacity: 3
    volumeSize: 30
    ssh:
      allow: true
      publicKeyName: compressorr-key
    labels:
      role: worker
    tags:
      nodegroup-role: worker

  - name: spot-workers
    instanceTypes: ["t3.medium", "t3.large"]
    minSize: 0
    maxSize: 3
    desiredCapacity: 2
    volumeSize: 30
    spot: true

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver

cloudWatch:
  clusterLogging:
    enableTypes: ["api", "audit", "authenticator", "controllerManager", "scheduler"]
EOF

# Create cluster
eksctl create cluster -f eks-cluster-config.yaml
```

### Step 2: Configure kubectl
```bash
# Update kubeconfig
aws eks update-kubeconfig --name media-compressor-cluster --region us-east-1

# Verify connection
kubectl get nodes
kubectl cluster-info
```

### Step 3: Create Namespace
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Verify
kubectl get namespaces
```

### Step 4: Create MongoDB Secret
```bash
# Create secret
kubectl apply -f k8s/mongo/mongo-secret.yaml

# Verify
kubectl get secrets -n media-app
```

### Step 5: Deploy MongoDB
```bash
# Deploy StatefulSet and Service
kubectl apply -f k8s/mongo/mongo-statefulset.yaml
kubectl apply -f k8s/mongo/mongo-service.yaml

# Wait for MongoDB to be ready
kubectl wait --for=condition=ready pod -l app=mongo -n media-app --timeout=300s

# Verify
kubectl get statefulset -n media-app
kubectl get pods -n media-app
kubectl get pvc -n media-app
```

### Step 6: Deploy Backend
```bash
# Deploy Backend
kubectl apply -f k8s/backend/backend-deployment.yaml
kubectl apply -f k8s/backend/backend-service.yaml

# Wait for backend pods
kubectl wait --for=condition=ready pod -l app=backend -n media-app --timeout=300s

# Verify
kubectl get deployments -n media-app
kubectl get pods -n media-app
kubectl logs -l app=backend -n media-app
```

### Step 7: Deploy Frontend
```bash
# Deploy Frontend
kubectl apply -f k8s/frontend/frontend-deployment.yaml
kubectl apply -f k8s/frontend/frontend-service.yaml

# Wait for frontend pods
kubectl wait --for=condition=ready pod -l app=frontend -n media-app --timeout=300s

# Verify
kubectl get deployments -n media-app
kubectl get pods -n media-app
kubectl get svc -n media-app
```

### Step 8: Deploy Monitoring (Prometheus & Grafana)
```bash
# Deploy Prometheus
kubectl apply -f k8s/monitoring/prometheus-config.yaml
kubectl apply -f k8s/monitoring/prometheus-deployment.yaml

# Deploy Grafana
kubectl apply -f k8s/monitoring/grafana-deployment.yaml

# Wait for services
kubectl wait --for=condition=ready pod -l app=prometheus -n media-app --timeout=300s
kubectl wait --for=condition=ready pod -l app=grafana -n media-app --timeout=300s

# Get service URLs
kubectl get svc -n media-app
```

### Step 9: Access Applications
```bash
# Get LoadBalancer URLs
FRONTEND_URL=$(kubectl get svc frontend -n media-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
BACKEND_URL=$(kubectl get svc backend -n media-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
PROMETHEUS_URL=$(kubectl get svc prometheus -n media-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
GRAFANA_URL=$(kubectl get svc grafana -n media-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Frontend: http://$FRONTEND_URL"
echo "Backend: http://$BACKEND_URL:3000"
echo "Prometheus: http://$PROMETHEUS_URL:9090"
echo "Grafana: http://$GRAFANA_URL:3000"
```

### Step 10: Setup Autoscaling
```bash
# Install Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Create HPA for backend
kubectl autoscale deployment backend \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n media-app

# Create HPA for frontend
kubectl autoscale deployment frontend \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n media-app

# Verify HPA
kubectl get hpa -n media-app
```

---

## Ansible Automation

### Step 1: Install Ansible Collections
```bash
# Install required collections
ansible-galaxy collection install community.docker
ansible-galaxy collection install community.general
ansible-galaxy collection install amazon.aws
```

### Step 2: Test Ansible Connectivity
```bash
# Test connection to all hosts
ansible all -i ansible/inventory/hosts.ini -m ping

# Expected output: SUCCESS for all hosts
```

### Step 3: Run Docker Installation Playbook
```bash
# Install Docker on all EC2 instances
ansible-playbook -i ansible/inventory/hosts.ini \
  ansible/playbooks/install-docker.yml

# Verify Docker installation
ansible all -i ansible/inventory/hosts.ini \
  -m command -a "docker --version"
```

### Step 4: Setup Jenkins
```bash
# Setup Jenkins server
ansible-playbook -i ansible/inventory/hosts.ini \
  ansible/playbooks/setup-jenkins.yml

# Get Jenkins initial password
ansible jenkins -i ansible/inventory/hosts.ini \
  -m command -a "cat /var/lib/jenkins/secrets/initialAdminPassword" \
  --become

# Access Jenkins: http://<JENKINS_IP>:8080
```

### Step 5: Setup SonarQube
```bash
# Setup SonarQube server
ansible-playbook -i ansible/inventory/hosts.ini \
  ansible/playbooks/setup-sonarqube.yml

# Wait for SonarQube to start (3-5 minutes)
# Access SonarQube: http://<SONARQUBE_IP>:9000
# Default credentials: admin/admin
```

### Step 6: Setup Monitoring
```bash
# Setup Prometheus and Grafana
ansible-playbook -i ansible/inventory/hosts.ini \
  ansible/playbooks/setup-monitoring.yml

# Access Prometheus: http://<MONITORING_IP>:9090
# Access Grafana: http://<MONITORING_IP>:3000 (admin/admin)
```

### Step 7: Deploy Application (Docker Mode)
```bash
# Deploy application using Docker Compose
ansible-playbook -i ansible/inventory/hosts.ini \
  ansible/playbooks/deploy-app.yml

# Access Application:
# Frontend: http://<APP_IP>:8080
# Backend: http://<APP_IP>:3000
```

### Step 8: Run All Playbooks at Once
```bash
# Run master playbook (all setups in sequence)
ansible-playbook -i ansible/inventory/hosts.ini \
  ansible/playbooks/master-playbook.yml
```

---

## Jenkins CI/CD Pipeline

### Step 1: Initial Jenkins Configuration

1. Access Jenkins at `http://<JENKINS_IP>:8080`
2. Use initial admin password to unlock
3. Install suggested plugins
4. Create admin user
5. Configure Jenkins URL

### Step 2: Install Required Plugins

Navigate to **Manage Jenkins** → **Plugins** → **Available Plugins**

Install:
- Docker Pipeline
- Amazon ECR
- Kubernetes CLI
- SonarQube Scanner
- Pipeline
- Git
- AWS Steps

### Step 3: Configure Credentials

#### DockerHub Credentials
1. Go to **Manage Jenkins** → **Credentials** → **System** → **Global credentials**
2. Add **Username with password**
   - ID: `dockerhub-credentials`
   - Username: `saikiranasamwar4`
   - Password: `<your-dockerhub-password>`

#### AWS Credentials
1. Add **AWS Credentials**
   - ID: `aws-credentials`
   - Access Key ID: `<your-aws-access-key>`
   - Secret Access Key: `<your-aws-secret-key>`

#### GitHub Credentials
1. Add **Username with password** or **GitHub token**
   - ID: `github-credentials`
   - Token: `<your-github-token>`

#### SonarQube Token
1. Generate token in SonarQube (User → My Account → Security → Generate Token)
2. Add **Secret text**
   - ID: `sonarqube-token`
   - Secret: `<your-sonarqube-token>`

### Step 4: Configure SonarQube Integration

1. Go to **Manage Jenkins** → **Configure System**
2. Find **SonarQube servers** section
3. Add SonarQube server:
   - Name: `SonarQube`
   - Server URL: `http://<SONARQUBE_IP>:9000`
   - Server authentication token: Select `sonarqube-token`

### Step 5: Configure AWS CLI in Jenkins
```bash
# SSH into Jenkins server
ssh -i ~/.ssh/compressorr-key.pem ubuntu@<JENKINS_IP>

# Configure AWS CLI as jenkins user
sudo su - jenkins
aws configure
# Enter AWS credentials

# Configure kubectl
aws eks update-kubeconfig --name media-compressor-cluster --region us-east-1

# Verify
kubectl get nodes
exit
```

### Step 6: Create Jenkins Pipeline Job

1. Click **New Item**
2. Enter name: `Compressorr-Pipeline`
3. Select **Pipeline**
4. Click **OK**

#### Pipeline Configuration

**General:**
- Description: `CI/CD Pipeline for Compressorr Application`
- ✅ GitHub project: `https://github.com/yourusername/compressorr`

**Build Triggers:**
- ✅ GitHub hook trigger for GITScm polling
- ✅ Poll SCM: `H/5 * * * *` (every 5 minutes)

**Pipeline:**
- Definition: `Pipeline script from SCM`
- SCM: `Git`
- Repository URL: `https://github.com/yourusername/compressorr`
- Credentials: Select `github-credentials`
- Branch: `*/main`
- Script Path: `Jenkinsfile`

### Step 7: Update Jenkinsfile

The Jenkinsfile is already created. Review and update if needed:
- Verify AWS account ID
- Verify ECR repository names
- Verify EKS cluster name

### Step 8: Configure GitHub Webhook

1. Go to your GitHub repository
2. Navigate to **Settings** → **Webhooks** → **Add webhook**
3. Payload URL: `http://<JENKINS_IP>:8080/github-webhook/`
4. Content type: `application/json`
5. Events: **Just the push event**
6. ✅ Active
7. Click **Add webhook**

### Step 9: Run Pipeline

1. Go to Jenkins dashboard
2. Click on `Compressorr-Pipeline`
3. Click **Build Now**
4. Monitor console output
5. Verify each stage completes successfully

### Step 10: Verify Deployment
```bash
# Check deployment status
kubectl rollout status deployment/backend -n media-app
kubectl rollout status deployment/frontend -n media-app

# Get pod details
kubectl get pods -n media-app

# Check logs
kubectl logs -l app=backend -n media-app --tail=100
kubectl logs -l app=frontend -n media-app --tail=100
```

---

## SonarQube Integration

### Step 1: Configure SonarQube

1. Access SonarQube at `http://<SONARQUBE_IP>:9000`
2. Login with default credentials: `admin/admin`
3. Change password when prompted

### Step 2: Create Project

1. Click **Create Project** → **Manually**
2. Project key: `compressorr`
3. Display name: `Compressorr Media Converter`
4. Click **Set Up**

### Step 3: Generate Token

1. Choose **With Jenkins**
2. Generate token
3. Copy and save the token
4. Add token to Jenkins credentials as described earlier

### Step 4: Configure Quality Gate

1. Go to **Quality Gates**
2. Create new quality gate or use default
3. Set conditions:
   - Coverage: > 70%
   - Duplicated Lines: < 3%
   - Maintainability Rating: ≤ A
   - Reliability Rating: ≤ A
   - Security Rating: ≤ A

### Step 5: Configure Project Settings

Update `sonar-project.properties` (already created):
```properties
sonar.projectKey=compressorr
sonar.projectName=Compressorr Media Converter
sonar.projectVersion=1.0
sonar.sources=backend/src,frontend
sonar.exclusions=**/node_modules/**,**/uploads/**
```

### Step 6: Install SonarScanner in Jenkins

```bash
# SSH to Jenkins server
ssh -i ~/.ssh/compressorr-key.pem ubuntu@<JENKINS_IP>

# Download SonarScanner
sudo wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip
sudo unzip sonar-scanner-cli-5.0.1.3006-linux.zip -d /opt
sudo ln -s /opt/sonar-scanner-5.0.1.3006-linux/bin/sonar-scanner /usr/local/bin/sonar-scanner

# Verify
sonar-scanner --version
```

### Step 7: Configure SonarScanner in Jenkins

1. Go to **Manage Jenkins** → **Global Tool Configuration**
2. Find **SonarQube Scanner**
3. Click **Add SonarQube Scanner**
   - Name: `SonarScanner`
   - ✅ Install automatically
   - Version: Select latest

### Step 8: Run Analysis

The Jenkins pipeline will automatically run SonarQube analysis. To run manually:

```bash
# From project root
sonar-scanner \
  -Dsonar.projectKey=compressorr \
  -Dsonar.sources=backend/src,frontend \
  -Dsonar.host.url=http://<SONARQUBE_IP>:9000 \
  -Dsonar.login=<your-token>
```

### Step 9: View Results

1. Go to SonarQube dashboard
2. Click on `compressorr` project
3. Review:
   - Bugs
   - Vulnerabilities
   - Code Smells
   - Coverage
   - Duplications

---

## Prometheus & Grafana Monitoring

### Step 1: Configure Prometheus

#### On EC2 (Using Ansible setup)
Prometheus is already configured via Ansible. Access at `http://<MONITORING_IP>:9090`

#### On EKS
Already deployed via K8s manifests. Get URL:
```bash
kubectl get svc prometheus -n media-app
```

### Step 2: Verify Prometheus Targets

1. Open Prometheus UI
2. Go to **Status** → **Targets**
3. Verify all targets are **UP**:
   - prometheus
   - node-exporter
   - compressorr-backend
   - kubernetes-pods (for EKS)

### Step 3: Configure Grafana

#### Access Grafana
- EC2: `http://<MONITORING_IP>:3000`
- EKS: Get URL with `kubectl get svc grafana -n media-app`

#### Initial Login
- Username: `admin`
- Password: `admin`
- Change password when prompted

### Step 4: Add Prometheus Data Source

1. Click **Configuration** (gear icon) → **Data Sources**
2. Click **Add data source**
3. Select **Prometheus**
4. Configure:
   - Name: `Prometheus`
   - URL: 
     - For EC2 setup: `http://localhost:9090`
     - For EKS setup: `http://prometheus.media-app.svc.cluster.local:9090`
   - Access: `Server (default)`
5. Click **Save & Test**

### Step 5: Import Dashboard

1. Click **+** → **Import**
2. Upload `monitoring/grafana-dashboards/compressorr-dashboard.json`
3. Select Prometheus data source
4. Click **Import**

### Step 6: Create Custom Dashboards

#### Application Metrics Dashboard
1. Create new dashboard
2. Add panels for:
   - Request rate: `rate(http_requests_total[5m])`
   - Response time: `histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))`
   - Error rate: `rate(http_requests_total{status=~"5.."}[5m])`
   - Active connections: `active_users_total`
   - File conversions: `rate(file_conversions_total[5m])`

#### System Metrics Dashboard
1. Create new dashboard
2. Add panels for:
   - CPU usage: `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`
   - Memory usage: `node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100`
   - Disk usage: `node_filesystem_avail_bytes / node_filesystem_size_bytes * 100`
   - Network I/O: `rate(node_network_receive_bytes_total[5m])`

#### MongoDB Metrics Dashboard
1. Install MongoDB exporter (optional):
```bash
docker run -d \
  --name mongodb-exporter \
  --network compressorr-network \
  -p 9216:9216 \
  percona/mongodb_exporter:0.40 \
  --mongodb.uri=mongodb://mongodb:27017
```

2. Add panels:
   - Connections: `mongodb_connections{state="current"}`
   - Operations: `rate(mongodb_op_counters_total[5m])`
   - Memory usage: `mongodb_memory{type="resident"}`

### Step 7: Configure Alerting

#### Create Alert Rules in Prometheus

Edit Prometheus config (on EC2):
```bash
sudo nano /etc/prometheus/alert.rules.yml
```

Add rules:
```yaml
groups:
  - name: compressorr_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }}ms"

      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.instance }} has been down for more than 2 minutes"

      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}%"
```

Reload Prometheus:
```bash
sudo systemctl reload prometheus
```

#### Configure Grafana Alerts

1. In dashboard panels, click **Edit** → **Alert**
2. Create alert rule with conditions
3. Configure notification channels:
   - **Alerting** → **Notification channels**
   - Add email, Slack, or webhook notifications

### Step 8: Verify Monitoring

1. Generate traffic to application
2. Check Prometheus for metrics
3. View dashboards in Grafana
4. Trigger test alerts
5. Verify notifications

---

## Complete Deployment Workflow

### Scenario 1: Fresh Deployment (EC2 + Docker)

```bash
# 1. Setup infrastructure
ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/install-docker.yml
ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/setup-jenkins.yml
ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/setup-sonarqube.yml
ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/setup-monitoring.yml

# 2. Build and push Docker images
docker-compose build
docker-compose push

# 3. Deploy application
ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/deploy-app.yml

# 4. Verify deployment
curl http://<APP_IP>:8080
curl http://<APP_IP>:3000/api/health
```

### Scenario 2: Fresh Deployment (EKS)

```bash
# 1. Create EKS cluster
eksctl create cluster -f eks-cluster-config.yaml

# 2. Configure kubectl
aws eks update-kubeconfig --name media-compressor-cluster --region us-east-1

# 3. Create namespace and secrets
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongo/mongo-secret.yaml

# 4. Deploy MongoDB
kubectl apply -f k8s/mongo/
kubectl wait --for=condition=ready pod -l app=mongo -n media-app --timeout=300s

# 5. Deploy backend
kubectl apply -f k8s/backend/
kubectl wait --for=condition=ready pod -l app=backend -n media-app --timeout=300s

# 6. Deploy frontend
kubectl apply -f k8s/frontend/
kubectl wait --for=condition=ready pod -l app=frontend -n media-app --timeout=300s

# 7. Deploy monitoring
kubectl apply -f k8s/monitoring/

# 8. Get URLs
kubectl get svc -n media-app
```

### Scenario 3: CI/CD Pipeline Deployment

```bash
# 1. Setup Jenkins and SonarQube (one-time)
ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/setup-jenkins.yml
ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/setup-sonarqube.yml

# 2. Configure Jenkins pipeline (UI)
# - Add credentials
# - Create pipeline job
# - Configure GitHub webhook

# 3. Push code to trigger pipeline
git add .
git commit -m "Deploy to production"
git push origin main

# 4. Monitor Jenkins build
# Pipeline will automatically:
# - Checkout code
# - Run tests
# - SonarQube analysis
# - Build Docker images
# - Push to ECR
# - Deploy to EKS
# - Verify deployment
```

### Scenario 4: Blue-Green Deployment (EKS)

```bash
# 1. Deploy new version (green)
kubectl apply -f k8s/backend/backend-deployment-green.yaml
kubectl apply -f k8s/frontend/frontend-deployment-green.yaml

# 2. Wait for green deployment
kubectl wait --for=condition=ready pod -l app=backend,version=green -n media-app --timeout=300s

# 3. Test green deployment
kubectl port-forward svc/backend-green 3001:3000 -n media-app
curl http://localhost:3001/api/health

# 4. Switch traffic to green
kubectl patch svc backend -n media-app -p '{"spec":{"selector":{"app":"backend","version":"green"}}}'
kubectl patch svc frontend -n media-app -p '{"spec":{"selector":{"app":"frontend","version":"green"}}}'

# 5. Verify traffic switch
# Monitor logs and metrics

# 6. Delete blue deployment (after verification)
kubectl delete deployment backend-blue -n media-app
kubectl delete deployment frontend-blue -n media-app
```

### Scenario 5: Rollback Procedure

```bash
# EKS Rollback
kubectl rollout undo deployment/backend -n media-app
kubectl rollout undo deployment/frontend -n media-app

# Verify rollback
kubectl rollout status deployment/backend -n media-app
kubectl rollout status deployment/frontend -n media-app

# Docker Compose Rollback
docker-compose down
docker-compose pull  # Pull previous version
docker-compose up -d
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: EKS Cluster Creation Fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check IAM permissions
aws iam get-user

# View eksctl logs
eksctl utils describe-stacks --region us-east-1 --cluster media-compressor-cluster

# Delete and retry
eksctl delete cluster --name media-compressor-cluster --region us-east-1
```

#### Issue 2: Pods Stuck in Pending
```bash
# Check pod status
kubectl describe pod <pod-name> -n media-app

# Check node resources
kubectl top nodes

# Check PVC status
kubectl get pvc -n media-app

# Scale down if resource constrained
kubectl scale deployment backend --replicas=1 -n media-app
```

#### Issue 3: ImagePullBackOff
```bash
# Check image name
kubectl describe pod <pod-name> -n media-app

# Verify ECR credentials
aws ecr get-login-password --region us-east-1

# Update image pull secret (for ECR)
kubectl create secret docker-registry ecr-secret \
  --docker-server=514439471441.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region us-east-1) \
  -n media-app

# Update deployment to use secret
kubectl patch deployment backend -n media-app \
  -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ecr-secret"}]}}}}'
```

#### Issue 4: MongoDB Connection Issues
```bash
# Check MongoDB pod
kubectl get pods -l app=mongo -n media-app
kubectl logs -l app=mongo -n media-app

# Test connection from backend
kubectl exec -it deployment/backend -n media-app -- sh
nc -zv mongo.media-app.svc.cluster.local 27017

# Verify secret
kubectl get secret mongo-secret -n media-app -o yaml
```

#### Issue 5: LoadBalancer Stuck in Pending
```bash
# Check AWS Load Balancer Controller
kubectl get pods -n kube-system | grep aws-load-balancer-controller

# Install if missing
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"

# Use NodePort as alternative
kubectl patch svc frontend -n media-app -p '{"spec":{"type":"NodePort"}}'
kubectl get svc frontend -n media-app
```

#### Issue 6: Jenkins Pipeline Fails
```bash
# Check Jenkins logs
ssh -i ~/.ssh/compressorr-key.pem ubuntu@<JENKINS_IP>
sudo tail -f /var/log/jenkins/jenkins.log

# Check AWS CLI configuration
sudo su - jenkins
aws sts get-caller-identity
kubectl get nodes

# Verify permissions
aws eks describe-cluster --name media-compressor-cluster --region us-east-1
```

#### Issue 7: SonarQube Not Starting
```bash
# Check system requirements
ssh -i ~/.ssh/compressorr-key.pem ubuntu@<SONARQUBE_IP>

# Check kernel parameters
sysctl vm.max_map_count
sysctl fs.file-max

# Check logs
sudo tail -f /opt/sonarqube/logs/sonar.log
sudo tail -f /opt/sonarqube/logs/web.log

# Restart service
sudo systemctl restart sonarqube
sudo systemctl status sonarqube
```

#### Issue 8: Prometheus Not Scraping
```bash
# Check Prometheus configuration
curl http://<PROMETHEUS_IP>:9090/api/v1/targets

# Check network connectivity
telnet <BACKEND_IP> 3000

# Verify metrics endpoint
curl http://<BACKEND_IP>:3000/metrics

# Reload Prometheus
curl -X POST http://<PROMETHEUS_IP>:9090/-/reload
```

#### Issue 9: High Memory Usage
```bash
# Check resource usage
kubectl top pods -n media-app
kubectl top nodes

# Set resource limits
kubectl set resources deployment backend \
  --limits=cpu=500m,memory=512Mi \
  --requests=cpu=250m,memory=256Mi \
  -n media-app

# Enable vertical pod autoscaling
kubectl autoscale deployment backend \
  --cpu-percent=50 \
  --min=2 \
  --max=10 \
  -n media-app
```

#### Issue 10: SSL/TLS Certificate Issues
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create Let's Encrypt issuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Monitoring and Debugging Commands

```bash
# View all resources
kubectl get all -n media-app

# Check events
kubectl get events -n media-app --sort-by='.lastTimestamp'

# View logs
kubectl logs -f deployment/backend -n media-app
kubectl logs -f deployment/frontend -n media-app
kubectl logs -f statefulset/mongo -n media-app

# Execute commands in pod
kubectl exec -it deployment/backend -n media-app -- sh

# Port forward for local testing
kubectl port-forward svc/backend 3000:3000 -n media-app
kubectl port-forward svc/frontend 8080:80 -n media-app

# Check resource quotas
kubectl describe resourcequotas -n media-app

# View metrics
kubectl top pods -n media-app
kubectl top nodes

# Restart deployment
kubectl rollout restart deployment/backend -n media-app
kubectl rollout restart deployment/frontend -n media-app
```

---

## Best Practices & Security

### Security Checklist

- [ ] Use secrets for sensitive data (never hardcode)
- [ ] Enable RBAC in Kubernetes
- [ ] Use security groups with minimal required ports
- [ ] Enable encryption at rest for EBS volumes
- [ ] Use IAM roles instead of access keys where possible
- [ ] Enable MFA for AWS account
- [ ] Regularly update Docker images
- [ ] Scan images for vulnerabilities (Trivy, Snyk)
- [ ] Use private subnets for databases
- [ ] Enable AWS CloudTrail for auditing
- [ ] Implement network policies in Kubernetes
- [ ] Use TLS/SSL for all external endpoints
- [ ] Regularly rotate credentials

### Performance Optimization

- [ ] Use CDN for static assets
- [ ] Enable caching (Redis/Memcached)
- [ ] Optimize Docker image sizes (multi-stage builds)
- [ ] Use connection pooling for database
- [ ] Implement rate limiting
- [ ] Use horizontal pod autoscaling
- [ ] Optimize database indexes
- [ ] Enable compression (gzip)
- [ ] Use persistent volumes for stateful workloads
- [ ] Monitor and optimize resource usage

### Cost Optimization

- [ ] Use Spot instances for non-critical workloads
- [ ] Enable cluster autoscaling
- [ ] Right-size EC2 instances
- [ ] Delete unused EBS volumes
- [ ] Use S3 lifecycle policies
- [ ] Enable cost allocation tags
- [ ] Monitor costs with AWS Cost Explorer
- [ ] Use Reserved Instances for predictable workloads
- [ ] Clean up unused Docker images
- [ ] Optimize log retention periods

---

## Maintenance & Updates

### Regular Maintenance Tasks

#### Weekly
- Review monitoring dashboards
- Check application logs
- Review SonarQube reports
- Update documentation

#### Monthly
- Update Docker images
- Review and rotate secrets
- Check for security updates
- Review cost reports
- Update Kubernetes version (if available)

#### Quarterly
- Disaster recovery drill
- Performance review
- Security audit
- Capacity planning

### Backup Strategy

#### Database Backup
```bash
# MongoDB backup (EKS)
kubectl exec -it statefulset/mongo -n media-app -- mongodump --out=/backup

# Copy backup locally
kubectl cp media-app/mongo-0:/backup ./mongodb-backup-$(date +%Y%m%d)

# Upload to S3
aws s3 cp ./mongodb-backup-$(date +%Y%m%d) s3://your-backup-bucket/ --recursive
```

#### Configuration Backup
```bash
# Backup all Kubernetes manifests
kubectl get all -n media-app -o yaml > backup-manifests.yaml

# Backup secrets (encrypted)
kubectl get secrets -n media-app -o yaml > backup-secrets.yaml

# Store in version control or S3
git add .
git commit -m "Backup $(date +%Y%m%d)"
git push
```

---

## Additional Resources

### Documentation Links
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [SonarQube Documentation](https://docs.sonarqube.org/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Ansible Documentation](https://docs.ansible.com/)

### Support Contacts
- DevOps Team: devops@yourcompany.com
- Emergency Contact: oncall@yourcompany.com
- Slack Channel: #compressorr-support

---

## Appendix

### Environment Variables Reference

#### Backend (.env)
```env
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb://mongodb:27017/filetool
JWT_SECRET=<generate-random-secret>
SESSION_SECRET=<generate-random-secret>
GOOGLE_CLIENT_ID=<optional>
GOOGLE_CLIENT_SECRET=<optional>
GOOGLE_CALLBACK_URL=http://yourapp.com/auth/google/callback
```

#### Frontend
```env
REACT_APP_API_URL=http://yourbackend.com:3000
REACT_APP_ENVIRONMENT=production
```

### Port Reference
| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Frontend | 80 | HTTP | Web UI (Nginx) |
| Frontend | 8080 | HTTP | Docker Compose |
| Backend | 3000 | HTTP | API Server |
| MongoDB | 27017 | TCP | Database |
| Jenkins | 8080 | HTTP | CI/CD Server |
| SonarQube | 9000 | HTTP | Code Quality |
| Prometheus | 9090 | HTTP | Metrics |
| Grafana | 3000 | HTTP | Dashboards |
| Node Exporter | 9100 | HTTP | System Metrics |

### Useful Scripts

#### Cleanup Script
```bash
#!/bin/bash
# cleanup.sh - Clean up old resources

# Clean Docker
docker system prune -af --volumes

# Clean Kubernetes
kubectl delete pods --field-selector=status.phase=Failed -n media-app
kubectl delete pods --field-selector=status.phase=Succeeded -n media-app

# Clean old images from ECR
aws ecr list-images --repository-name saikiranasamwar4/backend --query 'imageIds[?type(imageTag)!=`string`].[imageDigest]' --output text | \
while read digest; do
    aws ecr batch-delete-image --repository-name saikiranasamwar4/backend --image-ids imageDigest=$digest
done
```

#### Health Check Script
```bash
#!/bin/bash
# health-check.sh - Check all services

echo "Checking Frontend..."
curl -sf http://$FRONTEND_URL || echo "Frontend DOWN"

echo "Checking Backend..."
curl -sf http://$BACKEND_URL:3000/api/health || echo "Backend DOWN"

echo "Checking MongoDB..."
kubectl exec -it statefulset/mongo -n media-app -- mongosh --eval "db.adminCommand('ping')" || echo "MongoDB DOWN"

echo "Checking Prometheus..."
curl -sf http://$PROMETHEUS_URL:9090/-/healthy || echo "Prometheus DOWN"

echo "Checking Grafana..."
curl -sf http://$GRAFANA_URL:3000/api/health || echo "Grafana DOWN"
```

---

## Conclusion

This deployment guide covers the complete production deployment of the Compressorr application using:
- ✅ EC2 instances for infrastructure
- ✅ Docker and DockerHub for containerization
- ✅ EKS for Kubernetes orchestration
- ✅ Ansible for automation
- ✅ Jenkins for CI/CD
- ✅ SonarQube for code quality
- ✅ Prometheus and Grafana for monitoring

Follow the steps in order, verify each component, and maintain regular backups and monitoring.

**Last Updated:** December 2025
**Version:** 1.0.0
**Maintained By:** DevOps Team
