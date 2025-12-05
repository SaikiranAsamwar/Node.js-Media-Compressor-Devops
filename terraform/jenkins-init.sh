#!/bin/bash
# Jenkins and Deployment Tools Initialization Script
# Optimized for Amazon Linux 2
# This script is executed when the EC2 instance starts

set -e
exec > >(tee /var/log/jenkins-init.log)
exec 2>&1

echo "=================================================="
echo "Starting Master Node Initialization (Amazon Linux 2)"
echo "=================================================="
echo "Time: $(date)"

# Update system packages
echo "[1/10] Updating system packages..."
sudo yum update -y

# Install Java (required for Jenkins)
echo "[2/10] Installing Java..."
sudo yum install -y java-11-openjdk java-11-openjdk-devel
java -version

# Install Git
echo "[3/10] Installing Git..."
sudo yum install -y git
git --version

# Install Jenkins
echo "[4/10] Installing Jenkins..."
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key
sudo yum install -y jenkins
sudo systemctl daemon-reload
sudo systemctl enable jenkins
sudo systemctl start jenkins

# Install Docker (for Docker builds)
echo "[5/10] Installing Docker..."
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user
sudo usermod -aG docker jenkins

# Install kubectl (for Kubernetes deployments)
echo "[6/10] Installing kubectl..."
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
kubectl version --client

# Install Terraform (for infrastructure management)
echo "[7/10] Installing Terraform..."
TERRAFORM_VERSION="1.6.0"
wget -q "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
sudo yum install -y unzip
unzip -q "terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
sudo mv terraform /usr/local/bin/
terraform version

# Install AWS CLI v2
echo "[8/10] Installing AWS CLI v2..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
sudo ./aws/install
aws --version

# Install Ansible (for infrastructure provisioning)
echo "[9/10] Installing Ansible..."
sudo yum install -y python3 python3-pip
sudo pip3 install ansible
ansible --version

# Start and enable Jenkins
echo "[10/10] Configuring Jenkins..."
sudo systemctl restart jenkins

# Wait for Jenkins to fully initialize
echo "Waiting for Jenkins to initialize (30 seconds)..."
sleep 30

# Display initialization info
echo "=================================================="
echo "Master Node Setup Complete!"
echo "=================================================="
echo ""
echo "Installed Tools:"
echo "  - Java: $(java -version 2>&1 | head -1)"
echo "  - Docker: $(docker --version)"
echo "  - Terraform: $(terraform version | head -1)"
echo "  - AWS CLI: $(aws --version)"
echo "  - kubectl: $(kubectl version --client --short)"
echo "  - Ansible: $(ansible --version | head -1)"
echo ""
echo "Jenkins Status:"
sudo systemctl status jenkins --no-pager || true

echo ""
echo "Jenkins Initial Admin Password:"
echo "================================"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword || echo "Jenkins still initializing..."
echo ""
echo "Access Jenkins at: http://<your-instance-ip>:8080"
echo "SSH into instance: ssh -i <key-file> ec2-user@<your-instance-ip>"
echo ""
echo "Ready for deployment operations!"
echo "Timestamp: $(date)" >> /var/log/jenkins-init.log
echo "=================================================="