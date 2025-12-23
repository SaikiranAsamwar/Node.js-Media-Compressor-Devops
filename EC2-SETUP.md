# EC2 Instance Setup Guide for DevOps Tools

## 1. Launch EC2 Instance

### AWS Console Steps:
1. Go to EC2 Dashboard → Launch Instance
2. **Name**: compressorr-devops-server
3. **AMI**: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
4. **Instance Type**: t3.large (2 vCPUs, 8 GB RAM)
5. **Key Pair**: Create or select existing key pair
6. **Network Settings**:
   - Enable Auto-assign Public IP
   - Security Group Rules:
     - SSH (22) - Your IP
     - HTTP (80) - 0.0.0.0/0
     - HTTPS (443) - 0.0.0.0/0
     - Custom TCP (3000) - 0.0.0.0/0 (Backend)
     - Custom TCP (8080) - 0.0.0.0/0 (Frontend/Jenkins)
     - Custom TCP (8081) - 0.0.0.0/0 (Jenkins)
     - Custom TCP (9000) - 0.0.0.0/0 (SonarQube)
     - Custom TCP (9090) - 0.0.0.0/0 (Prometheus)
     - Custom TCP (3001) - 0.0.0.0/0 (Grafana)
7. **Storage**: 30 GB gp3
8. Click **Launch Instance**

### AWS CLI Command:
```bash
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.large \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=compressorr-devops-server}]'
```

## 2. Connect to EC2 Instance

```bash
ssh -i "your-key.pem" ubuntu@<EC2-PUBLIC-IP>
```

## 3. Initial Setup Commands

Run these commands after connecting to your EC2 instance:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git vim unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

## 4. Install Docker

```bash
# Remove old versions if any
sudo apt-get remove -y docker docker-engine docker.io containerd runc

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up the stable repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (re-login required)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker run hello-world
```

## 5. Install Docker Compose (Standalone)

```bash
# Download latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Apply executable permissions
sudo chmod +x /usr/local/bin/docker-compose

# Create symbolic link
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installation
docker-compose --version
```

## 6. Install kubectl

```bash
# Download the latest kubectl binary
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Validate the binary (optional)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl.sha256"
echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check

# Install kubectl
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Verify installation
kubectl version --client
```

## 7. Install eksctl

```bash
# Download and extract eksctl
ARCH=amd64
PLATFORM=$(uname -s)_$ARCH
curl -sLO "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_$PLATFORM.tar.gz"

# Extract and install
tar -xzf eksctl_$PLATFORM.tar.gz -C /tmp && rm eksctl_$PLATFORM.tar.gz
sudo mv /tmp/eksctl /usr/local/bin

# Verify installation
eksctl version
```

## 8. Install AWS CLI (for eksctl usage)

```bash
# Download and install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version

# Configure AWS credentials
aws configure
```

## 9. Install Git (if not already installed)

```bash
sudo apt install -y git

# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify installation
git --version
```

## 10. Install Jenkins using Docker

```bash
# Create Jenkins volume
docker volume create jenkins_data

# Run Jenkins container
docker run -d \
  --name jenkins \
  --restart unless-stopped \
  -p 8081:8080 \
  -p 50000:50000 \
  -v jenkins_data:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --user root \
  jenkins/jenkins:lts

# Get initial admin password (wait 1-2 minutes for Jenkins to start)
sleep 60
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword

# Access Jenkins at: http://<EC2-PUBLIC-IP>:8081
```

## 11. Install SonarQube using Docker

```bash
# Create network
docker network create sonarnet

# Run PostgreSQL for SonarQube
docker run -d \
  --name sonarqube-db \
  --network sonarnet \
  --restart unless-stopped \
  -e POSTGRES_USER=sonar \
  -e POSTGRES_PASSWORD=sonar \
  -e POSTGRES_DB=sonar \
  -v sonarqube_db:/var/lib/postgresql/data \
  postgres:13

# Adjust system settings for SonarQube
sudo sysctl -w vm.max_map_count=524288
sudo sysctl -w fs.file-max=131072
echo "vm.max_map_count=524288" | sudo tee -a /etc/sysctl.conf
echo "fs.file-max=131072" | sudo tee -a /etc/sysctl.conf

# Run SonarQube
docker run -d \
  --name sonarqube \
  --network sonarnet \
  --restart unless-stopped \
  -p 9000:9000 \
  -e SONAR_JDBC_URL=jdbc:postgresql://sonarqube-db:5432/sonar \
  -e SONAR_JDBC_USERNAME=sonar \
  -e SONAR_JDBC_PASSWORD=sonar \
  -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true \
  -v sonarqube_data:/opt/sonarqube/data \
  -v sonarqube_extensions:/opt/sonarqube/extensions \
  -v sonarqube_logs:/opt/sonarqube/logs \
  sonarqube:community

# Access SonarQube at: http://<EC2-PUBLIC-IP>:9000
# Default credentials: admin/admin
```

## 12. Install Prometheus using Docker

```bash
# Create Prometheus config file
mkdir -p ~/prometheus
cat > ~/prometheus/prometheus.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'backend'
    static_configs:
      - targets: ['<EC2-PRIVATE-IP>:3000']
EOF

# Run Node Exporter
docker run -d \
  --name node-exporter \
  --restart unless-stopped \
  --network sonarnet \
  -p 9100:9100 \
  prom/node-exporter:latest

# Run Prometheus
docker run -d \
  --name prometheus \
  --restart unless-stopped \
  --network sonarnet \
  -p 9090:9090 \
  -v ~/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v prometheus_data:/prometheus \
  prom/prometheus:latest \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus

# Access Prometheus at: http://<EC2-PUBLIC-IP>:9090
```

## 13. Install Grafana using Docker

```bash
# Run Grafana
docker run -d \
  --name grafana \
  --restart unless-stopped \
  --network sonarnet \
  -p 3001:3000 \
  -e GF_SECURITY_ADMIN_USER=admin \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  -v grafana_data:/var/lib/grafana \
  grafana/grafana:latest

# Access Grafana at: http://<EC2-PUBLIC-IP>:3001
# Default credentials: admin/admin
```

## 14. Verify All Installations

```bash
# Check versions
docker --version
docker-compose --version
kubectl version --client
eksctl version
aws --version
git --version

# Check running containers
docker ps

# Expected containers:
# - jenkins
# - sonarqube
# - sonarqube-db
# - prometheus
# - node-exporter
# - grafana
```

## 15. Configure Grafana with Prometheus

1. Access Grafana at http://<EC2-PUBLIC-IP>:3001
2. Login with admin/admin (change password on first login)
3. Go to **Configuration** → **Data Sources** → **Add data source**
4. Select **Prometheus**
5. Set URL: `http://prometheus:9090`
6. Click **Save & Test**
7. Go to **Dashboards** → **Import** → Enter dashboard ID: `1860` (Node Exporter Full)
8. Select Prometheus data source and click **Import**

## 16. System Resource Monitoring

```bash
# Check system resources
htop  # Install with: sudo apt install htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check running processes
docker stats
```

## 17. Firewall Configuration (Optional - UFW)

```bash
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 3000/tcp   # Backend
sudo ufw allow 8080/tcp   # Frontend
sudo ufw allow 8081/tcp   # Jenkins
sudo ufw allow 9000/tcp   # SonarQube
sudo ufw allow 9090/tcp   # Prometheus
sudo ufw allow 3001/tcp   # Grafana
sudo ufw enable
sudo ufw status
```

## 18. Quick Access URLs

After setup, access your services at:

- **Jenkins**: http://<EC2-PUBLIC-IP>:8081
- **SonarQube**: http://<EC2-PUBLIC-IP>:9000
- **Prometheus**: http://<EC2-PUBLIC-IP>:9090
- **Grafana**: http://<EC2-PUBLIC-IP>:3001
- **Node Exporter**: http://<EC2-PUBLIC-IP>:9100/metrics

## 19. Useful Docker Commands

```bash
# View all containers
docker ps -a

# View logs
docker logs -f <container-name>

# Stop all containers
docker stop $(docker ps -aq)

# Remove all stopped containers
docker container prune -f

# Remove all unused volumes
docker volume prune -f

# Restart a container
docker restart <container-name>

# Execute command in container
docker exec -it <container-name> /bin/bash
```

## 20. Backup Commands

```bash
# Backup Jenkins data
docker run --rm -v jenkins_data:/data -v $(pwd):/backup ubuntu tar czf /backup/jenkins_backup.tar.gz -C /data .

# Backup SonarQube data
docker run --rm -v sonarqube_data:/data -v $(pwd):/backup ubuntu tar czf /backup/sonarqube_backup.tar.gz -C /data .

# Backup Prometheus data
docker run --rm -v prometheus_data:/data -v $(pwd):/backup ubuntu tar czf /backup/prometheus_backup.tar.gz -C /data .

# Backup Grafana data
docker run --rm -v grafana_data:/data -v $(pwd):/backup ubuntu tar czf /backup/grafana_backup.tar.gz -C /data .
```

## Troubleshooting

### If containers fail to start:
```bash
docker logs <container-name>
```

### If ports are already in use:
```bash
sudo netstat -tulpn | grep <port-number>
sudo kill -9 <PID>
```

### If Docker daemon is not running:
```bash
sudo systemctl start docker
sudo systemctl status docker
```

### Increase system limits for SonarQube:
```bash
ulimit -n 131072
ulimit -u 8192
```
