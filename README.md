# Media Compressor - Complete Deployment & Operations Guide

A comprehensive guide to deploy the Media Compressor application from scratch to production using AWS EKS, with Jenkins CI/CD, Ansible automation, and Prometheus/Grafana monitoring.

**Project Repository:** Media Compressor Application
**Deployment Architecture:** AWS EKS + DocumentDB + ECR
**CI/CD Platform:** Jenkins + Ansible
**Monitoring Stack:** Prometheus + Grafana
**Infrastructure as Code:** Terraform

---

## 📋 Quick Navigation

- **Quick Start:** Jump to [Quick Start Summary](#-quick-start-summary)
- **First Time Setup:** Follow [Prerequisites](#-prerequisites) → [Infrastructure Setup](#-infrastructure-setup)
- **Deploy Application:** See [Deployment Execution](#-deployment-execution)
- **Troubleshoot Issues:** Check [Troubleshooting](#-troubleshooting)
- **Maintenance:** See [Maintenance](#-maintenance)

---

## 🔧 Prerequisites

### Required Tools & Versions

```bash
# Check versions after installation
git --version                  # Git 2.x or higher
docker --version              # Docker 20.x or higher
kubectl version --client      # kubectl 1.28+
terraform -version            # Terraform 1.0+
ansible --version             # Ansible 2.10+
aws --version                 # AWS CLI v2
```

### Installation Instructions

#### macOS/Linux
```bash
# AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Terraform
wget https://releases.hashicorp.com/terraform/1.5.0/terraform_1.5.0_linux_amd64.zip
unzip terraform_1.5.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Ansible
pip3 install ansible
ansible-galaxy collection install kubernetes.core community.general
```

#### Windows
```powershell
# Using Chocolatey
choco install git docker-desktop kubectl terraform ansible awscli

# Or download manually from official sites:
# - Git: https://git-scm.com/download/win
# - Docker Desktop: https://www.docker.com/products/docker-desktop
# - kubectl: https://kubernetes.io/docs/tasks/tools/install-kubectl-on-windows/
# - Terraform: https://www.terraform.io/downloads
# - AWS CLI: https://aws.amazon.com/cli/
# - Ansible: pip install ansible
```

### AWS Configuration

```bash
# Configure AWS CLI with your credentials
aws configure
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region name: us-west-2
# Default output format: json

# Verify configuration
aws sts get-caller-identity
aws ec2 describe-regions --output table
```

### Environment Variables Setup

```bash
# Linux/macOS
export AWS_REGION=us-west-2
export AWS_ACCOUNT_ID=514439471441
export CLUSTER_NAME=media-compressor-cluster
export IMAGE_PREFIX=saikiranasamwar4
export PROJECT_NAME=media-compressor

# Windows (PowerShell)
$env:AWS_REGION = "us-west-2"
$env:AWS_ACCOUNT_ID = "514439471441"
$env:CLUSTER_NAME = "media-compressor-cluster"
$env:IMAGE_PREFIX = "saikiranasamwar4"
$env:PROJECT_NAME = "media-compressor"
```

---

## 🏗️ Infrastructure Setup

### Step 1: Clone Repository
```bash
git clone <your-repository-url>
cd Compressorr
```

### Step 2: Initialize Terraform

```bash
cd terraform

# Initialize Terraform working directory
terraform init

# Validate configuration
terraform validate

# Plan deployment
terraform plan -var="cluster_name=${CLUSTER_NAME}" \
                -var="region=${AWS_REGION}" \
                -var="account_id=${AWS_ACCOUNT_ID}"
```

### Step 3: Deploy AWS Infrastructure

```bash
# Apply Terraform configuration to create:
# - Custom VPC with public/private subnets
# - EKS cluster with managed node groups
# - DocumentDB cluster
# - ECR repositories
# - Security groups
# - IAM roles and policies

terraform apply -var="cluster_name=${CLUSTER_NAME}" \
                 -var="region=${AWS_REGION}" \
                 -var="account_id=${AWS_ACCOUNT_ID}" \
                 -auto-approve
```

### Step 4: Configure kubectl

```bash
# Update kubeconfig for cluster access
aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}

# Verify cluster access
kubectl cluster-info
kubectl get nodes
kubectl get namespaces
```

---

## 🔨 Application Setup

### Step 1: Build Docker Images

```bash
# Navigate to project root
cd ..

# Build backend image (Node.js application)
docker build -t ${IMAGE_PREFIX}/media-compressor-backend:v1 ./backend

# Build frontend image (Nginx + Static files)
docker build -t ${IMAGE_PREFIX}/media-compressor-frontend:v1 ./frontend

# Verify images were created
docker images | grep ${IMAGE_PREFIX}
```

### Step 2: Push Images to ECR

```bash
# Login to Amazon ECR
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Tag images for ECR
docker tag ${IMAGE_PREFIX}/media-compressor-backend:v1 \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-backend:v1

docker tag ${IMAGE_PREFIX}/media-compressor-frontend:v1 \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-frontend:v1

# Push images to ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-backend:v1
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-frontend:v1

# Verify images in ECR
aws ecr describe-repositories --region ${AWS_REGION}
```

### Step 3: Create Kubernetes Secrets

```bash
# Get DocumentDB endpoint from Terraform
DOCDB_ENDPOINT=$(cd terraform && terraform output -raw documentdb_endpoint && cd ..)

# Create application namespace
kubectl create namespace media-compressor

# Create DocumentDB credentials secret
kubectl create secret generic docdb-credentials \
    --from-literal=username=admin \
    --from-literal=password=YourSecurePassword123! \
    --from-literal=endpoint=${DOCDB_ENDPOINT} \
    --namespace=media-compressor

# Verify secret was created
kubectl get secrets -n media-compressor
```

---

## 🚀 CI/CD Pipeline Setup

### Step 1: Install Jenkins

```bash
# On EC2 instance or local machine
sudo yum update -y
sudo yum install -y java-11-amazon-corretto

# Add Jenkins repository
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key

# Install Jenkins
sudo yum install -y jenkins

# Start Jenkins service
sudo systemctl enable jenkins
sudo systemctl start jenkins
sudo systemctl status jenkins

# Get initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

### Step 2: Configure Jenkins

1. Access Jenkins at `http://your-server:8080`
2. Enter the initial admin password from above
3. Install suggested plugins
4. Install additional plugins:
   - Docker Pipeline
   - Kubernetes Plugin
   - Ansible Plugin
   - AWS Steps
   - Blue Ocean
   - Git Plugin

### Step 3: Add Jenkins Credentials

Navigate to **Jenkins → Manage Jenkins → Credentials → Global**

**Add AWS Credentials:**
- Kind: AWS Credentials
- ID: `aws-credentials`
- Access Key ID: [Your AWS Access Key]
- Secret Access Key: [Your AWS Secret Key]

**Add Kubeconfig:**
- Kind: Secret file
- ID: `kubeconfig-media-compressor`
- File: Upload `~/.kube/config`

**Add DockerHub Credentials (Optional):**
- Kind: Username with password
- ID: `dockerhub-credentials`
- Username: [Your DockerHub username]
- Password: [Your DockerHub password]

**Add SonarQube Token:**
- Kind: Secret text
- ID: `sonarqube-token`
- Secret: [Your SonarQube token]

### Step 4: Create Jenkins Pipeline Job

1. **New Item** → Name: `media-compressor-deployment`
2. **Type:** Pipeline
3. **Pipeline section:**
   - Definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: [Your repository URL]
   - Script Path: `jenkins/Jenkinsfile`
   - Branch: `*/main`

4. **Build Triggers:**
   - GitHub push trigger (if using GitHub)
   - Poll SCM: `H/5 * * * *` (every 5 minutes)

5. **Save** and trigger manually to test

---

## 📊 Monitoring Setup

### Step 1: Deploy Monitoring Stack with Ansible

```bash
cd ansible

# Update inventory with your cluster details
# Edit: ansible/inventory

# Deploy complete monitoring stack (Prometheus + Grafana)
ansible-playbook -i inventory monitoring-playbook.yml \
    --extra-vars "monitoring_namespace=monitoring" \
    --extra-vars "prometheus_retention=30d" \
    --extra-vars "grafana_admin_password=admin123"
```

### Step 2: Access Monitoring Services

```bash
# Get Grafana service URL
kubectl get svc grafana-service -n monitoring

# If using ClusterIP, port forward
kubectl port-forward svc/grafana-service -n monitoring 3000:3000

# Access Grafana at http://localhost:3000
# Username: admin
# Password: admin123
```

### Step 3: Configure Grafana

1. Login to Grafana with admin/admin123
2. Data Sources → Add Prometheus
   - URL: `http://prometheus-service:9090`
   - Save
3. Dashboards → Import
   - Import provided dashboards or create custom ones
4. Alerts → Configure alert rules

---

## 🎯 Deployment Execution

### Method 1: Using Jenkins Pipeline (Recommended for Production)

```bash
# Access Jenkins at http://your-server:8080
# Navigate to: media-compressor-deployment
# Click: Build Now
# Jenkins pipeline will automatically:
# 1. Build and test code
# 2. Create Docker images
# 3. Scan for vulnerabilities
# 4. Push to ECR
# 5. Deploy via Ansible
# 6. Setup monitoring
# 7. Run health checks
```

### Method 2: Manual Ansible Deployment

```bash
cd ansible

# Deploy application and monitoring
ansible-playbook -i inventory site.yml \
    --extra-vars "image_tag=v1" \
    --extra-vars "backend_image=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-backend" \
    --extra-vars "frontend_image=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-frontend"
```

### Method 3: Manual Kubernetes Deployment

```bash
cd k8s

# Make deployment script executable
chmod +x deploy-to-eks.sh

# Run deployment
./deploy-to-eks.sh
```

---

## ✅ Verification & Testing

### Verify Infrastructure

```bash
# Check EKS cluster
kubectl get nodes -o wide
kubectl cluster-info
kubectl top nodes

# Check Terraform outputs
cd terraform && terraform output
cd ..
```

### Verify Application Deployment

```bash
# Check pods
kubectl get pods -n media-compressor
kubectl get pods -n monitoring

# Check services
kubectl get svc -n media-compressor
kubectl get svc -n monitoring

# Check deployments
kubectl get deployments -n media-compressor

# Check logs
kubectl logs -f deployment/backend-deployment -n media-compressor
kubectl logs -f deployment/frontend-deployment -n media-compressor
```

### Health Checks

```bash
# Get service URLs
FRONTEND_URL=$(kubectl get svc frontend-service -n media-compressor -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
BACKEND_URL=$(kubectl get svc backend-service -n media-compressor -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test endpoints
curl -f http://${FRONTEND_URL}/
curl -f http://${BACKEND_URL}/health
curl -f http://${BACKEND_URL}/api/health
```

### Load Testing

```bash
# Install Apache Bench
sudo yum install -y httpd-tools

# Run load test
ab -n 100 -c 10 http://${FRONTEND_URL}/

# Monitor during load test
kubectl top pods -n media-compressor
```

---

## 🛠️ Troubleshooting

### Issue: Docker Build Failure

**Symptoms:** `docker build` returns exit code 1

**Solutions:**
```bash
# 1. Check Docker daemon
docker ps
# If failed, start Docker Desktop

# 2. Clean Docker system
docker system prune -f
docker volume prune -f

# 3. Build with verbose output
docker build -t test:latest ./backend --no-cache -v

# 4. Check Dockerfile exists
cat backend/Dockerfile

# 5. Delete node_modules cache
rm -rf backend/node_modules
docker build -t test:latest ./backend
```

### Issue: Terraform Apply Fails

**Symptoms:** `terraform apply` shows errors

**Solutions:**
```bash
# 1. Check AWS credentials
aws sts get-caller-identity

# 2. Validate configuration
terraform validate

# 3. Refresh state
terraform refresh

# 4. Check specific resource
terraform state show aws_eks_cluster.media_compressor

# 5. Plan before apply
terraform plan

# 6. Full debug output
TF_LOG=DEBUG terraform apply
```

### Issue: kubectl Cannot Connect

**Symptoms:** `kubectl get nodes` fails

**Solutions:**
```bash
# 1. Update kubeconfig
aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}

# 2. Check cluster exists
aws eks describe-cluster --name ${CLUSTER_NAME} --region ${AWS_REGION}

# 3. Verify IAM permissions
aws iam get-user

# 4. Check kubeconfig file
cat ~/.kube/config

# 5. Test direct connection
kubectl cluster-info --context arn:aws:eks:${AWS_REGION}:${AWS_ACCOUNT_ID}:cluster/${CLUSTER_NAME}
```

### Issue: Pods Not Starting

**Symptoms:** Pods stuck in Pending/CrashLoopBackOff

**Solutions:**
```bash
# 1. Check pod events
kubectl describe pod <pod-name> -n media-compressor

# 2. Check pod logs
kubectl logs <pod-name> -n media-compressor

# 3. Check resource availability
kubectl top pods -n media-compressor
kubectl top nodes

# 4. Check secrets exist
kubectl get secrets -n media-compressor

# 5. Delete and recreate pod
kubectl delete pod <pod-name> -n media-compressor
```

### Issue: Services Not Accessible

**Symptoms:** LoadBalancer URL not working

**Solutions:**
```bash
# 1. Check service status
kubectl get svc -n media-compressor
kubectl describe svc backend-service -n media-compressor

# 2. Check security groups
aws ec2 describe-security-groups --region ${AWS_REGION}

# 3. Check service endpoints
kubectl get endpoints -n media-compressor

# 4. Port forward for testing
kubectl port-forward svc/backend-service 3000:3000 -n media-compressor

# 5. Check network policies
kubectl get networkpolicies -n media-compressor
```

---

## 🔧 Maintenance

### Regular Tasks

#### Update Application
```bash
# Build new version
docker build -t ${IMAGE_PREFIX}/media-compressor-backend:v2 ./backend

# Push to ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-backend:v2

# Update deployment
kubectl set image deployment/backend-deployment \
    backend=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-backend:v2 \
    -n media-compressor

# Monitor rollout
kubectl rollout status deployment/backend-deployment -n media-compressor
```

#### Scale Application
```bash
# Scale backend
kubectl scale deployment backend-deployment --replicas=5 -n media-compressor

# Scale frontend
kubectl scale deployment frontend-deployment --replicas=3 -n media-compressor

# Check scaling
kubectl get hpa -n media-compressor
```

#### Monitor Resources
```bash
# Check node resources
kubectl top nodes
kubectl describe nodes

# Check pod resources
kubectl top pods -n media-compressor
kubectl top pods -n monitoring

# Check cluster events
kubectl get events -A --sort-by='.lastTimestamp'
```

#### Backup Strategy
```bash
# Export Kubernetes configs
kubectl get all -n media-compressor -o yaml > backup-k8s-$(date +%Y%m%d).yaml

# Backup DocumentDB
aws docdb create-db-cluster-snapshot \
    --db-cluster-identifier media-compressor-docdb-cluster \
    --db-cluster-snapshot-identifier backup-$(date +%Y%m%d)

# Check backups
aws docdb describe-db-cluster-snapshots
```

#### Security Updates
```bash
# Update EKS cluster version
aws eks update-cluster-version \
    --name ${CLUSTER_NAME} \
    --kubernetes-version 1.28

# Update node groups
aws eks update-nodegroup-version \
    --cluster-name ${CLUSTER_NAME} \
    --nodegroup-name media-compressor-nodes

# Scan images for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy image ${IMAGE_PREFIX}/media-compressor-backend:latest
```

---

## 📖 Useful Resources & Commands

### Kubectl Cheat Sheet
```bash
# Get all resources
kubectl get all -A
kubectl get all -n media-compressor

# Describe resources
kubectl describe deployment backend-deployment -n media-compressor
kubectl describe pod <pod-name> -n media-compressor

# View logs
kubectl logs -f deployment/backend-deployment -n media-compressor
kubectl logs --tail=100 deployment/backend-deployment -n media-compressor

# Execute commands in pod
kubectl exec -it <pod-name> -n media-compressor -- /bin/bash

# Port forwarding
kubectl port-forward pod/<pod-name> 3000:3000 -n media-compressor
kubectl port-forward svc/backend-service 3000:3000 -n media-compressor

# Delete resources
kubectl delete deployment backend-deployment -n media-compressor
kubectl delete namespace media-compressor

# Troubleshooting
kubectl get events -n media-compressor
kubectl api-resources
kubectl explain deployment
```

### Terraform Commands
```bash
# Initialize workspace
terraform init -upgrade

# Format code
terraform fmt -recursive

# Validate configuration
terraform validate

# Plan changes
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan

# Destroy infrastructure
terraform destroy

# Show state
terraform show
terraform state list
terraform state show aws_eks_cluster.media_compressor

# Debug
TF_LOG=DEBUG terraform plan
```

### Docker Commands
```bash
# Build image
docker build -t image:tag .

# Push to registry
docker push registry/image:tag

# Run container
docker run -d -p 3000:3000 image:tag

# View logs
docker logs container-id

# List images/containers
docker images
docker ps -a

# Clean up
docker system prune -f
docker image prune -a
```

### AWS Commands
```bash
# EKS operations
aws eks list-clusters
aws eks describe-cluster --name ${CLUSTER_NAME}
aws eks update-kubeconfig --name ${CLUSTER_NAME}

# ECR operations
aws ecr describe-repositories
aws ecr describe-images --repository-name ${IMAGE_PREFIX}/media-compressor-backend

# DocumentDB operations
aws docdb describe-db-clusters
aws docdb describe-db-instances

# IAM operations
aws iam list-users
aws iam get-user
aws iam list-access-keys
```

---

## 🎯 Quick Start Summary

For a complete deployment from scratch:

```bash
# 1. Setup environment
export AWS_REGION=us-west-2
export AWS_ACCOUNT_ID=514439471441
export CLUSTER_NAME=media-compressor-cluster
export IMAGE_PREFIX=saikiranasamwar4

# 2. Deploy infrastructure
cd terraform
terraform init
terraform apply -auto-approve
cd ..

# 3. Build and push images
docker build -t ${IMAGE_PREFIX}/media-compressor-backend:v1 ./backend
docker build -t ${IMAGE_PREFIX}/media-compressor-frontend:v1 ./frontend
# Push to ECR (follow ECR push steps above)

# 4. Deploy application
cd ansible
ansible-playbook -i inventory site.yml
cd ..

# 5. Verify deployment
kubectl get all -n media-compressor
kubectl get all -n monitoring
```

---

## 📞 Support & Documentation

- **Main Documentation:** This file (README.md)
- **Troubleshooting Scripts:** `./troubleshoot.sh` (Linux/Mac) or `./troubleshoot.ps1` (Windows)
- **Deployment Automation:** `./deploy.bat` (Windows)
- **Infrastructure Code:** `./terraform/`
- **Kubernetes Manifests:** `./k8s/`
- **Ansible Playbooks:** `./ansible/`
- **CI/CD Pipeline:** `./jenkins/Jenkinsfile`

---

**🎉 Your Media Compressor application is now ready for deployment with full CI/CD, monitoring, and production-ready infrastructure!**

## 🔧 Prerequisites

### Required Tools
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Terraform
wget https://releases.hashicorp.com/terraform/1.5.0/terraform_1.5.0_linux_amd64.zip
unzip terraform_1.5.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Install Ansible
pip3 install ansible
ansible-galaxy collection install kubernetes.core
ansible-galaxy collection install community.general
```

### AWS Prerequisites
```bash
# Configure AWS CLI
aws configure
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region name: us-west-2
# Default output format: json

# Verify AWS configuration
aws sts get-caller-identity
aws ec2 describe-regions --output table
```

### Environment Variables
```bash
export AWS_REGION=us-west-2
export AWS_ACCOUNT_ID=514439471441
export CLUSTER_NAME=media-compressor-cluster
export IMAGE_PREFIX=saikiranasamwar4
export PROJECT_NAME=media-compressor
```

## 🏗️ Infrastructure Setup

### Step 1: Clone the Repository
```bash
git clone <your-repository-url>
cd Compressorr
```

### Step 2: Initialize Terraform
```bash
cd terraform

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Plan the deployment
terraform plan -var="cluster_name=${CLUSTER_NAME}" \
                -var="region=${AWS_REGION}" \
                -var="account_id=${AWS_ACCOUNT_ID}"
```

### Step 3: Deploy Infrastructure
```bash
# Apply Terraform configuration
terraform apply -var="cluster_name=${CLUSTER_NAME}" \
                 -var="region=${AWS_REGION}" \
                 -var="account_id=${AWS_ACCOUNT_ID}" \
                 -auto-approve

# This creates:
# - Custom VPC with public/private subnets
# - EKS cluster with managed node groups
# - DocumentDB cluster
# - ECR repositories
# - Security groups
# - IAM roles and policies
```

### Step 4: Configure kubectl
```bash
# Update kubeconfig
aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

## 🔨 Application Setup

### Step 1: Build Docker Images
```bash
# Navigate to project root
cd ..

# Build backend image
docker build -t ${IMAGE_PREFIX}/media-compressor-backend:v1 ./backend

# Build frontend image
docker build -t ${IMAGE_PREFIX}/media-compressor-frontend:v1 ./frontend

# Verify images
docker images | grep ${IMAGE_PREFIX}
```

### Step 2: Push Images to ECR
```bash
# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Tag images for ECR
docker tag ${IMAGE_PREFIX}/media-compressor-backend:v1 \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-backend:v1

docker tag ${IMAGE_PREFIX}/media-compressor-frontend:v1 \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-frontend:v1

# Push to ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-backend:v1
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-frontend:v1
```

### Step 3: Create Kubernetes Secrets
```bash
# Get DocumentDB endpoint from Terraform output
DOCDB_ENDPOINT=$(terraform output -raw documentdb_endpoint)

# Create namespace
kubectl create namespace media-compressor

# Create DocumentDB secret
kubectl create secret generic docdb-credentials \
    --from-literal=username=admin \
    --from-literal=password=YourSecurePassword123! \
    --from-literal=endpoint=${DOCDB_ENDPOINT} \
    --namespace=media-compressor
```

## 🚀 CI/CD Pipeline Setup

### Step 1: Install Jenkins
```bash
# Install Java
sudo yum update -y
sudo yum install -y java-11-amazon-corretto

# Install Jenkins
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key
sudo yum install -y jenkins

# Start Jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins

# Get initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

### Step 2: Configure Jenkins
```bash
# Access Jenkins at http://your-server:8080
# Install suggested plugins + additional:
# - Docker Pipeline
# - Kubernetes Plugin
# - Ansible Plugin
# - AWS Steps
# - Blue Ocean
```

### Step 3: Add Jenkins Credentials
Navigate to Jenkins → Manage Jenkins → Credentials → Global → Add Credentials:

1. **AWS Credentials**
   - Kind: AWS Credentials
   - ID: aws-credentials
   - Access Key ID: [Your AWS Access Key]
   - Secret Access Key: [Your AWS Secret Key]

2. **Kubeconfig**
   - Kind: Secret file
   - ID: kubeconfig-media-compressor
   - File: Upload your ~/.kube/config

3. **DockerHub Credentials** (if needed)
   - Kind: Username with password
   - ID: dockerhub-credentials
   - Username: [Your DockerHub username]
   - Password: [Your DockerHub password]

### Step 4: Create Jenkins Pipeline
1. New Item → Pipeline
2. Name: media-compressor-deployment
3. Pipeline Definition: Pipeline script from SCM
4. SCM: Git
5. Repository URL: [Your repository URL]
6. Script Path: jenkins/Jenkinsfile

## 📊 Monitoring Setup

### Step 1: Deploy Monitoring Stack via Ansible
```bash
cd ansible

# Update inventory with your values
# Edit inventory file with correct endpoints and passwords

# Deploy monitoring stack
ansible-playbook -i inventory monitoring-playbook.yml \
    --extra-vars "monitoring_namespace=monitoring" \
    --extra-vars "prometheus_retention=30d" \
    --extra-vars "grafana_admin_password=admin123"
```

### Step 2: Access Monitoring Services
```bash
# Get Grafana service URL
kubectl get svc grafana-service -n monitoring

# Port forward if using ClusterIP
kubectl port-forward svc/grafana-service -n monitoring 3000:3000

# Access Grafana at http://localhost:3000
# Username: admin
# Password: admin123
```

## 🎯 Deployment Execution

### Method 1: Using Jenkins Pipeline (Recommended)
```bash
# Trigger pipeline manually or via webhook
# Pipeline will:
# 1. Build and test code
# 2. Create Docker images
# 3. Push to ECR
# 4. Deploy via Ansible
# 5. Setup monitoring
# 6. Run health checks
```

### Method 2: Manual Ansible Deployment
```bash
cd ansible

# Deploy application and monitoring
ansible-playbook -i inventory site.yml \
    --extra-vars "image_tag=v1" \
    --extra-vars "backend_image=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-backend" \
    --extra-vars "frontend_image=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-frontend"
```

### Method 3: Manual Kubernetes Deployment
```bash
cd k8s

# Make deployment script executable
chmod +x deploy-to-eks.sh

# Run deployment script
./deploy-to-eks.sh
```

## ✅ Verification & Testing

### Step 1: Check Infrastructure
```bash
# Verify EKS cluster
kubectl get nodes -o wide

# Check cluster info
kubectl cluster-info

# Verify Terraform resources
terraform output
```

### Step 2: Check Application Deployment
```bash
# Check application pods
kubectl get pods -n media-compressor

# Check services
kubectl get svc -n media-compressor

# Check deployments
kubectl get deployments -n media-compressor

# Check logs
kubectl logs -f deployment/backend-deployment -n media-compressor
kubectl logs -f deployment/frontend-deployment -n media-compressor
```

### Step 3: Check Monitoring
```bash
# Check monitoring pods
kubectl get pods -n monitoring

# Check monitoring services
kubectl get svc -n monitoring

# Access Prometheus (port forward if needed)
kubectl port-forward svc/prometheus-service -n monitoring 9090:9090

# Access Grafana (port forward if needed)
kubectl port-forward svc/grafana-service -n monitoring 3000:3000
```

### Step 4: Application Health Checks
```bash
# Get application URLs
FRONTEND_URL=$(kubectl get svc frontend-service -n media-compressor -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
BACKEND_URL=$(kubectl get svc backend-service -n media-compressor -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test frontend
curl -f http://${FRONTEND_URL}/

# Test backend API
curl -f http://${BACKEND_URL}/health

# Test backend API endpoints
curl -f http://${BACKEND_URL}/api/health
```

### Step 5: Load Testing
```bash
# Install Apache Bench
sudo yum install -y httpd-tools

# Run load test
ab -n 100 -c 10 http://${FRONTEND_URL}/

# Monitor during load test
kubectl top pods -n media-compressor
```

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### 1. Docker Build Failures
```bash
# Check Docker daemon
sudo systemctl status docker
sudo systemctl start docker

# Clear Docker cache
docker system prune -f

# Check Dockerfile syntax
docker build --no-cache -t test ./backend
```

#### 2. Terraform Apply Failures
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check terraform state
terraform state list

# Force refresh
terraform refresh

# Check specific resource
terraform state show aws_eks_cluster.media_compressor
```

#### 3. Kubectl Connection Issues
```bash
# Update kubeconfig
aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}

# Check cluster status
aws eks describe-cluster --name ${CLUSTER_NAME} --region ${AWS_REGION}

# Verify IAM permissions
aws iam get-user
```

#### 4. Pod Startup Issues
```bash
# Check pod events
kubectl describe pod <pod-name> -n media-compressor

# Check logs
kubectl logs <pod-name> -n media-compressor

# Check resource limits
kubectl top pods -n media-compressor

# Check secrets
kubectl get secrets -n media-compressor
```

#### 5. LoadBalancer Not Accessible
```bash
# Check service
kubectl get svc -n media-compressor

# Check security groups
aws ec2 describe-security-groups --group-names eks-cluster-sg-*

# Check subnet routing
aws ec2 describe-route-tables
```

#### 6. Monitoring Issues
```bash
# Check monitoring namespace
kubectl get all -n monitoring

# Restart monitoring pods
kubectl rollout restart deployment/prometheus-server -n monitoring
kubectl rollout restart deployment/grafana -n monitoring

# Check configmaps
kubectl get configmap -n monitoring
```

## 🔧 Maintenance

### Regular Maintenance Tasks

#### 1. Update Application
```bash
# Build new version
docker build -t ${IMAGE_PREFIX}/media-compressor-backend:v2 ./backend

# Push to ECR
docker tag ${IMAGE_PREFIX}/media-compressor-backend:v2 \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-backend:v2
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-backend:v2

# Update deployment
kubectl set image deployment/backend-deployment \
    backend=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_PREFIX}/media-compressor-backend:v2 \
    -n media-compressor
```

#### 2. Scale Application
```bash
# Scale backend
kubectl scale deployment backend-deployment --replicas=5 -n media-compressor

# Scale frontend
kubectl scale deployment frontend-deployment --replicas=3 -n media-compressor

# Check scaling
kubectl get pods -n media-compressor
```

#### 3. Backup and Recovery
```bash
# Backup application data (if using persistent volumes)
kubectl get pv,pvc -n media-compressor

# Backup DocumentDB
aws docdb create-db-cluster-snapshot \
    --db-cluster-identifier media-compressor-docdb-cluster \
    --db-cluster-snapshot-identifier backup-$(date +%Y%m%d)

# Export Kubernetes configs
kubectl get all -n media-compressor -o yaml > backup-k8s-$(date +%Y%m%d).yaml
```

#### 4. Monitor Resources
```bash
# Check cluster resources
kubectl top nodes
kubectl top pods -A

# Check AWS costs
aws ce get-cost-and-usage \
    --time-period Start=2024-11-01,End=2024-11-30 \
    --granularity MONTHLY \
    --metrics BlendedCost
```

#### 5. Security Updates
```bash
# Update EKS cluster version
aws eks update-cluster-version \
    --name ${CLUSTER_NAME} \
    --kubernetes-version 1.28

# Update node group
aws eks update-nodegroup-version \
    --cluster-name ${CLUSTER_NAME} \
    --nodegroup-name media-compressor-nodes

# Scan images for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy image ${IMAGE_PREFIX}/media-compressor-backend:latest
```

## 📖 Additional Resources

### Useful Commands
```bash
# View all resources
kubectl get all -A

# Check cluster events
kubectl get events -A --sort-by='.lastTimestamp'

# Get cluster logs
kubectl logs -f -l app=backend -n media-compressor

# Check resource usage
kubectl describe nodes
```

### Monitoring URLs
- **Grafana**: `http://<grafana-service-lb>/` (admin/admin123)
- **Prometheus**: `http://<prometheus-service-lb>/`
- **Application**: `http://<frontend-service-lb>/`
- **Backend API**: `http://<backend-service-lb>/api`

### Important Files
- **Terraform configs**: `./terraform/`
- **Kubernetes manifests**: `./k8s/`
- **Ansible playbooks**: `./ansible/`
- **Jenkins pipeline**: `./jenkins/Jenkinsfile`
- **Docker files**: `./backend/Dockerfile`, `./frontend/Dockerfile`

---

## 🎯 Quick Start Summary

For a complete deployment from scratch:

```bash
# 1. Setup environment
export AWS_REGION=us-west-2
export AWS_ACCOUNT_ID=514439471441
export CLUSTER_NAME=media-compressor-cluster

# 2. Deploy infrastructure
cd terraform && terraform init && terraform apply -auto-approve

# 3. Build and push images
docker build -t saikiranasamwar4/media-compressor-backend:v1 ./backend
docker build -t saikiranasamwar4/media-compressor-frontend:v1 ./frontend
# Push to ECR (follow ECR steps above)

# 4. Deploy application
cd ansible && ansible-playbook -i inventory site.yml

# 5. Verify deployment
kubectl get all -n media-compressor
kubectl get all -n monitoring
```

🎉 **Your Media Compressor application is now deployed with full CI/CD, monitoring, and production-ready infrastructure!**
