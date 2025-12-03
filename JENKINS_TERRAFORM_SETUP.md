# Jenkins Deployment: Terraform vs Manual Setup

## Quick Answer
**Recommendation: Use Terraform** ✅

Terraform is better for:
- Reproducibility
- Infrastructure as Code
- Easy scaling & management
- Automated rollback
- Team collaboration

Manual setup is better for:
- Learning/testing
- Quick prototyping
- One-time setups

---

## Option 1: Deploy Jenkins with Terraform (Recommended) ✅

### Advantages
✅ **Reproducible** - Same setup every time
✅ **Version Controlled** - Track infrastructure changes
✅ **Scalable** - Easy to add more Jenkins agents
✅ **Automated** - One command deploys everything
✅ **Destroyable** - Easy cleanup with `terraform destroy`
✅ **Team Ready** - Share configuration across team
✅ **Cost Effective** - Easily scale up/down

### What Terraform Will Deploy
```
EC2 Instance for Jenkins
├─ Auto-configured security groups
├─ EBS volume for storage
├─ IAM role for AWS access
├─ Auto-scaling group (optional)
├─ Load balancer (optional)
└─ Monitoring & logging setup
```

### Quick Setup (5 Steps)

#### Step 1: Create Jenkins Terraform Module
```hcl
# terraform/jenkins.tf

resource "aws_instance" "jenkins" {
  ami           = "ami-0c55b159cbfafe1f0"  # Ubuntu 20.04 LTS
  instance_type = "t3.medium"
  key_name      = aws_key_pair.jenkins_key.key_name

  vpc_security_group_ids = [aws_security_group.jenkins.id]

  user_data = base64encode(file("${path.module}/jenkins-init.sh"))

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
  }

  tags = {
    Name = "media-compressor-jenkins"
    Environment = "production"
  }
}

resource "aws_security_group" "jenkins" {
  name = "jenkins-sg"
  
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

output "jenkins_url" {
  value = "http://${aws_instance.jenkins.public_ip}:8080"
}
```

#### Step 2: Create Initialization Script
```bash
# terraform/jenkins-init.sh

#!/bin/bash
set -e

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Java
sudo apt-get install -y openjdk-11-jdk

# Install Jenkins
wget -q -O - https://pkg.jenkins.io/debian-stable/jenkins.io.key | sudo apt-key add -
sudo sh -c 'echo deb https://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'
sudo apt-get update
sudo apt-get install -y jenkins

# Install Docker
sudo apt-get install -y docker.io
sudo usermod -aG docker jenkins

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Ansible
sudo apt-get install -y ansible

# Install AWS CLI
sudo apt-get install -y awscli

# Start Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Print initial password
sleep 30
echo "Jenkins Initial Password:"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

#### Step 3: Deploy with Terraform
```bash
cd terraform

# Add to main.tf
terraform init
terraform plan -out=jenkins.tfplan
terraform apply jenkins.tfplan
```

#### Step 4: Get Jenkins URL
```bash
terraform output jenkins_url
# Output: http://54.123.45.67:8080
```

#### Step 5: Access Jenkins
```
1. Open browser: http://54.123.45.67:8080
2. Enter initial password from logs
3. Install suggested plugins
4. Create admin user
```

### Terraform Deployment Timeline
```
terraform init        → 5 seconds
terraform plan        → 10 seconds
terraform apply       → 3-5 minutes (EC2 launch)
Jenkins startup       → 1-2 minutes
Total                 → 5-10 minutes
```

---

## Option 2: Deploy Jenkins Manually (Quick Test)

### Advantages
✅ Fast setup for testing
✅ No infrastructure changes
✅ Good for learning
✅ Minimal prerequisites

### Disadvantages
❌ Not reproducible
❌ No version control
❌ Manual updates needed
❌ Hard to scale
❌ Difficult to share configuration

### Quick Setup (3 Steps)

#### Step 1: Launch EC2 Instance Manually
```bash
# AWS Console → EC2 → Launch Instance
- AMI: Ubuntu 20.04 LTS
- Instance Type: t3.medium
- Storage: 50GB
- Security Groups: Allow 8080 (Jenkins), 22 (SSH)
- Create and download .pem file
```

#### Step 2: SSH and Install Jenkins
```bash
ssh -i jenkins-key.pem ubuntu@<public-ip>

sudo apt-get update && sudo apt-get upgrade -y

# Install Java
sudo apt-get install -y openjdk-11-jdk

# Install Jenkins
wget -q -O - https://pkg.jenkins.io/debian-stable/jenkins.io.key | sudo apt-key add -
sudo sh -c 'echo deb https://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'
sudo apt-get update
sudo apt-get install -y jenkins
sudo systemctl start jenkins

# Install Docker
sudo apt-get install -y docker.io
sudo usermod -aG docker jenkins

# Get initial password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

#### Step 3: Access Jenkins
```
http://<public-ip>:8080
Enter initial password
Complete setup wizard
```

### Manual Deployment Timeline
```
EC2 launch         → 2-3 minutes
SSH setup          → 1 minute
Package install    → 3-5 minutes
Jenkins startup    → 1-2 minutes
Total              → 7-11 minutes (but no infrastructure control)
```

---

## Comparison Matrix

| Feature | Terraform | Manual |
|---------|-----------|--------|
| Setup Time | 5-10 min | 7-11 min |
| Reproducible | ✅ Yes | ❌ No |
| Version Control | ✅ Yes | ❌ No |
| Easy Scaling | ✅ Yes | ❌ Complex |
| Team Friendly | ✅ Yes | ❌ No |
| Easy Cleanup | ✅ `terraform destroy` | ❌ Manual |
| Infrastructure Control | ✅ Full | ❌ Limited |
| Learning Curve | Medium | Low |
| Production Ready | ✅ Yes | ⚠️ Partial |

---

## Complete Terraform Solution (Copy & Paste)

### Step 1: Create `terraform/jenkins.tf`

```hcl
# Configure Jenkins EC2 instance
resource "aws_instance" "jenkins" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.medium"
  associate_public_ip_address = true
  key_name                    = aws_key_pair.jenkins.key_name
  vpc_security_group_ids      = [aws_security_group.jenkins.id]
  iam_instance_profile        = aws_iam_instance_profile.jenkins.name

  user_data = base64encode(templatefile("${path.module}/jenkins-init.sh", {
    region = var.aws_region
  }))

  root_block_device {
    volume_size           = 50
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name        = "media-compressor-jenkins"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  depends_on = [aws_security_group.jenkins]
}

# Security Group for Jenkins
resource "aws_security_group" "jenkins" {
  name        = "jenkins-security-group"
  description = "Security group for Jenkins server"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Jenkins web UI"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "jenkins-sg"
  }
}

# IAM Role for Jenkins
resource "aws_iam_role" "jenkins" {
  name = "jenkins-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "jenkins_ecr" {
  role       = aws_iam_role.jenkins.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess"
}

resource "aws_iam_role_policy_attachment" "jenkins_eks" {
  role       = aws_iam_role.jenkins.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSFullAccess"
}

resource "aws_iam_instance_profile" "jenkins" {
  name = "jenkins-instance-profile"
  role = aws_iam_role.jenkins.name
}

# Get latest Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# Key Pair for SSH access
resource "aws_key_pair" "jenkins" {
  key_name   = "jenkins-key"
  public_key = file("~/.ssh/id_rsa.pub")  # Generate with: ssh-keygen -t rsa -N "" -f ~/.ssh/id_rsa

  tags = {
    Name = "jenkins-key"
  }
}

# Outputs
output "jenkins_instance_id" {
  value       = aws_instance.jenkins.id
  description = "Jenkins EC2 Instance ID"
}

output "jenkins_public_ip" {
  value       = aws_instance.jenkins.public_ip
  description = "Jenkins public IP address"
}

output "jenkins_url" {
  value       = "http://${aws_instance.jenkins.public_ip}:8080"
  description = "Jenkins URL"
}
```

### Step 2: Create `terraform/jenkins-init.sh`

```bash
#!/bin/bash
set -e

# Log all output
exec > >(tee /var/log/jenkins-init.log)
exec 2>&1

echo "Starting Jenkins installation..."

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Java
echo "Installing Java..."
sudo apt-get install -y openjdk-11-jdk

# Install Jenkins
echo "Installing Jenkins..."
wget -q -O - https://pkg.jenkins.io/debian-stable/jenkins.io.key | sudo apt-key add -
sudo sh -c 'echo deb https://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'
sudo apt-get update
sudo apt-get install -y jenkins

# Install Docker
echo "Installing Docker..."
sudo apt-get install -y docker.io
sudo usermod -aG docker jenkins
sudo systemctl enable docker
sudo systemctl start docker

# Install kubectl
echo "Installing kubectl..."
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Ansible
echo "Installing Ansible..."
sudo apt-get install -y ansible

# Install AWS CLI v2
echo "Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Terraform
echo "Installing Terraform..."
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Start Jenkins
echo "Starting Jenkins..."
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Wait for Jenkins to be ready
echo "Waiting for Jenkins to start..."
sleep 30

# Create Jenkins plugins list file
echo "Setting up Jenkins plugins..."
mkdir -p /var/lib/jenkins/plugins

# Get initial admin password
echo "Jenkins installation complete!"
echo "Initial Admin Password:"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword > /tmp/jenkins-password.txt
cat /tmp/jenkins-password.txt

echo "Jenkins URL: http://${HOSTNAME}:8080"
```

### Step 3: Deploy

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -N "" -f ~/.ssh/id_rsa

# Navigate to terraform directory
cd terraform

# Deploy Jenkins
terraform init
terraform plan -target=aws_instance.jenkins
terraform apply -target=aws_instance.jenkins

# Get Jenkins URL
terraform output jenkins_url

# Get initial password
terraform output -raw jenkins_public_ip  # Then SSH and get password
```

---

## My Recommendation

### **Use Terraform If:**
- ✅ You want production-ready setup
- ✅ You need to manage infrastructure as code
- ✅ You plan to scale Jenkins
- ✅ You want team collaboration
- ✅ You value reproducibility
- ✅ You already have Terraform infrastructure

### **Use Manual Setup If:**
- ⚠️ You just want to test Jenkins quickly
- ⚠️ It's a one-time setup
- ⚠️ You're learning and experimenting

---

## What I Recommend For Your Project

**→ Use Terraform** because:
1. You already have Terraform configuration in your project
2. It follows Infrastructure as Code principles
3. Easy to share with team members
4. Easy to destroy when done testing
5. Can version control Jenkins infrastructure
6. Professional/production-ready approach

---

## Quick Start Command

```bash
# Everything in one go
cd terraform
terraform init
terraform apply -auto-approve
terraform output jenkins_url
```

That's it! Jenkins will be running in 5-10 minutes. ✅

---

## Cleanup (When Done Testing)

```bash
# Destroy Jenkins infrastructure
terraform destroy -auto-approve
```

Everything will be cleaned up in 2-3 minutes!

---

**My Final Recommendation: Use Terraform** for a professional, scalable, and manageable Jenkins deployment. 🚀
