
---

# 🔧 Prerequisite Tool Installation (Core CI/CD Stack)

> This section covers **installation, verification, and basic configuration** of all essential tools required for the CI/CD pipeline:
>
> **Jenkins, Docker, Git, AWS CLI, kubectl, eksctl, Prometheus, Grafana, SonarQube**

---

## 🔹 2.5 Install Core Dependencies

```bash
sudo yum update -y
sudo yum install -y curl wget unzip vim git java-17-amazon-corretto
```

Verify Java (required for Jenkins & SonarQube):

```bash
java -version
```

---

## 🔹 2.6 Install Git

```bash
sudo yum install git -y
git --version
```

Basic Git configuration:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --list
```

---

## 🔹 2.7 Install Docker

```bash
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker
```

Add users to Docker group:

```bash
sudo usermod -aG docker ec2-user
sudo usermod -aG docker jenkins
newgrp docker
```

Verify:

```bash
docker --version
docker ps
```

---

## 🔹 2.8 Install Docker Compose

```bash
sudo curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) \
-o /usr/local/bin/docker-compose

sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

---

## 🔹 2.9 Install Jenkins

### Add Jenkins Repository

```bash
sudo wget -O /etc/yum.repos.d/jenkins.repo \
https://pkg.jenkins.io/redhat-stable/jenkins.repo

sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
```

### Install Jenkins

```bash
sudo yum install jenkins -y
sudo systemctl start jenkins
sudo systemctl enable jenkins
```

Verify:

```bash
sudo systemctl status jenkins
```

Get Admin Password:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Access Jenkins:

```
http://<EC2-PUBLIC-IP>:8080
```

---

## 🔹 2.10 Install AWS CLI v2

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip
sudo ./aws/install
```

Verify:

```bash
aws --version
```

Configure AWS:

```bash
aws configure
```

---

## 🔹 2.11 Install kubectl

```bash
curl -LO https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

Verify:

```bash
kubectl version --client
```

---

## 🔹 2.12 Install eksctl

```bash
curl --silent --location \
"https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" \
| tar xz -C /tmp

sudo mv /tmp/eksctl /usr/local/bin
```

Verify:

```bash
eksctl version
```

---

## 🔹 2.13 Install Helm (Required for Prometheus & Grafana)

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

Verify:

```bash
helm version
```

---

## 🔹 2.14 Install Prometheus (Kubernetes Monitoring)

### Add Helm Repo

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### Install Prometheus

```bash
kubectl create namespace monitoring

helm install prometheus prometheus-community/prometheus \
--namespace monitoring
```

Verify:

```bash
kubectl get pods -n monitoring
```

Expose Prometheus (Optional – NodePort):

```bash
kubectl expose svc prometheus-server \
--type=NodePort \
--name=prometheus-nodeport \
--port=80 \
-n monitoring
```

---

## 🔹 2.15 Install Grafana (Visualization)

### Add Helm Repo

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### Install Grafana

```bash
helm install grafana grafana/grafana \
--namespace monitoring
```

Get Admin Password:

```bash
kubectl get secret grafana -n monitoring \
-o jsonpath="{.data.admin-password}" | base64 --decode
```

Expose Grafana:

```bash
kubectl expose svc grafana \
--type=NodePort \
--name=grafana-nodeport \
--port=3000 \
-n monitoring
```

Access:

```
http://<NODE-IP>:<NODE-PORT>
```

---

## 🔹 2.16 Install SonarQube (Code Quality)

### Run SonarQube via Docker (Recommended)

```bash
docker run -d \
--name sonarqube \
-p 9000:9000 \
sonarqube:lts
```

Verify:

```bash
docker ps
```

Access SonarQube:

```
http://<EC2-PUBLIC-IP>:9000
```

Default Credentials:

```
Username: admin
Password: admin
```

🔒 **Change password immediately after login**

---

## 🔹 2.17 Jenkins Plugin Checklist (Mandatory)

Install from:

**Manage Jenkins → Plugins → Available**

* Docker Pipeline
* Kubernetes
* Kubernetes CLI
* AWS Credentials
* Git
* Pipeline
* Credentials Binding
* SonarQube Scanner
* Prometheus Metrics

---

## 🔹 2.18 Verification Checklist

```bash
git --version
docker --version
docker-compose --version
aws --version
kubectl version --client
eksctl version
helm version
```

Jenkins status:

```bash
sudo systemctl status jenkins
```

---

## ✅ Outcome

At this point, your server is equipped with:

* ✔ Jenkins (CI engine)
* ✔ Docker & DockerHub
* ✔ Git
* ✔ AWS CLI
* ✔ kubectl & eksctl
* ✔ Helm
* ✔ Prometheus (Monitoring)
* ✔ Grafana (Visualization)
* ✔ SonarQube (Code Quality)

This forms a **complete DevOps-grade CI/CD foundation**.

---

## 🔜 Next Enhancement (Optional)

* SonarQube integration in Jenkinsfile
* Prometheus → Grafana dashboards
* Trivy security scans
* Blue/Green or Canary deployments

---

If you want, next I can:

* 🔧 **Merge this perfectly into your existing MD**
* 🧠 **Add SonarQube stage in Jenkinsfile**
* 📊 **Add Prometheus + Grafana monitoring section**
* 🔐 **Harden security & IAM best practices**

Just say the word 🚀
