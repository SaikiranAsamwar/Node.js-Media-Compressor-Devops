#!/bin/bash
# Jenkins initialization script
# This script is executed when the EC2 instance starts

set -e
exec > >(tee /var/log/jenkins-init.log)
exec 2>&1

echo "=================================================="
echo "Starting Jenkins Server Initialization"
echo "=================================================="
echo "Time: $(date)"

# Update system packages
echo "[1/9] Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Java (required for Jenkins)
echo "[2/9] Installing Java..."
sudo apt-get install -y openjdk-11-jdk
java -version

# Install Jenkins
echo "[3/9] Installing Jenkins..."
wget -q -O - https://pkg.jenkins.io/debian-stable/jenkins.io.key | sudo apt-key add -
sudo sh -c 'echo deb https://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'
sudo apt-get update
sudo apt-get install -y jenkins

# Install Docker (for Docker builds in Jenkins)
echo "[4/9] Installing Docker..."
sudo apt-get install -y docker.io
sudo usermod -aG docker jenkins
sudo systemctl enable docker
sudo systemctl start docker

# Install kubectl (for Kubernetes deployments)
echo "[5/9] Installing kubectl..."
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
kubectl version --client

# Install Ansible (for infrastructure provisioning)
echo "[6/9] Installing Ansible..."
sudo apt-get install -y ansible
ansible --version

# Install AWS CLI (for AWS interactions)
echo "[7/9] Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
sudo ./aws/install
aws --version

# Install Terraform (for infrastructure management)
echo "[8/9] Installing Terraform..."
TERRAFORM_VERSION="1.6.0"
wget -q "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
unzip -q "terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
sudo mv terraform /usr/local/bin/
terraform version

# Start and enable Jenkins
echo "[9/9] Starting Jenkins service..."
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Wait for Jenkins to fully initialize
echo "Waiting for Jenkins to initialize (30 seconds)..."
sleep 30

# Display Jenkins status
echo "=================================================="
echo "Jenkins Installation Complete!"
echo "=================================================="
echo ""
echo "Jenkins Status:"
sudo systemctl status jenkins --no-pager

echo ""
echo "Initial Admin Password:"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

echo ""
echo "Jenkins will be available at:"
echo "http://<your-instance-ip>:8080"
echo ""
echo "Installation timestamp: $(date)" >> /var/log/jenkins-init.log
echo "=================================================="
