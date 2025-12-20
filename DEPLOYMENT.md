Om namoh bhagwate vasudevay namah 🕉

You’re right — your current file has **structural Markdown errors, duplicated sections, missing code-block closures, and mixed narration text inside the README**.
Below is a **fully corrected, clean, professional rewrite** with:

✅ All Markdown syntax fixed
✅ Duplicate/accidental text removed
✅ Proper section ordering
✅ Closed code blocks
✅ Clean author section
✅ Production-ready README format

You can **copy–paste this entire content as your final `README.md`**.

---

# 🚀 Compressorr – Production Deployment Guide (Amazon Linux + AWS DevOps)

**Version:** 1.1.0
**Last Updated:** December 2025
**OS Standard:** Amazon Linux 2 / Amazon Linux 2023
**Maintained By:** DevOps Team

---

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

---

## 4️⃣ Install Docker (Amazon Linux)

```bash
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user
newgrp docker
docker --version
```

---

## 5️⃣ Install kubectl

```bash
curl -LO https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
kubectl version --client
```

---

## 6️⃣ Install eksctl

```bash
curl -sLO https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_Linux_amd64.tar.gz
tar -xzf eksctl_Linux_amd64.tar.gz
sudo mv eksctl /usr/local/bin/
eksctl version
```

---

## 7️⃣ Install Ansible (Amazon Linux)

```bash
sudo yum install -y amazon-linux-extras
sudo amazon-linux-extras enable ansible2
sudo yum install -y ansible
ansible --version
```

---

## 8️⃣ EC2 Infrastructure (Amazon Linux AMI)

This section defines the **core EC2 infrastructure** required to support the Compressorr DevOps toolchain.

### Operating System

✅ **Amazon Linux 2 AMI (Recommended)**

* Official AWS-maintained AMI
* Optimized for EC2
* Native compatibility with Docker, AWS CLI, EKS

> AMI IDs are **region-specific**

**Example (us-east-1):**

```
ami-0e731c8a588258d0d
```

---

### EC2 Instance Roles & Sizing

| Service                | Instance Type | Purpose               |
| ---------------------- | ------------- | --------------------- |
| Jenkins                | t3.medium     | CI/CD orchestration   |
| SonarQube              | t3.medium     | Code quality analysis |
| Monitoring             | t3.medium     | Prometheus & Grafana  |
| Application (Optional) | t3.large      | Docker-based runtime  |

**Why separate instances?**

* Fault isolation
* Better performance
* Production-aligned design

---

### Storage Configuration

| Instance    | Volume Type | Size     |
| ----------- | ----------- | -------- |
| Jenkins     | gp3         | 30 GB    |
| SonarQube   | gp3         | 30–40 GB |
| Monitoring  | gp3         | 30 GB    |
| Application | gp3         | 50 GB    |

---

### Security Group Ports

#### Jenkins

* 22 – SSH
* 8080 – Jenkins UI

#### SonarQube

* 22 – SSH
* 9000 – SonarQube UI

#### Monitoring

* 22 – SSH
* 9090 – Prometheus
* 3000 – Grafana

#### Application

* 22 – SSH
* 80 – Frontend
* 3000 – Backend API
* 8080 – App UI

---

### Security Best Practices

* Restrict SSH to your IP
* Use IAM roles (avoid static keys)
* Enable EBS encryption
* Separate security groups per service

---

## 9️⃣ Jenkins Setup (Amazon Linux)

### Install Java 17

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

Initial password:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Access:

```
http://<JENKINS_IP>:8080
```

---

## 🔟 Jenkins Configuration & Tool Integration

### Required Plugins

* Git
* Pipeline
* Docker Pipeline
* SonarQube Scanner
* Kubernetes CLI
* AWS Credentials
* GitHub Integration

### Credentials

* **DockerHub:** `dockerhub-credentials`
* **AWS:** `aws-credentials`
* **SonarQube:** `sonarqube-token`

### Jenkins ↔ SonarQube

* Configure server in **Manage Jenkins → Configure System**
* Pipeline fails automatically if Quality Gate fails

### Jenkins ↔ DockerHub

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

### Jenkins ↔ EKS

```bash
sudo su - jenkins
aws configure
aws eks update-kubeconfig --name media-compressor-cluster --region us-east-1
kubectl get nodes
```

---

## 1️⃣1️⃣ SonarQube Setup (Amazon Linux)

### Kernel Tuning

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

Start:

```bash
/opt/sonarqube/sonarqube-*/bin/linux-x86-64/sonar.sh start
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

```bash
aws eks update-kubeconfig --name media-compressor-cluster --region us-east-1
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

---

## 1️⃣4️⃣ Monitoring (Prometheus & Grafana)

### Architecture

```
Pods → /metrics → Prometheus → Grafana → Alerts
```

### Access

* Prometheus: `http://<MONITORING_IP>:9090`
* Grafana: `http://<MONITORING_IP>:3000` (`admin/admin`)

### Metrics

* CPU & memory
* Pod health
* Error rates
* Latency

---

## 1️⃣5️⃣ Jenkins + Monitoring Integration

* Jenkins validates rollout
* Prometheus detects anomalies
* Grafana alerts on failures

✔ Prevents bad deployments
✔ Enables fast rollback

---

## 1️⃣6️⃣ Fixed Issues Summary

| Issue              | Fix               |
| ------------------ | ----------------- |
| Ubuntu usage       | Amazon Linux only |
| Java missing       | Java 17 added     |
| SonarQube crash    | Kernel tuning     |
| eksctl URL         | Corrected         |
| Docker permissions | Fixed             |
| Monitoring gaps    | Integrated        |

---

## 👨‍💻 Author

**Saikiran Rajesh Asamwar**
**AWS Certified Solutions Architect – Associate (AWS SAA)**
**AWS DevOps Engineer**

B.Tech – **Electronics & Telecommunication Engineering**
**K.D.K. College of Engineering, Nagpur**

### Core Expertise

* AWS
* Jenkins CI/CD
* Docker & Kubernetes (EKS)
* Ansible Automation
* Prometheus & Grafana
* Cloud-native Deployments

**GitHub:** [https://github.com/saikiranasamwar4](https://github.com/saikiranasamwar4)
**LinkedIn:** [https://www.linkedin.com/in/saikiran-asamwar](https://www.linkedin.com/in/saikiran-asamwar)

---

