#!/bin/bash
set -e

dnf update -y
dnf install -y docker git curl unzip

systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# Docker Compose
curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
-o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# kubectl
curl -LO https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl
install -o root -g root -m 0755 kubectl /usr/local/bin

# eksctl
curl -sLO https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_Linux_amd64.tar.gz
tar -xzf eksctl_Linux_amd64.tar.gz
mv eksctl /usr/local/bin

# SonarQube sysctl
sysctl -w vm.max_map_count=524288
sysctl -w fs.file-max=131072
echo "vm.max_map_count=524288" >> /etc/sysctl.conf
echo "fs.file-max=131072" >> /etc/sysctl.conf

# Docker network
docker network create devops || true

# Jenkins
docker volume create jenkins_data
docker run -d --name jenkins \
  --restart unless-stopped \
  --network devops \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_data:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --user root jenkins/jenkins:lts

# SonarQube
docker volume create sonar_db sonar_data
docker run -d --name sonar-db \
  --network devops \
  -e POSTGRES_USER=sonar \
  -e POSTGRES_PASSWORD=sonar \
  -e POSTGRES_DB=sonar postgres:13

docker run -d --name sonarqube \
  --network devops \
  -p 9000:9000 \
  -e SONAR_JDBC_URL=jdbc:postgresql://sonar-db:5432/sonar \
  -e SONAR_JDBC_USERNAME=sonar \
  -e SONAR_JDBC_PASSWORD=sonar \
  -v sonar_data:/opt/sonarqube/data \
  sonarqube:community

# Prometheus
mkdir -p /opt/prometheus
cat <<EOF >/opt/prometheus/prometheus.yml
global:
  scrape_interval: 15s
EOF

docker run -d --name prometheus \
  -p 9090:9090 \
  -v /opt/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Grafana
docker volume create grafana_data
docker run -d --name grafana \
  -p 3000:3000 \
  -v grafana_data:/var/lib/grafana \
  grafana/grafana
