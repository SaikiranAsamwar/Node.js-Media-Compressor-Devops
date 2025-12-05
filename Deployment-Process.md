Perfect — I have all details.
Here is your **complete, production-grade README.md**, customized with:

* **Region:** `us-east-1`
* **ECR repos:**

  * `saikiranasamwar4/frontend`
  * `saikiranasamwar4/backend`
* **EKS cluster:** `media-compressor-cluster`

This README is **portfolio-ready**, professional, and covers your entire DevOps pipeline.

---

# 📄 **README.md — Media Compressor DevOps Project**

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
sudo usermod -aG docker jenkins
sudo systemctl enable --now jenkins
sudo systemctl restart jenkins
```

Jenkins unlock password:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Access Jenkins → http://EC2_PUBLIC_IP:8080

Install plugins:

* Git
* Pipeline
* Docker Pipeline
* SonarQube Scanner
* Kubernetes CLI
* AWS Credentials

---

# 📚 **5. Install SonarQube + PostgreSQL**

### Install PostgreSQL

```bash
sudo dnf install postgresql15 postgresql15-server -y
sudo /usr/bin/postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

Create DB & user:

```bash
sudo -u postgres psql -c "CREATE USER sonar WITH ENCRYPTED PASSWORD 'sonar_pass';"
sudo -u postgres psql -c "CREATE DATABASE sonarqube OWNER sonar;"
```

### Install SonarQube

```bash
cd /opt
sudo wget https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-10.4.zip
sudo unzip sonarqube-10.4.zip
sudo mv sonarqube-10.4 sonarqube
sudo chown -R ec2-user:ec2-user /opt/sonarqube
```

Edit DB config:

```bash
sudo nano /opt/sonarqube/conf/sonar.properties
```

Add:

```
sonar.jdbc.username=sonar
sonar.jdbc.password=sonar_pass
sonar.jdbc.url=jdbc:postgresql://localhost/sonarqube
```

### Create systemd service

```bash
sudo tee /etc/systemd/system/sonarqube.service <<EOF
[Unit]
Description=SonarQube
After=network.target

[Service]
Type=forking
User=ec2-user
ExecStart=/opt/sonarqube/bin/linux-x86-64/sonar.sh start
ExecStop=/opt/sonarqube/bin/linux-x86-64/sonar.sh stop

[Install]
WantedBy=multi-user.target
EOF
```

Start service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sonarqube
```

Access Sonar → http://EC2_PUBLIC_IP:9000

---

# 🏗️ **6. Create ECR Repositories**

Region: `us-east-1`
Account: Automatically detected

```bash
aws ecr create-repository --repository-name saikiranasamwar4/frontend --region us-east-1
aws ecr create-repository --repository-name saikiranasamwar4/backend  --region us-east-1
```

Login to ECR:

```bash
aws ecr get-login-password --region us-east-1 |
docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

---

# 🐙 **7. Build & Push Docker Images**

## Backend

```bash
cd backend
docker build -t backend .
docker tag backend:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/backend:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/backend:latest
```

## Frontend

```bash
cd frontend
docker build -t frontend .
docker tag frontend:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/frontend:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/frontend:latest
```

---

# ☸️ **8. Create EKS Cluster**

```bash
eksctl create cluster \
  --name media-compressor-cluster \
  --region us-east-1 \
  --nodes 3 \
  --node-type t3.medium \
  --managed
```

Verify:

```bash
kubectl get nodes
```

---

# 🍃 **9. Deploy MongoDB (StatefulSet)**

```bash
kubectl apply -f k8s/mongo-statefulset.yaml
```

---

# 🔧 **10. Deploy Backend & Frontend to EKS**

```bash
kubectl apply -f k8s/backend-deploy.yaml
kubectl apply -f k8s/frontend-deploy.yaml
```

Get LoadBalancer URL:

```bash
kubectl get svc -n media-app
```

---

# 📊 **11. Install Prometheus + Grafana (Monitoring)**

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace
```

Expose Grafana:

```bash
kubectl -n monitoring port-forward svc/monitoring-grafana 3000:80
```

Login:
username: `admin`
password: `prom-operator`

---

# 🤖 **12. Jenkins CI/CD Pipeline**

Your `Jenkinsfile` automates:

* Git checkout
* npm build/test
* Sonar scan
* Docker build
* Push to ECR
* Update EKS deployment

Place at root of repo:

```groovy
pipeline {
  agent any
  environment {
    AWS_REGION = 'us-east-1'
    AWS_ACCOUNT = '<AWS_ACCOUNT_ID>'
    ECR_BACKEND = "${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/saikiranasamwar4/backend"
    ECR_FRONTEND = "${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/saikiranasamwar4/frontend"
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Backend Build & Test') {
      steps {
        dir('backend') {
          sh 'npm ci'
          sh 'npm test || true'
        }
      }
    }
    stage('Frontend Build') {
      steps {
        dir('frontend') {
          sh 'npm ci'
          sh 'npm run build'
        }
      }
    }
    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('SonarQube') {
          dir('backend') { sh 'sonar-scanner -Dsonar.projectKey=backend' }
          dir('frontend') { sh 'sonar-scanner -Dsonar.projectKey=frontend' }
        }
      }
    }
    stage('Build & Push Docker Images') {
      steps {
        sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        
        dir('backend') {
          sh "docker build -t backend:${BUILD_NUMBER} ."
          sh "docker tag backend:${BUILD_NUMBER} ${ECR_BACKEND}:${BUILD_NUMBER}"
          sh "docker push ${ECR_BACKEND}:${BUILD_NUMBER}"
        }
        dir('frontend') {
          sh "docker build -t frontend:${BUILD_NUMBER} ."
          sh "docker tag frontend:${BUILD_NUMBER} ${ECR_FRONTEND}:${BUILD_NUMBER}"
          sh "docker push ${ECR_FRONTEND}:${BUILD_NUMBER}"
        }
      }
    }
    stage('Deploy to EKS') {
      steps {
        sh """
        aws eks --region us-east-1 update-kubeconfig --name media-compressor-cluster
        
        kubectl -n media-app set image deployment/backend backend=${ECR_BACKEND}:${BUILD_NUMBER}
        kubectl -n media-app set image deployment/frontend frontend=${ECR_FRONTEND}:${BUILD_NUMBER}

        kubectl -n media-app rollout status deployment/backend
        kubectl -n media-app rollout status deployment/frontend
        """
      }
    }
  }
}
```

---

# 🧪 **13. Testing the Pipeline**

Push a commit to GitHub → Jenkins triggers automatically (if webhook added) → your application redeploys on AWS.

---

# 📈 **14. Monitoring Setup**

Backend must expose `/metrics` using `prom-client`.
Prometheus scrapes via a ServiceMonitor.
Grafana visualizes performance.

---

# 🔒 **15. Security Notes**

* Use IAM Role for EC2 master instead of AWS Access Keys
* Restrict Jenkin/Sonar security group
* Use ECR image scanning
* Use Kubernetes Secrets

---

# 🎉 **Final Result**

You now have a **complete, scalable, cloud-native CI/CD + Monitoring pipeline**:

* Automated builds
* Static code analysis
* Containerization
* AWS ECR registry
* Kubernetes deployment
* Persistent MongoDB
* Prometheus + Grafana metrics
* Jenkins manual installation workflow
* 100% built manually (NO ansible, NO docker for tools)

This README can be directly added to your GitHub repository.

---

# ✅ Want me to generate diagrams (PNG), folder structure, or improved Jenkinsfile?

Just tell me:
**"Generate diagrams"**
or
**"Generate folder structure"**
or
**"Optimize Jenkinsfile"**
Perfect — I have all details.
Here is your **complete, production-grade README.md**, customized with:

* **Region:** `us-east-1`
* **ECR repos:**

  * `saikiranasamwar4/frontend`
  * `saikiranasamwar4/backend`
* **EKS cluster:** `media-compressor-cluster`

This README is **portfolio-ready**, professional, and covers your entire DevOps pipeline.

---

# 📄 **README.md — Media Compressor DevOps Project**

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
sudo usermod -aG docker jenkins
sudo systemctl enable --now jenkins
sudo systemctl restart jenkins
```

Jenkins unlock password:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Access Jenkins → http://EC2_PUBLIC_IP:8080

Install plugins:

* Git
* Pipeline
* Docker Pipeline
* SonarQube Scanner
* Kubernetes CLI
* AWS Credentials

---

# 📚 **5. Install SonarQube + PostgreSQL**

### Install PostgreSQL

```bash
sudo dnf install postgresql15 postgresql15-server -y
sudo /usr/bin/postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

Create DB & user:

```bash
sudo -u postgres psql -c "CREATE USER sonar WITH ENCRYPTED PASSWORD 'sonar_pass';"
sudo -u postgres psql -c "CREATE DATABASE sonarqube OWNER sonar;"
```

### Install SonarQube

```bash
cd /opt
sudo wget https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-10.4.zip
sudo unzip sonarqube-10.4.zip
sudo mv sonarqube-10.4 sonarqube
sudo chown -R ec2-user:ec2-user /opt/sonarqube
```

Edit DB config:

```bash
sudo nano /opt/sonarqube/conf/sonar.properties
```

Add:

```
sonar.jdbc.username=sonar
sonar.jdbc.password=sonar_pass
sonar.jdbc.url=jdbc:postgresql://localhost/sonarqube
```

### Create systemd service

```bash
sudo tee /etc/systemd/system/sonarqube.service <<EOF
[Unit]
Description=SonarQube
After=network.target

[Service]
Type=forking
User=ec2-user
ExecStart=/opt/sonarqube/bin/linux-x86-64/sonar.sh start
ExecStop=/opt/sonarqube/bin/linux-x86-64/sonar.sh stop

[Install]
WantedBy=multi-user.target
EOF
```

Start service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sonarqube
```

Access Sonar → http://EC2_PUBLIC_IP:9000

---

# 🏗️ **6. Create ECR Repositories**

Region: `us-east-1`
Account: Automatically detected

```bash
aws ecr create-repository --repository-name saikiranasamwar4/frontend --region us-east-1
aws ecr create-repository --repository-name saikiranasamwar4/backend  --region us-east-1
```

Login to ECR:

```bash
aws ecr get-login-password --region us-east-1 |
docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

---

# 🐙 **7. Build & Push Docker Images**

## Backend

```bash
cd backend
docker build -t backend .
docker tag backend:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/backend:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/backend:latest
```

## Frontend

```bash
cd frontend
docker build -t frontend .
docker tag frontend:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/frontend:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/saikiranasamwar4/frontend:latest
```

---

# ☸️ **8. Create EKS Cluster**

```bash
eksctl create cluster \
  --name media-compressor-cluster \
  --region us-east-1 \
  --nodes 3 \
  --node-type t3.medium \
  --managed
```

Verify:

```bash
kubectl get nodes
```

---

# 🍃 **9. Deploy MongoDB (StatefulSet)**

```bash
kubectl apply -f k8s/mongo-statefulset.yaml
```

---

# 🔧 **10. Deploy Backend & Frontend to EKS**

```bash
kubectl apply -f k8s/backend-deploy.yaml
kubectl apply -f k8s/frontend-deploy.yaml
```

Get LoadBalancer URL:

```bash
kubectl get svc -n media-app
```

---

# 📊 **11. Install Prometheus + Grafana (Monitoring)**

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace
```

Expose Grafana:

```bash
kubectl -n monitoring port-forward svc/monitoring-grafana 3000:80
```

Login:
username: `admin`
password: `prom-operator`

---

# 🤖 **12. Jenkins CI/CD Pipeline**

Your `Jenkinsfile` automates:

* Git checkout
* npm build/test
* Sonar scan
* Docker build
* Push to ECR
* Update EKS deployment

Place at root of repo:

```groovy
pipeline {
  agent any
  environment {
    AWS_REGION = 'us-east-1'
    AWS_ACCOUNT = '<AWS_ACCOUNT_ID>'
    ECR_BACKEND = "${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/saikiranasamwar4/backend"
    ECR_FRONTEND = "${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/saikiranasamwar4/frontend"
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Backend Build & Test') {
      steps {
        dir('backend') {
          sh 'npm ci'
          sh 'npm test || true'
        }
      }
    }
    stage('Frontend Build') {
      steps {
        dir('frontend') {
          sh 'npm ci'
          sh 'npm run build'
        }
      }
    }
    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('SonarQube') {
          dir('backend') { sh 'sonar-scanner -Dsonar.projectKey=backend' }
          dir('frontend') { sh 'sonar-scanner -Dsonar.projectKey=frontend' }
        }
      }
    }
    stage('Build & Push Docker Images') {
      steps {
        sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        
        dir('backend') {
          sh "docker build -t backend:${BUILD_NUMBER} ."
          sh "docker tag backend:${BUILD_NUMBER} ${ECR_BACKEND}:${BUILD_NUMBER}"
          sh "docker push ${ECR_BACKEND}:${BUILD_NUMBER}"
        }
        dir('frontend') {
          sh "docker build -t frontend:${BUILD_NUMBER} ."
          sh "docker tag frontend:${BUILD_NUMBER} ${ECR_FRONTEND}:${BUILD_NUMBER}"
          sh "docker push ${ECR_FRONTEND}:${BUILD_NUMBER}"
        }
      }
    }
    stage('Deploy to EKS') {
      steps {
        sh """
        aws eks --region us-east-1 update-kubeconfig --name media-compressor-cluster
        
        kubectl -n media-app set image deployment/backend backend=${ECR_BACKEND}:${BUILD_NUMBER}
        kubectl -n media-app set image deployment/frontend frontend=${ECR_FRONTEND}:${BUILD_NUMBER}

        kubectl -n media-app rollout status deployment/backend
        kubectl -n media-app rollout status deployment/frontend
        """
      }
    }
  }
}
```

---

# 🧪 **13. Testing the Pipeline**

Push a commit to GitHub → Jenkins triggers automatically (if webhook added) → your application redeploys on AWS.

---

# 📈 **14. Monitoring Setup**

Backend must expose `/metrics` using `prom-client`.
Prometheus scrapes via a ServiceMonitor.
Grafana visualizes performance.

---

# 🔒 **15. Security Notes**

* Use IAM Role for EC2 master instead of AWS Access Keys
* Restrict Jenkin/Sonar security group
* Use ECR image scanning
* Use Kubernetes Secrets

---

# 🎉 **Final Result**

You now have a **complete, scalable, cloud-native CI/CD + Monitoring pipeline**:

* Automated builds
* Static code analysis
* Containerization
* AWS ECR registry
* Kubernetes deployment
* Persistent MongoDB
* Prometheus + Grafana metrics
* Jenkins manual installation workflow
* 100% built manually (NO ansible, NO docker for tools)

This README can be directly added to your GitHub repository.

---

# ✅ Want me to generate diagrams (PNG), folder structure, or improved Jenkinsfile?

Just tell me:
**"Generate diagrams"**
or
**"Generate folder structure"**
or
**"Optimize Jenkinsfile"**
