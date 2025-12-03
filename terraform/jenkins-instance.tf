# Jenkins Server Configuration
# Deploy a production-ready Jenkins instance on AWS

# Data source to get latest Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# EC2 Key Pair for SSH access
resource "aws_key_pair" "jenkins" {
  key_name   = "media-compressor-jenkins-key"
  public_key = file("~/.ssh/id_rsa.pub")

  tags = {
    Name = "jenkins-key"
  }
}

# Security Group for Jenkins
resource "aws_security_group" "jenkins" {
  name        = "media-compressor-jenkins-sg"
  description = "Security group for Jenkins server"
  vpc_id      = aws_vpc.main.id

  # Jenkins web UI
  ingress {
    description = "Jenkins Web UI"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH access
  ingress {
    description = "SSH Access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
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

# EC2 Instance for Jenkins
resource "aws_instance" "jenkins" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.medium"
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

# Outputs
output "jenkins_instance_id" {
  value       = aws_instance.jenkins.id
  description = "Jenkins EC2 Instance ID"
}

output "jenkins_public_ip" {
  value       = aws_eip.jenkins.public_ip
  description = "Jenkins public IP address (Elastic IP)"
}

output "jenkins_private_ip" {
  value       = aws_instance.jenkins.private_ip
  description = "Jenkins private IP address"
}

output "jenkins_url" {
  value       = "http://${aws_eip.jenkins.public_ip}:8080"
  description = "Jenkins web interface URL"
}

output "jenkins_ssh_command" {
  value       = "ssh -i ~/.ssh/id_rsa ubuntu@${aws_eip.jenkins.public_ip}"
  description = "SSH command to connect to Jenkins instance"
}

output "jenkins_security_group_id" {
  value       = aws_security_group.jenkins.id
  description = "Jenkins security group ID"
}

output "jenkins_iam_role_name" {
  value       = aws_iam_role.jenkins.name
  description = "Jenkins IAM role name"
}
