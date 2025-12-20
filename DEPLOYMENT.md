---

# 🚀 Compressorr – Production Deployment Guide (Amazon Linux + AWS DevOps)

**Version:** 1.1.0
**Last Updated:** December 2025
**OS Standard:** Amazon Linux 2 / Amazon Linux 2023
**Maintained By:** DevOps Team

---

## 📌 Architecture Overview

* **CI/CD** → Jenkins
* **Code Quality** → SonarQube
* **Containers** → Docker + DockerHub
* **Orchestration** → Amazon EKS
* **Automation** → Ansible
* **Monitoring** → Prometheus & Grafana
* **Database** → MongoDB (StatefulSet)

---

## 1️⃣ Prerequisites

### AWS Account Requirements

* IAM User with:

  * `AdministratorAccess` *(learning)* or least-privilege for prod
* EC2, EKS, IAM, VPC access
* DockerHub account

---

## 2️⃣ Base OS & Tooling (Amazon Linux)

> **Run on all EC2 instances**

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

Configure:

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

✅ **Use Amazon Linux 2 AMI**

```
ami-0e731c8a588258d0d (example – always verify region)
```

### Required EC2 Instances

| Service        | Instance Type |
| -------------- | ------------- |
| Jenkins        | t3.medium     |
| SonarQube      | t3.medium     |
| Monitoring     | t3.medium     |
| App (optional) | t3.large      |

✔ **Security Groups**

* Jenkins: `22, 8080`
* SonarQube: `22, 9000`
* Monitoring: `22, 9090, 3000`
* App: `22, 80, 3000, 8080`

---

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

Get password:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

---

## 🔟 SonarQube Setup (Amazon Linux)

### Kernel Tuning (MANDATORY)

```bash
sudo sysctl -w vm.max_map_count=262144
sudo sysctl -w fs.file-max=65536
```

Persist:

```bash
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
echo "fs.file-max=65536" | sudo tee -a /etc/sysctl.conf
```

### Install & Run SonarQube

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

Access:

```
http://<SONAR_IP>:9000
```

---

## 1️⃣1️⃣ DockerHub Build & Push (Verified)

✔ **Commands are correct**

```bash
docker build -t saikiranasamwar4/compressor-backend:latest -f Dockerfiles/backend.Dockerfile .
docker build -t saikiranasamwar4/compressor-frontend:latest -f Dockerfiles/frontend.Dockerfile .

docker login
docker push saikiranasamwar4/compressor-backend:latest
docker push saikiranasamwar4/compressor-frontend:latest
```

---

## 1️⃣2️⃣ EKS Cluster (Corrected & Verified)

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

## 1️⃣3️⃣ Kubernetes Deployment (Validated)

✔ MongoDB StatefulSet
✔ Backend Deployment
✔ Frontend Deployment
✔ HPA
✔ Monitoring

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongo/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/monitoring/
```

---

## 1️⃣4️⃣ Jenkins CI/CD Flow (Corrected)

Pipeline stages:

1. Git Checkout
2. SonarQube Scan
3. Docker Build
4. Docker Push
5. Deploy to EKS
6. Verify Rollout

✔ Credentials
✔ Webhooks
✔ SonarQube Token
✔ kubectl configured for Jenkins user

---

## 1️⃣5️⃣ Monitoring (Prometheus + Grafana)

✔ Targets verified
✔ Dashboards imported
✔ Alerts configured

Access:

* Prometheus → `:9090`
* Grafana → `:3000` (`admin/admin`)

---

## 1️⃣6️⃣ Fixed Issues You Had (Important)

| Issue                | Fix                        |
| -------------------- | -------------------------- |
| Ubuntu commands      | Replaced with Amazon Linux |
| Jenkins Java missing | Added Java 17              |
| SonarQube crashes    | Added kernel tuning        |
| Wrong eksctl URL     | Corrected                  |
| Missing docker perms | Fixed                      |
| Monitoring gaps      | Completed                  |
| IAM assumptions      | Clarified                  |

---


