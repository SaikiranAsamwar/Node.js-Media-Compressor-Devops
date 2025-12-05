# Jenkins Server Configuration
# Deploy a production-ready Jenkins instance on AWS

# Data source to get latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["137112412989"] # Amazon

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# Generate SSH key pair for Jenkins
resource "tls_private_key" "jenkins" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Create AWS key pair from generated key
resource "aws_key_pair" "jenkins" {
  key_name   = "media-compressor-jenkins-key"
  public_key = tls_private_key.jenkins.public_key_openssh

  tags = {
    Name = "jenkins-key"
  }
}

# Save private key locally (optional - for manual SSH access)
resource "local_file" "jenkins_private_key" {
  content         = tls_private_key.jenkins.private_key_pem
  filename        = "${path.module}/../.ssh/jenkins_key.pem"
  file_permission = "0600"
}

# Security Group for Jenkins
resource "aws_security_group" "jenkins" {
  name        = "media-compressor-jenkins-sg"
  description = "Security group for Jenkins server"
  vpc_id      = aws_vpc.main.id

  # Jenkins web UI
  ingress {
    description = "Jenkins Web UI"
    from_port   = var.jenkins_port
    to_port     = var.jenkins_port
    protocol    = "tcp"
    cidr_blocks = [var.allowed_jenkins_cidr]
  }

  # SSH access
  ingress {
    description = "SSH Access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # Allow all outbound traffic
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "jenkins-security-group"
  }
}


# IAM Role for Jenkins
resource "aws_iam_role" "jenkins" {
  name = "media-compressor-jenkins-role"

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

  tags = {
    Name = "jenkins-role"
  }
}

# IAM Policy for ECR access
resource "aws_iam_role_policy_attachment" "jenkins_ecr" {
  role       = aws_iam_role.jenkins.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess"
}

# IAM Policy for EKS access
resource "aws_iam_role_policy_attachment" "jenkins_eks" {
  role       = aws_iam_role.jenkins.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSFullAccess"
}

# IAM Policy for EC2 full access
resource "aws_iam_role_policy_attachment" "jenkins_ec2" {
  role       = aws_iam_role.jenkins.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "jenkins" {
  name = "jenkins-instance-profile"
  role = aws_iam_role.jenkins.name
}

# EC2 Instance for Jenkins (Master Node)
resource "aws_instance" "jenkins" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t3.xlarge"
  associate_public_ip_address = true
  key_name                    = aws_key_pair.jenkins.key_name
  vpc_security_group_ids      = [aws_security_group.jenkins.id]
  iam_instance_profile        = aws_iam_instance_profile.jenkins.name

  # Initialize Jenkins with script
  user_data = file("${path.module}/jenkins-init.sh")

  # Root volume configuration
  root_block_device {
    volume_size           = 50
    volume_type           = "gp3"
    delete_on_termination = true

    tags = {
      Name = "jenkins-root-volume"
    }
  }

  # Add additional EBS volume for Jenkins data
  ebs_block_device {
    device_name           = "/dev/sdf"
    volume_size           = 100
    volume_type           = "gp3"
    delete_on_termination = true

    tags = {
      Name = "jenkins-data-volume"
    }
  }

  tags = {
    Name        = "media-compressor-jenkins"
    Environment = "production"
    ManagedBy   = "terraform"
    Project     = "media-compressor"
  }

  depends_on = [aws_security_group.jenkins]

  lifecycle {
    ignore_changes = [ami]
  }
}

# Elastic IP for Jenkins (static IP)
resource "aws_eip" "jenkins" {
  instance = aws_instance.jenkins.id
  domain   = "vpc"

  tags = {
    Name = "jenkins-eip"
  }

  depends_on = [aws_instance.jenkins]
}

# CloudWatch Log Group for monitoring
resource "aws_cloudwatch_log_group" "jenkins" {
  name              = "/aws/ec2/jenkins"
  retention_in_days = 7

  tags = {
    Name = "jenkins-logs"
  }
}
