# Media Compressor DevOps - Complete Deployment Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Project Architecture](#project-architecture)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Deployment Guide](#step-by-step-deployment-guide)
5. [Infrastructure Components](#infrastructure-components)
6. [Deployment Process](#deployment-process)
7. [Accessing the Application](#accessing-the-application)
8. [Monitoring & Logs](#monitoring--logs)
9. [Troubleshooting](#troubleshooting)
10. [Cleanup](#cleanup)

---

## 🎯 Overview

This project is a complete DevOps setup for the **Media Compressor Application** with:
- **Backend**: Node.js Express API (MongoDB)
- **Frontend**: React-based UI
- **Infrastructure**: AWS (VPC, EKS, DocumentDB, ECR)
- **CI/CD**: Jenkins Pipeline
- **Monitoring**: Prometheus & Grafana
- **Container Orchestration**: Kubernetes (EKS)

The setup uses **Infrastructure as Code (IaC)** with Terraform to automate all AWS infrastructure provisioning.

---

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Account                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    VPC (10.0.0.0/16)                     │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                          │  │
│  │  ┌─────────────────┐  ┌──────────────────────────────┐  │  │
│  │  │  Public Subnets │  │   Private Subnets (EKS)     │  │  │
│  │  │  (Jenkins, NAT) │  │  ├─ Backend Pods            │  │  │
│  │  │                 │  │  ├─ Frontend Pods           │  │  │
│  │  └─────────────────┘  │  └─ Monitoring Stack        │  │  │
│  │                       └──────────────────────────────┘  │  │
│  │                                                          │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  Database Subnets                                │  │  │
│  │  │  ├─ DocumentDB Cluster (MongoDB-compatible)     │  │  │
│  │  │  └─ Multi-AZ Replication                        │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Additional Services                                     │  │
│  │  ├─ ECR (Elastic Container Registry)                    │  │
│  │  ├─ Jenkins EC2 (Master Node)                           │  │
│  │  ├─ CloudWatch Logs                                     │  │
│  │  └─ Security Groups & IAM Roles                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Prerequisites

### Local Machine Requirements:
- **Terraform** >= 1.0 ([Download](https://www.terraform.io/downloads))
- **AWS CLI** v2 ([Download](https://aws.amazon.com/cli/))
- **Git** ([Download](https://git-scm.com/))
- **AWS Account** with sufficient permissions
- **AWS Access Keys** (Access Key ID & Secret Access Key)

### Minimum AWS Permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "eks:*",
        "ecr:*",
        "iam:*",
        "rds:*",
        "docdb:*",
        "cloudwatch:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### AWS Resources Cost Estimate:
- **EKS Cluster**: ~$0.10/hour
- **DocumentDB**: ~$1.50/hour (multi-node)
- **EC2 Instances**: ~$0.05/hour (t3.medium)
- **Data Transfer**: Variable
- **Estimate**: ~$45-60/month for development environment

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/SaikiranAsamwar/Media-Compressor-Devops.git
cd Media-Compressor-Devops

# Verify folder structure
ls -la
```

**Expected Output:**
```
ansible/
backend/
frontend/
jenkins/
k8s/
terraform/
uploads/
README.md
```

---

### Step 2: Configure AWS Credentials

```bash
# Configure AWS CLI with your credentials
aws configure

# When prompted, enter:
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region: us-west-2
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

**Expected Output:**
```json
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

---

### Step 3: Update Terraform Variables

```bash
# Navigate to terraform directory
cd terraform

# Review current variables
cat terraform.tfvars
```

**Update `terraform.tfvars` with your values:**

```hcl
# AWS Configuration
aws_region     = "us-west-2"              # Change to your preferred region
account_id     = "514439471441"           # Replace with YOUR AWS Account ID

# Project Configuration
project_name   = "media-compressor"
environment    = "production"
cluster_name   = "media-compressor-cluster"

# Kubernetes Configuration
node_instance_type = "t3.medium"          # Instance type for EKS nodes
desired_capacity   = 2                    # Number of worker nodes
max_capacity       = 4                    # Maximum nodes for auto-scaling
min_capacity       = 1                    # Minimum nodes

# Database Configuration
documentdb_instance_class      = "db.t3.medium"
documentdb_master_username     = "admin"
documentdb_master_password     = "YourSecurePassword123!"  # Change this!
```

**Security Note:** Use strong passwords for DocumentDB!

---

### Step 4: Initialize Terraform

```bash
# Initialize Terraform (download providers and modules)
terraform init

# Verify initialization
terraform validate
```

**Expected Output:**
```
Initializing the backend...
Initializing modules...
Initializing provider plugins...

Terraform has been successfully initialized!
```

---

### Step 5: Review Deployment Plan

```bash
# Generate and review the execution plan
terraform plan -out=plan.tfplan

# Review the output for:
# - Resources to be created
# - Dependencies
# - Estimated costs
```

**Key Resources to be Created:**
- 1 VPC with public, private, and database subnets
- 1 EKS Cluster with 2 worker nodes
- 1 DocumentDB Cluster (3-node)
- 2 ECR Repositories (backend & frontend)
- 1 Jenkins EC2 Instance (master node)
- Security Groups, IAM Roles, and other networking components

---

### Step 6: Deploy Infrastructure

```bash
# Apply the Terraform plan to create AWS resources
terraform apply plan.tfplan

# This will take approximately 15-20 minutes
# Wait for completion and note the outputs
```

**Expected Output (at the end):**
```
Apply complete! Resources have been created.

Outputs:

cluster_endpoint = "https://xxxxx.eks.us-west-2.amazonaws.com"
jenkins_public_ip = "1.2.3.4"
jenkins_url = "http://1.2.3.4:8080"
documentdb_cluster_endpoint = "media-compressor-cluster.xxxx.docdb.us-west-2.amazonaws.com:27017"
ecr_backend_repository_url = "514439471441.dkr.ecr.us-west-2.amazonaws.com/backend"
ecr_frontend_repository_url = "514439471441.dkr.ecr.us-west-2.amazonaws.com/frontend"
```

---

### Step 7: Configure kubectl

```bash
# Update kubeconfig to connect to your EKS cluster
aws eks update-kubeconfig --region us-west-2 --name media-compressor-cluster

# Verify kubectl connection
kubectl get nodes

# Verify namespaces
kubectl get namespaces
```

**Expected Output:**
```
NAME                          STATUS   ROLES    AGE
ip-10-0-xx-xxx.ec2.internal  Ready    <none>   5m
ip-10-0-xx-xxx.ec2.internal  Ready    <none>   5m

NAME              STATUS   AGE
media_compressor  Active   2m
monitoring        Active   2m
kube-system       Active   5m
```

---

### Step 8: Access Jenkins Master Node

```bash
# Get the Jenkins instance details
terraform output jenkins_public_ip
terraform output jenkins_ssh_command

# SSH into the master node
ssh -i .ssh/jenkins_key.pem ec2-user@<jenkins_public_ip>

# Inside the master node, verify tools are installed
jenkins --version
docker --version
terraform --version
kubectl version --client
aws --version
ansible --version
```

**On Jenkins Instance - Verify Setup:**
```bash
# Check Jenkins status
sudo systemctl status jenkins

# Get Jenkins initial password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

# Check Docker
sudo docker ps

# Verify kubectl access to EKS
kubectl get nodes
```

---

### Step 9: Configure Jenkins

```bash
# 1. Access Jenkins Web UI
# Open browser: http://<jenkins_public_ip>:8080

# 2. Login with initial password from previous step
# 3. Install recommended plugins (Jenkins will prompt)
# 4. Create admin user account
# 5. Configure Jenkins URL (optional)
```

**Jenkins Configuration Steps:**
1. **Install Plugins:**
   - Docker
   - Docker Pipeline
   - Kubernetes
   - Ansible
   - Git

2. **Add Credentials:**
   - AWS Credentials
   - GitHub/GitLab credentials
   - Docker Registry credentials

3. **Create Pipeline Job:**
   - Create new Pipeline
   - Use `jenkins/Jenkinsfile` from repository

---

### Step 10: Build and Push Container Images

```bash
# SSH into Jenkins master node
ssh -i .ssh/jenkins_key.pem ec2-user@<jenkins_public_ip>

# Clone your repository
git clone https://github.com/SaikiranAsamwar/Media-Compressor-Devops.git
cd Media-Compressor-Devops

# Login to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com

# Build backend image
cd backend
docker build -t media-compressor-backend:latest .
docker tag media-compressor-backend:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/backend:latest
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/backend:latest

# Build frontend image
cd ../frontend
docker build -t media-compressor-frontend:latest .
docker tag media-compressor-frontend:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/frontend:latest
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/frontend:latest

# Verify images in ECR
aws ecr describe-images --repository-name backend --region us-west-2
aws ecr describe-images --repository-name frontend --region us-west-2
```

---

### Step 11: Deploy Applications to Kubernetes

```bash
# From Jenkins master node or your local machine with kubectl configured

# Update image references in Kubernetes manifests
# Edit k8s/backend-deployment.yaml and k8s/frontend-deployment.yaml
# Replace image URLs with your ECR URLs

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml

# Verify deployments
kubectl get deployments -n media_compressor
kubectl get pods -n media_compressor
kubectl get svc -n media_compressor
```

**Expected Output:**
```
NAME      READY   UP-TO-DATE   AVAILABLE   AGE
backend   2/2     2            2           2m
frontend  2/2     2            2           2m

NAME                     READY   STATUS    RESTARTS   AGE
backend-xxxx-yyyy        1/1     Running   0          2m
backend-xxxx-zzzz        1/1     Running   0          2m
frontend-xxxx-aaaa       1/1     Running   0          2m
frontend-xxxx-bbbb       1/1     Running   0          2m
```

---

### Step 12: Configure Monitoring (Prometheus & Grafana)

```bash
# Check monitoring deployments
kubectl get deployments -n monitoring
kubectl get svc -n monitoring

# Access Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
# Open: http://localhost:9090

# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000 &
# Open: http://localhost:3000
# Default credentials: admin / admin
```

---

## 🔧 Infrastructure Components

### 1. VPC & Networking
- **VPC CIDR**: 10.0.0.0/16
- **Public Subnets**: 10.0.0.0/20, 10.0.16.0/20, 10.0.32.0/20
- **Private Subnets**: 10.0.48.0/20, 10.0.64.0/20, 10.0.80.0/20 (EKS)
- **Database Subnets**: 10.0.96.0/20, 10.0.112.0/20, 10.0.128.0/20
- **NAT Gateway**: For private subnet internet access
- **Internet Gateway**: For public subnet internet access

### 2. EKS Cluster
- **Cluster Name**: media-compressor-cluster
- **Kubernetes Version**: Latest stable
- **Node Group**: 2 x t3.medium (configurable)
- **Auto Scaling**: 1-4 nodes
- **Storage**: EFS for persistent volumes

### 3. DocumentDB Database
- **Engine**: MongoDB-compatible
- **Instance Type**: db.t3.medium
- **Cluster**: 3 nodes (1 primary + 2 replicas)
- **Backup**: Automatic daily backups
- **Encryption**: KMS encryption at rest

### 4. ECR (Container Registry)
- **backend**: For Node.js API images
- **frontend**: For React UI images
- **Auto Scanning**: Enabled for security vulnerabilities
- **Lifecycle Policy**: Keep last 5 images

### 5. Jenkins Master Node
- **OS**: Amazon Linux 2
- **Instance Type**: t3.medium
- **Storage**: 50GB root + 100GB data volume
- **Pre-installed Tools**:
  - Jenkins
  - Docker
  - Terraform
  - kubectl
  - AWS CLI
  - Ansible
  - Python3

### 6. Monitoring Stack
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **CloudWatch**: AWS native monitoring

---

## 📊 Deployment Process Flow

```
1. Clone Repository
   ↓
2. Configure AWS Credentials
   ↓
3. Update terraform.tfvars
   ↓
4. terraform init
   ↓
5. terraform plan
   ↓
6. terraform apply (15-20 minutes)
   ↓
7. Configure kubectl
   ↓
8. Access Jenkins Master
   ↓
9. Configure Jenkins
   ↓
10. Build Container Images
    ↓
11. Push to ECR
    ↓
12. Deploy to Kubernetes
    ↓
13. Configure Monitoring
    ↓
✅ Application Live!
```

---

## 🌐 Accessing the Application

### Backend API
```bash
# Get backend service endpoint
kubectl get svc backend -n media_compressor

# Port forward (for local testing)
kubectl port-forward svc/backend 3000:3000 -n media_compressor

# Access API
curl http://localhost:3000/api/health
```

### Frontend Application
```bash
# Get frontend service endpoint
kubectl get svc frontend -n media_compressor

# Port forward (for local testing)
kubectl port-forward svc/frontend 80:80 -n media_compressor

# Access in browser
# http://localhost
```

### Jenkins Dashboard
```
URL: http://<jenkins_public_ip>:8080
Default User: admin
Password: (Set during initial setup)
```

### Monitoring Dashboards
```
Prometheus: http://<jenkins_public_ip>:9090
Grafana: http://<jenkins_public_ip>:3000
```

---

## 📈 Monitoring & Logs

### View Pod Logs
```bash
# Backend logs
kubectl logs deployment/backend -n media_compressor -f

# Frontend logs
kubectl logs deployment/frontend -n media_compressor -f

# Jenkins logs
sudo journalctl -u jenkins -f
```

### View Pod Events
```bash
# Check pod events
kubectl describe pod <pod-name> -n media_compressor

# Check deployment events
kubectl describe deployment backend -n media_compressor
```

### Monitor Resource Usage
```bash
# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pods -n media_compressor

# Watch pod status
kubectl get pods -n media_compressor --watch
```

### CloudWatch Logs
```bash
# View Jenkins logs
aws logs tail /aws/ec2/jenkins --follow

# List all log groups
aws logs describe-log-groups

# View specific log stream
aws logs tail /aws/ec2/jenkins --stream-name <stream-name>
```

---

## 🐛 Troubleshooting

### Issue 1: EKS Cluster Not Accessible
```bash
# Verify cluster status
aws eks describe-cluster --name media-compressor-cluster --region us-west-2

# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name media-compressor-cluster

# Test connection
kubectl cluster-info
```

### Issue 2: Pods Not Running
```bash
# Check pod status
kubectl get pods -n media_compressor

# Describe problematic pod
kubectl describe pod <pod-name> -n media_compressor

# Check logs
kubectl logs <pod-name> -n media_compressor

# Common issues:
# - Image pull errors: Check ECR URL and credentials
# - Resource constraints: Scale down or increase node size
# - Database connection: Verify DocumentDB endpoint and security groups
```

### Issue 3: Database Connection Issues
```bash
# Verify DocumentDB security group allows access
aws ec2 describe-security-groups --filter Name=group-name,Values=*documentdb*

# Test connection from a pod
kubectl exec -it <pod-name> -n media_compressor -- bash
# Inside pod:
nslookup <documentdb-endpoint>
telnet <documentdb-endpoint> 27017
```

### Issue 4: Jenkins Agent Connection Issues
```bash
# Check Jenkins service status
sudo systemctl status jenkins

# View Jenkins logs
sudo tail -f /var/log/jenkins/jenkins.log

# Restart Jenkins
sudo systemctl restart jenkins
```

### Issue 5: Out of Memory or CPU
```bash
# Scale up deployment replicas (temporary)
kubectl scale deployment backend --replicas=3 -n media_compressor

# Increase node capacity
# Edit terraform variables and re-apply
cd terraform
# Change desired_capacity, max_capacity
terraform plan -out=scale.plan
terraform apply scale.plan
```

---

## 🧹 Cleanup

### Destroy All Infrastructure (WARNING: Permanent)
```bash
cd terraform

# Review what will be destroyed
terraform plan -destroy

# Destroy infrastructure
terraform destroy

# Confirm by typing 'yes' when prompted
```

### Partial Cleanup Options

```bash
# Remove only Jenkins instance
terraform destroy -target=aws_instance.jenkins

# Remove only EKS cluster
terraform destroy -target=module.eks

# Remove only DocumentDB
terraform destroy -target=aws_docdb_cluster.main
```

### Manual Cleanup (If Terraform fails)
```bash
# Delete the state file
rm terraform.tfstate terraform.tfstate.backup

# Manually delete resources via AWS Console if needed
# 1. EC2 Instances
# 2. Load Balancers
# 3. EKS Cluster
# 4. DocumentDB Cluster
# 5. VPC and related resources
```

---

## 📝 Important Files & Their Purpose

```
Media-Compressor-Devops/
├── terraform/                          # Infrastructure as Code
│   ├── main.tf                         # Entry point
│   ├── providers.tf                    # Provider configuration
│   ├── variables.tf                    # Variable definitions
│   ├── terraform.tfvars                # Variable values (YOUR CONFIG)
│   ├── vpc.tf                          # VPC and networking
│   ├── eks.tf                          # EKS cluster
│   ├── documentdb.tf                   # Database setup
│   ├── ecr.tf                          # Container registry
│   ├── kubernetes.tf                   # K8s resources
│   ├── monitoring.tf                   # Prometheus & Grafana
│   ├── security-groups.tf              # Security configurations
│   ├── jenkins-instance.tf             # Jenkins master node
│   ├── jenkins-init.sh                 # Jenkins initialization
│   ├── outputs.tf                      # Output values
│   └── data-sources.tf                 # Data sources
│
├── backend/                            # Node.js Express API
│   ├── Dockerfile                      # Backend container image
│   ├── package.json                    # Dependencies
│   └── src/                            # Source code
│
├── frontend/                           # React UI
│   ├── Dockerfile                      # Frontend container image
│   ├── package.json                    # Dependencies
│   └── nginx.conf                      # Nginx configuration
│
├── k8s/                                # Kubernetes manifests
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── namespace.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── storage.yaml
│   └── prometheus/
│
├── jenkins/                            # CI/CD Pipeline
│   └── Jenkinsfile                     # Pipeline definition
│
├── ansible/                            # Infrastructure provisioning
│   ├── playbook.yml
│   ├── deployment-playbook.yml
│   └── inventory
│
└── README.md                           # This file
```

---

## 🔐 Security Best Practices

1. **Credentials Management:**
   - Use AWS IAM roles instead of access keys when possible
   - Rotate credentials regularly
   - Never commit credentials to git
   - Use `.gitignore` to exclude sensitive files

2. **Network Security:**
   - Use VPC security groups to restrict traffic
   - Enable VPC Flow Logs for monitoring
   - Use private subnets for databases and compute
   - Enable encryption in transit (TLS/SSL)

3. **Data Protection:**
   - Enable encryption at rest for DocumentDB
   - Use KMS keys for encryption
   - Enable automated backups
   - Test backup restoration regularly

4. **Access Control:**
   - Use IAM roles with least privilege
   - Enable MFA for AWS console access
   - Use RBAC in Kubernetes
   - Audit all changes with CloudTrail

5. **Secrets Management:**
   - Store passwords in AWS Secrets Manager
   - Use environment variables for sensitive data
   - Rotate secrets regularly
   - Never hardcode secrets

---

## 📞 Common Commands Reference

```bash
# Terraform
terraform init              # Initialize Terraform
terraform validate          # Validate configuration
terraform plan             # Preview changes
terraform apply            # Apply changes
terraform destroy          # Destroy resources
terraform output           # Show outputs

# AWS CLI
aws eks list-clusters                                  # List EKS clusters
aws eks describe-cluster --name <cluster-name>        # Cluster details
aws docdb describe-db-clusters                        # List DocumentDB
aws ecr describe-repositories                         # List ECR repos

# kubectl
kubectl cluster-info                    # Cluster information
kubectl get nodes                       # List nodes
kubectl get pods -A                     # All pods
kubectl get svc -A                      # All services
kubectl apply -f <file>                 # Apply manifest
kubectl delete -f <file>                # Delete resource
kubectl logs <pod> -n <namespace>       # Pod logs
kubectl describe pod <pod> -n <namespace>  # Pod details
```

---

## 📚 Documentation Links
- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Docker Documentation](https://docs.docker.com/)

---

**Last Updated**: December 5, 2025  
**Version**: 1.0.0  
**Repository**: [Media-Compressor-Devops](https://github.com/SaikiranAsamwar/Media-Compressor-Devops)
