# 🚀 Compressorr – Production Deployment Guide (Amazon Linux + AWS DevOps)

**Version:** 1.1.0
**Last Updated:** December 2025
**OS Standard:** Amazon Linux 2 / Amazon Linux 2023
**Maintained By:** DevOps Team


## 📌 Architecture Overview

The Compressorr platform follows a modern cloud-native DevOps architecture:

* **CI/CD** → Jenkins
* **Code Quality** → SonarQube
* **Containers** → Docker + DockerHub
* **Orchestration** → Amazon EKS
* **Automation** → Ansible
* **Monitoring** → Prometheus & Grafana
* **Database** → MongoDB (StatefulSet)

### High-Level Flow

```
GitHub → Jenkins → SonarQube → DockerHub → Amazon EKS
                                       ↓
                               Prometheus → Grafana
```

---

## 1️⃣ Prerequisites

### AWS Account Requirements

* IAM User with:

  * `AdministratorAccess` (learning / demo)
  * Least-privilege IAM roles (production)
* Access to:

  * EC2
  * EKS
  * IAM
  * VPC
* DockerHub account

---

## 2️⃣ Base OS & Tooling (Amazon Linux)

> Run on **all EC2 instances**

```bash
sudo yum update -y
sudo yum install -y git unzip curl wget tar
```

---

## 3️⃣ Install AWS CLI v2

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

Configure AWS credentials:

```bash
aws configure
```



## 4️⃣ Install Docker (Amazon Linux)

```bash
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user
newgrp docker
docker --version
```


## 5️⃣ Install kubectl

```bash
curl -LO https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
kubectl version --client
```


## 6️⃣ Install eksctl

```bash
curl -sLO https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_Linux_amd64.tar.gz
tar -xzf eksctl_Linux_amd64.tar.gz
sudo mv eksctl /usr/local/bin/
eksctl version
```



## 7️⃣ Install Ansible (Amazon Linux)

```bash
sudo yum install -y amazon-linux-extras
sudo amazon-linux-extras enable ansible2
sudo yum install -y ansible
ansible --version

## 8️⃣ EC2 Infrastructure (Amazon Linux AMI)

This section defines the **core EC2 infrastructure** required to support the Compressorr DevOps toolchain.
Each instance is **purpose-built**, sized appropriately, and secured using **least-privilege networking**.



### 🔹 Operating System Standard

✅ **Amazon Linux 2 AMI (Recommended)**

* Officially maintained by AWS
* Optimized for EC2 performance
* Native compatibility with AWS CLI, EKS, Docker, and monitoring tools
* Long-term security updates

> ⚠️ AMI IDs are **region-specific** and may change over time.

**Example (us-east-1):**

```
ami-0e731c8a588258d0d
```

👉 Always verify the latest Amazon Linux AMI in your AWS region.



### 🔹 EC2 Instance Roles & Sizing

Each EC2 instance has a **single responsibility**, following DevOps best practices.

| Service                           | Instance Type | Purpose                  | Reasoning                                    |
| --------------------------------- | ------------- | ------------------------ | -------------------------------------------- |
| **Jenkins Server**                | `t3.medium`   | CI/CD orchestration      | Handles builds, pipelines, Docker operations |
| **SonarQube Server**              | `t3.medium`   | Code quality analysis    | Requires stable memory & CPU                 |
| **Monitoring Server**             | `t3.medium`   | Prometheus + Grafana     | Collects & visualizes metrics                |
| **Application Server (Optional)** | `t3.large`    | Docker-based app runtime | Extra CPU & memory for containers            |

🔹 **Why not combine services?**
Separating services:

* Improves fault isolation
* Avoids resource contention
* Mirrors real-world production architecture



### 🔹 Storage Configuration

Recommended **EBS volumes**:

| Instance    | Volume Type | Size     |
| ----------- | ----------- | -------- |
| Jenkins     | gp3         | 30 GB    |
| SonarQube   | gp3         | 30–40 GB |
| Monitoring  | gp3         | 30 GB    |
| Application | gp3         | 50 GB    |

✔ gp3 offers better performance at lower cost
✔ Enough space for logs, plugins, and artifacts



### 🔹 Security Group Design (Network Access Control)

Each service uses a **dedicated security group** with **only required ports open**.

#### 🔐 Jenkins Security Group

| Port | Protocol | Purpose            |
| ---- | -------- | ------------------ |
| 22   | TCP      | SSH administration |
| 8080 | TCP      | Jenkins Web UI     |



#### 🔐 SonarQube Security Group

| Port | Protocol | Purpose            |
| ---- | -------- | ------------------ |
| 22   | TCP      | SSH administration |
| 9000 | TCP      | SonarQube Web UI   |


#### 🔐 Monitoring Security Group

| Port | Protocol | Purpose            |
| ---- | -------- | ------------------ |
| 22   | TCP      | SSH administration |
| 9090 | TCP      | Prometheus UI      |
| 3000 | TCP      | Grafana UI         |



#### 🔐 Application Security Group

| Port | Protocol | Purpose                 |
| ---- | -------- | ----------------------- |
| 22   | TCP      | SSH administration      |
| 80   | TCP      | HTTP (Frontend)         |
| 3000 | TCP      | Backend API             |
| 8080 | TCP      | Docker / Nginx / App UI |



### 🔹 Security Best Practices (Strongly Recommended)

* 🔒 Restrict SSH (`22`) to **your IP only**
* 🔒 Do NOT expose internal services publicly
* 🔒 Use separate security groups per service
* 🔒 Enable **IAM Roles** instead of static AWS keys
* 🔒 Enable **EBS encryption at rest**
* 🔒 Disable password-based SSH login



### 🔹 Instance Tagging Strategy

Use consistent tags for management and cost tracking:

```text
Name        = Jenkins-Server / SonarQube-Server / Monitoring-Server
Environment = Production
Project     = Compressorr
Owner       = DevOps
```

✔ Helps with billing
✔ Improves observability
✔ Simplifies automation


### 🔹 High Availability & Scaling Notes

* Jenkins & SonarQube are **stateful** → single instance recommended
* Monitoring can be:

  * Standalone (learning)
  * Kubernetes-native (production)
* Application workloads should run on **EKS**, not EC2 (recommended)


## 9️⃣ Jenkins Setup (Amazon Linux)

### Install Java 17 (Mandatory)

```bash
sudo yum install -y java-17-amazon-corretto
java -version
```

### Install Jenkins

```bash
sudo wget -O /etc/yum.repos.d/jenkins.repo \
https://pkg.jenkins.io/redhat-stable/jenkins.repo

sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
sudo yum install -y jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins
```

Get initial admin password:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Access Jenkins:

```
http://<JENKINS_IP>:8080
```

---

## 🔟 Jenkins Configuration & Tool Integration

### Required Jenkins Plugins

Install from **Manage Jenkins → Plugins**:

* Git
* Pipeline
* Docker Pipeline
* SonarQube Scanner
* Kubernetes CLI
* AWS Credentials
* GitHub Integration

---

### Jenkins Credentials Setup

#### DockerHub

* Type: Username & Password
* ID: `dockerhub-credentials`

#### AWS

* Type: AWS Credentials
* ID: `aws-credentials`

#### SonarQube

* Type: Secret Text
* ID: `sonarqube-token`

---

### Jenkins ↔ SonarQube Integration

1. **Manage Jenkins → Configure System**
2. Add SonarQube Server:

   * Name: `SonarQube`
   * URL: `http://<SONAR_IP>:9000`
   * Token: `sonarqube-token`

✔ Pipeline **fails automatically** if Quality Gate fails

---

### Jenkins ↔ DockerHub Integration

Fix Docker permissions:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

Pipeline builds and pushes versioned images:

```groovy
docker.build("saikiranasamwar4/compressor-backend:${BUILD_NUMBER}")
docker.push()
```

---

### Jenkins ↔ Amazon EKS Integration

Configure kubectl for Jenkins user:

```bash
sudo su - jenkins
aws configure
aws eks update-kubeconfig \
--name media-compressor-cluster \
--region us-east-1
kubectl get nodes
```

✔ Jenkins deploys directly to EKS
✔ No manual SSH to nodes

---

## 🔟 SonarQube Setup (Amazon Linux)

### Kernel Tuning (Mandatory)

```bash
sudo sysctl -w vm.max_map_count=262144
sudo sysctl -w fs.file-max=65536
```

Persist:

```bash
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
echo "fs.file-max=65536" | sudo tee -a /etc/sysctl.conf
```

### Install SonarQube

```bash
sudo yum install -y unzip
sudo useradd sonar
sudo mkdir /opt/sonarqube
sudo chown sonar:sonar /opt/sonarqube

sudo su - sonar
wget https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-10.4.1.88267.zip
unzip sonarqube-*.zip -d /opt/sonarqube
exit
```

Start SonarQube:

```bash
/opt/sonarqube/sonarqube-*/bin/linux-x86-64/sonar.sh start
```

Access:

```
http://<SONAR_IP>:9000
```

---

## 1️⃣1️⃣ DockerHub Build & Push

```bash
docker build -t saikiranasamwar4/compressor-backend:latest -f Dockerfiles/backend.Dockerfile .
docker build -t saikiranasamwar4/compressor-frontend:latest -f Dockerfiles/frontend.Dockerfile .

docker login
docker push saikiranasamwar4/compressor-backend:latest
docker push saikiranasamwar4/compressor-frontend:latest
```

---

## 1️⃣2️⃣ Amazon EKS Cluster

```bash
eksctl create cluster \
--name media-compressor-cluster \
--region us-east-1 \
--nodegroup-name workers \
--node-type t3.medium \
--nodes 3 \
--managed
```

Update kubeconfig:

```bash
aws eks update-kubeconfig \
--name media-compressor-cluster \
--region us-east-1
```

---

## 1️⃣3️⃣ Kubernetes Deployment

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongo/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/monitoring/
```

Includes:

* MongoDB StatefulSet
* Backend & Frontend Deployments
* HPA
* Prometheus & Grafana

---

## 1️⃣4️⃣ Monitoring (Prometheus & Grafana)

### Monitoring Architecture

```
Application Pods → /metrics → Prometheus → Grafana → Alerts
```

### Access

* **Prometheus:** `http://<MONITORING_IP>:9090`
* **Grafana:** `http://<MONITORING_IP>:3000`

  * Username: `admin`
  * Password: `admin`

### What is Monitored

* CPU & Memory
* Pod health
* HTTP error rate
* Response latency
* Deployment failures

---

## 1️⃣5️⃣ Jenkins + Monitoring Integration

After deployment, Jenkins:

* Verifies rollout status
* Performs health checks
* Relies on Prometheus alerts to detect failures

✔ Prevents bad releases
✔ Enables fast rollback

---

## 1️⃣6️⃣ Fixed Issues Summary

| Issue              | Fix Applied         |
| ------------------ | ------------------- |
| Ubuntu usage       | Amazon Linux only   |
| Jenkins Java       | Java 17 added       |
| SonarQube crash    | Kernel tuning added |
| eksctl URL         | Corrected           |
| Docker permissions | Fixed               |
| Monitoring gaps    | Fully integrated    |
| IAM confusion      | Clarified roles     |

---

## 👨‍💻 Author

Om namoh bhagwate vasudevay namah 🕉

Here is a **clean, professional, and README-ready Author section**, rewritten using the details you provided.
You can **directly paste this at the end of your README.md**.

---

## 👨‍💻 Author

**Saikiran Rajesh Asamwar**
**AWS Certified Solutions Architect – Associate (AWS SAA)**
**AWS DevOps Engineer**

B.Tech in **Electronics & Telecommunication Engineering**
**K.D.K. College of Engineering, Nagpur**

### Core Expertise

* Amazon Web Services (AWS)
* CI/CD Pipelines (Jenkins)
* Docker & Kubernetes (EKS)
* Infrastructure Automation (Ansible)
* Monitoring & Observability (Prometheus, Grafana)
* Cloud-native Application Deployment

**GitHub:** [https://github.com/saikiranasamwar4](https://github.com/saikiranasamwar4)
**LinkedIn:** [https://www.linkedin.com/in/saikiran-asamwar](https://www.linkedin.com/in/saikiran-asamwar)

---
