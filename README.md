# 🚀 Media Compressor — Full DevOps Pipeline (Docker, ECR, EKS, Jenkins, SonarQube, Prometheus, Grafana)

This project demonstrates a **complete end-to-end DevOps pipeline** for deploying a **Node.js-based full-stack application** (frontend + backend + MongoDB) using:

* **AWS ECR** (store Docker images)
* **AWS EKS** (Kubernetes deployment)
* **Docker** (image creation for frontend & backend)
* **Jenkins** (CI/CD automation)
* **SonarQube** (code quality)
* **Prometheus + Grafana** (monitoring)
* **MongoDB StatefulSet** (persistent storage on EKS)
* **EC2 Master Node** (DevOps workstation)
* **NO ANSIBLE** — fully manual setup

This README serves as the **complete deployment guide**, replicable in any AWS account.

---

# 📦 Architecture Overview

```
                         ┌────────────────────────┐
                         │      Developer Push     │
                         └─────────────┬──────────┘
                                       │
                                       ▼
                        ┌───────────────────────────┐
                        │         Jenkins (EC2)      │
                        │  - npm test/build          │
                        │  - SonarQube scan          │
                        │  - Docker build            │
                        │  - Push to ECR             │
                        │  - Deploy to EKS           │
                        └───────┬───────────────────┘
                                │
                                ▼
              ┌──────────────────────────────────────────┐
              │  Amazon ECR (us-east-1)                  │
              │  - saikiranasamwar4/frontend:latest      │
              │  - saikiranasamwar4/backend:latest       │
              └──────────────────┬───────────────────────┘
                                 │
                                 ▼
          ┌────────────────────────────────────────────────────────┐
          │                Amazon EKS Cluster                      │
          │        (media-compressor-cluster)                     │
          │                                                        │
          │  ┌──────────────┐   ┌────────────────┐   ┌──────────┐ │
          │  │ Frontend Pod │   │ Backend Pod    │   │ MongoDB  │ │
          │  └──────────────┘   └────────────────┘   └──────────┘ │
          │                                                        │
          │  + LoadBalancer (ELB)                                  │
          │  + Prometheus + Grafana                                │
          └────────────────────────────────────────────────────────┘
```

---

# 🖥️ **1. Setup EC2 Master Node (Amazon Linux)**

## SSH Connection using PEM file in Terminal

**Prerequisites:**
- PEM file downloaded from AWS (e.g., `key.pem`)
- EC2 instance public IP address
- Terminal/SSH client access

**Steps:**

1. **Set correct permissions on PEM file** (Required for security):
```bash
chmod 400 key.pem
```

2. **Connect to EC2 instance**:
```bash
ssh -i key.pem ec2-user@<public-ip>
```

**Replace:**
- `key.pem` with your actual PEM file name
- `<public-ip>` with your EC2 instance's public IP

**Example:**
```bash
ssh -i my-key.pem ec2-user@54.123.45.67
```

**Expected output** (first time connection):
```
The authenticity of host '54.123.45.67' can't be established.
ED25519 key fingerprint is SHA256:XXXXXXX...
Are you sure you want to continue connecting (yes/no)?
```
Type `yes` and press Enter.

---

## SSH Connection

SSH into EC2:

```bash
ssh -i key.pem ec2-user@<public-ip>
```

Update & install basic utilities:

```bash
sudo dnf update -y
sudo dnf install -y git jq wget unzip vim
```

---

# 🐳 **2. Install Docker**

```bash
sudo dnf install docker -y
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

Re-login or run:

```bash
newgrp docker
```

Test:

```bash
docker run hello-world
```

---

# 🧰 **3. Install Required Tools**

### Node.js

```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs
```

### Java (for Jenkins & Sonar)

```bash
sudo dnf install -y java-17-amazon-corretto
```

### AWS CLI

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscli.zip
unzip awscli.zip
sudo ./aws/install
aws --version
```

### kubectl

```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

### eksctl

```bash
curl -sLO "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_Linux_amd64.tar.gz"
tar -xzf eksctl_Linux_amd64.tar.gz
sudo mv eksctl /usr/local/bin/
```

### helm

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

---

# 🧩 **4. Install Jenkins (Manual Installation)**

Add Jenkins repo:

```bash
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key
sudo dnf install -y jenkins
```

Start Jenkins:

```bash
sudo systemctl enable --now jenkins
sudo systemctl status jenkins
```

Get initial password:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Access:

```
http://<public-ip>:8080
```

---

# 📚 **5. Install SonarQube + PostgreSQL**

Install PostgreSQL:

```bash
sudo dnf install -y postgresql postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Create SonarQube database:

```bash
sudo -u postgres psql -c "CREATE USER sonar WITH PASSWORD 'sonar';"
sudo -u postgres psql -c "CREATE DATABASE sonarqube OWNER sonar;"
```

Download & run SonarQube:

```bash
mkdir -p sonarqube && cd sonarqube
wget https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-10.4.1.88267.zip
unzip sonarqube-10.4.1.88267.zip
cd sonarqube-10.4.1.88267
chmod +x bin/linux-x86-64/sonar.sh
```

Edit `/sonarqube-10.4.1.88267/conf/sonar.properties`:
```properties
sonar.jdbc.url=jdbc:postgresql://localhost:5432/sonarqube
sonar.jdbc.username=sonar
sonar.jdbc.password=sonar
```

Run:

```bash
bin/linux-x86-64/sonar.sh start
```

Access:

```
http://<public-ip>:9000 (admin/admin)
```

---

# 🏗️ **6. Create ECR Repositories**

```bash
aws ecr create-repository --repository-name saikiranasamwar4/backend --region us-east-1
aws ecr create-repository --repository-name saikiranasamwar4/frontend --region us-east-1
```

Verify:

```bash
aws ecr describe-repositories --region us-east-1
```

---

# 🐙 **7. Build & Push Docker Images**

## Backend

```bash
cd backend
docker build -t backend:latest .
docker tag backend:latest 514439471441.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/backend:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 514439471441.dkr.ecr.us-east-1.amazonaws.com
docker push 514439471441.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/backend:latest
```

## Frontend

```bash
cd frontend
docker build -t frontend:latest .
docker tag frontend:latest 514439471441.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/frontend:latest
docker push 514439471441.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/frontend:latest
```

---

# ☸️ **8. Create EKS Cluster**

```bash
eksctl create cluster \
  --name media-compressor-cluster \
  --region us-east-1 \
  --nodegroup-name media-node-group \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 4
```

Configure kubectl:

```bash
aws eks update-kubeconfig --name media-compressor-cluster --region us-east-1
kubectl get nodes
```

---

# 🍃 **9. Deploy MongoDB (StatefulSet)**

Apply MongoDB YAML:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongo/mongo-secret.yaml
kubectl apply -f k8s/mongo/mongo-statefulset.yaml
kubectl apply -f k8s/mongo/mongo-service.yaml
```

Check:

```bash
kubectl get pods -n media-app
kubectl get svc -n media-app
```

---

# 🔧 **10. Deploy Backend & Frontend to EKS**

Update ECR URI in deployment files, then:

```bash
kubectl apply -f k8s/backend/backend-deployment.yaml
kubectl apply -f k8s/backend/backend-service.yaml
kubectl apply -f k8s/frontend/frontend-deployment.yaml
kubectl apply -f k8s/frontend/frontend-service.yaml
```

Get LoadBalancer IP:

```bash
kubectl get svc -n media-app
```

---

# 📊 **11. Install Prometheus + Grafana (Monitoring)**

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

Access Grafana:

```bash
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80 &
```

Open: `http://localhost:3000` (admin/prom-operator)

---

# 🤖 **12. Jenkins CI/CD Pipeline**

Create Jenkinsfile (root of repo):

```groovy
pipeline {
    agent any
    
    environment {
        AWS_ACCOUNT_ID = '514439471441'
        AWS_DEFAULT_REGION = 'us-east-1'
        IMAGE_REPO_NAME_BACKEND = 'saikiranasamwar4/backend'
        IMAGE_REPO_NAME_FRONTEND = 'saikiranasamwar4/frontend'
        IMAGE_TAG = 'latest'
        REPOSITORY_URI_BACKEND = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/${IMAGE_REPO_NAME_BACKEND}"
        REPOSITORY_URI_FRONTEND = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/${IMAGE_REPO_NAME_FRONTEND}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Test Backend') {
            steps {
                dir('backend') {
                    sh 'npm install'
                    sh 'npm test'
                }
            }
        }
        
        stage('SonarQube Scan') {
            steps {
                sh 'sonar-scanner -Dsonar.projectKey=media-compressor -Dsonar.sources=. -Dsonar.host.url=http://SonarHost:9000'
            }
        }
        
        stage('Build Backend Image') {
            steps {
                dir('backend') {
                    sh 'docker build -t ${REPOSITORY_URI_BACKEND}:${IMAGE_TAG} .'
                }
            }
        }
        
        stage('Build Frontend Image') {
            steps {
                dir('frontend') {
                    sh 'docker build -t ${REPOSITORY_URI_FRONTEND}:${IMAGE_TAG} .'
                }
            }
        }
        
        stage('Push to ECR') {
            steps {
                sh '''
                    aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com
                    docker push ${REPOSITORY_URI_BACKEND}:${IMAGE_TAG}
                    docker push ${REPOSITORY_URI_FRONTEND}:${IMAGE_TAG}
                '''
            }
        }
        
        stage('Update EKS Deployment') {
            steps {
                sh '''
                    aws eks update-kubeconfig --name media-compressor-cluster --region ${AWS_DEFAULT_REGION}
                    kubectl set image deployment/backend backend=${REPOSITORY_URI_BACKEND}:${IMAGE_TAG} -n media-app
                    kubectl set image deployment/frontend frontend=${REPOSITORY_URI_FRONTEND}:${IMAGE_TAG} -n media-app
                    kubectl rollout status deployment/backend -n media-app
                    kubectl rollout status deployment/frontend -n media-app
                '''
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
```

---

# 🧪 **13. Testing the Pipeline**

1. Push code to GitHub
2. Jenkins triggers automatically
3. Stages execute: Test → Scan → Build → Push → Deploy
4. Check EKS pod status: `kubectl get pods -n media-app`

---

# 📈 **14. Monitoring Setup**

Prometheus: `http://localhost:9090`
Grafana: `http://localhost:3000`
AlertManager: `http://localhost:9093`

---

# 🔒 **15. Security Notes**

- Never commit AWS credentials
- Use IAM roles for EC2
- Enable EKS encryption
- Use Kubernetes Secrets for passwords
- Enable network policies

---

# 🎉 **Final Result**

✅ **Fully automated DevOps pipeline**
✅ **Production-grade Kubernetes deployment**
✅ **Comprehensive monitoring with Prometheus & Grafana**
✅ **Code quality with SonarQube**
✅ **CI/CD with Jenkins**

**Your infrastructure is now ready for production!**
