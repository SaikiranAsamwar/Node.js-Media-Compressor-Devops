---

# 📦 **Media Compressor Platform — Complete Production Deployment Guide**

### 🚀 *AWS EKS · Terraform IaC · Jenkins CI/CD · Ansible Automation · Prometheus/Grafana Monitoring*

This repository contains a **cloud-native media compression and conversion platform**, built using **enterprise DevOps practices**, **Kubernetes architecture**, and **end-to-end automation**.
It performs:

* Image compression
* PDF compression
* Image → Image conversions
* File manipulation tasks

This guide walks you from **zero to full production deployment** on AWS.

---

# 🖼 **High-Level Architecture Overview**

### **Components**

* **EKS Cluster (EC2 Nodes)** — Runs frontend & backend workloads
* **Amazon DocumentDB** — Stores metadata and processing info
* **Amazon ECR** — Stores Docker images securely
* **Terraform** — Provisions all cloud resources
* **Jenkins** — Automates CI/CD
* **Ansible** — Deploys services and monitoring stack
* **Prometheus + Grafana** — Provides full observability
* **Custom VPC** — Private subnets for secure workloads

---

# 🔄 **Complete DevOps Workflow (CI/CD + Deployment)**

### **Workflow**

1. Developer pushes code → GitHub
2. Jenkins Pipeline triggers
3. Builds backend and frontend Docker images
4. Pushes images to **Amazon ECR**
5. Jenkins invokes **Ansible**
6. Ansible deploys workload to **EKS**
7. Monitoring stack stays active (Prometheus & Grafana)
8. Application becomes available via LoadBalancer

---

# 📁 **Repository Structure**

```
Media-Compressor/
│
├── backend/                    # Node.js API: compression + conversions
├── frontend/                   # React or static UI served via Nginx
│
├── terraform/                  # Infrastructure as Code (AWS)
│   ├── main.tf
│   ├── vpc.tf
│   ├── eks.tf
│   ├── docdb.tf
│   ├── ecr.tf
│   ├── variables.tf
│   ├── outputs.tf
│
├── k8s/                        # Kubernetes manifests (prod-ready)
│   ├── deployments/
│   ├── services/
│   ├── secrets/
│   ├── ingress/
│
├── ansible/                    # Ansible playbooks for EKS + monitoring
│   ├── monitoring-playbook.yml
│   ├── site.yml
│   └── inventory
│
├── jenkins/                    # CI/CD Pipeline (Jenkinsfile)
│   └── Jenkinsfile
│
└── README.md                   # 📘 Complete documentation
```

---

# 🔧 **Prerequisites (With Detailed Explanations)**

### 🛠 Tools Required

| Tool           | Why It’s Needed                     |
| -------------- | ----------------------------------- |
| **Git**        | Clone the source code               |
| **Docker**     | Build images for backend & frontend |
| **kubectl**    | Manage Kubernetes cluster           |
| **Terraform**  | Provision AWS infrastructure        |
| **Ansible**    | Automate deployments & monitoring   |
| **AWS CLI v2** | Configure and authenticate with AWS |
| **Jenkins**    | Automated CI/CD pipeline            |

---

# 🌍 **AWS Setup**

Configure credentials:

```bash
aws configure
aws sts get-caller-identity
```

If this command fails, **Terraform, kubectl, and Jenkins will not work**.

---

# 🏗️ **Terraform Deployment (Infrastructure Setup)**

Terraform creates the entire AWS environment:

* Custom VPC
* Public & Private subnets
* EKS Cluster
* Node Groups (EC2-based)
* DocumentDB Cluster
* Amazon ECR Repositories
* IAM Roles & Policies
* Security Groups

---

## Step 1 — Initialize

```bash
cd terraform
terraform init
```

## Step 2 — Validate

```bash
terraform validate
terraform fmt -recursive
```

## Step 3 — Plan & Deploy

```bash
terraform plan \
  -var="cluster_name=${CLUSTER_NAME}" \
  -var="region=${AWS_REGION}" \
  -var="account_id=${AWS_ACCOUNT_ID}"

terraform apply -auto-approve
```

---

# 📡 **Configure kubectl**

```bash
aws eks update-kubeconfig \
  --region ${AWS_REGION} \
  --name ${CLUSTER_NAME}

kubectl get nodes
kubectl get pods -A
```

---

# 🛳 **Build and Push Docker Images**

## Backend

```bash
docker build -t ${IMAGE_PREFIX}/media-compressor-backend:v1 ./backend
```

## Frontend

```bash
docker build -t ${IMAGE_PREFIX}/media-compressor-frontend:v1 ./frontend
```

---

## Push to ECR

Authenticate:

```bash
aws ecr get-login-password --region ${AWS_REGION} \
 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
```

Tag & push:

```bash
docker push ...backend:v1
docker push ...frontend:v1
```

---

# 🔐 **Create Kubernetes Secrets (DocumentDB Credentials)**

```bash
kubectl create secret generic docdb-credentials \
  --from-literal=username=admin \
  --from-literal=password=YourSecurePassword123 \
  --from-literal=endpoint=${DOCDB_ENDPOINT} \
  -n media-compressor
```

---

# 🚀 **CI/CD Pipeline (Jenkins)**

### Jenkins Pipeline Executes:

1. Git clone
2. Install dependencies
3. Build Docker images
4. Push images to ECR
5. Run Ansible Playbook
6. Deploy to EKS
7. Run health checks

---

# 📊 **Monitoring Stack (Prometheus + Grafana)**

Deploy monitoring:

```bash
ansible-playbook -i inventory monitoring-playbook.yml \
  --extra-vars "grafana_admin_password=admin123"
```

Access Grafana:

```bash
kubectl port-forward svc/grafana-service -n monitoring 3000:3000
```

---

# 🧪 **Verification**

Check pods:

```bash
kubectl get pods -n media-compressor
```

Check services:

```bash
kubectl get svc -n media-compressor
```

Check load balancer:

```bash
kubectl get svc frontend-service -n media-compressor
```

---

# 🛠️ **Troubleshooting (Detailed)**

### ❌ Pod CrashLoopBackOff

**Cause:** Missing environment variable / DB connection failed
**Fix:**

```bash
kubectl describe pod <pod>
kubectl logs <pod>
```

---

### ❌ LoadBalancer Not Showing

**Cause:** Subnets missing required Kubernetes tags
**Fix:**
Tag subnets:

* `kubernetes.io/role/elb = 1`
* `kubernetes.io/role/internal-elb = 1`

---

### ❌ kubectl cannot connect

**Fix:**

```bash
aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}
```

---

# 🔧 **Maintenance Guide**

### Scale deployments

```bash
kubectl scale deployment backend-deployment --replicas=5
```

### Update version

```bash
kubectl set image deployment/backend backend=<new image> -n media-compressor
```

### Backup DocumentDB

```bash
aws docdb create-db-cluster-snapshot ...
```

---

# ⚡ **Quick Deployment Summary**

```bash
cd terraform && terraform apply -auto-approve
docker build ... && docker push ...
ansible-playbook site.yml
kubectl get all -n media-compressor
```

---

# ✍️ **Author**

**👨‍💻 Saikiran Rajesh Asamwar**
*AWS DevOps Engineer | Cloud Automation | Kubernetes | CI/CD | Terraform | Docker*

📧 **Email:** [saikiranasamwar@gmail.com](mailto:saikiranasamwar@gmail.com)
🌐 **GitHub:** [https://github.com/SaikiranAsamwar](https://github.com/SaikiranAsamwar)
🐳 **Docker Hub:** [https://hub.docker.com/u/saikiranasamwar4](https://hub.docker.com/u/saikiranasamwar4)
🔗 **LinkedIn:** [https://www.linkedin.com/in/saikiran-asamwar](https://www.linkedin.com/in/saikiran-asamwar)

---

