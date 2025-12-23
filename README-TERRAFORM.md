# Terraform EC2 Infrastructure for DevOps Tools

This directory contains Terraform configuration to automatically provision a t3.large EC2 instance with all DevOps tools pre-installed.

## Prerequisites

1. **Install Terraform**
   ```bash
   # Windows (using Chocolatey)
   choco install terraform

   # Or download from: https://www.terraform.io/downloads
   ```

2. **AWS CLI configured with credentials**
   ```bash
   aws configure
   ```

3. **EC2 Key Pair** - Create one in AWS Console (EC2 → Key Pairs)

## Quick Start

### 1. Configure Variables

```bash
# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
```

**Required variables in terraform.tfvars:**
```hcl
aws_region    = "us-east-1"
instance_type = "t3.large"
key_name      = "your-key-pair-name"     # Your EC2 key pair
your_ip       = "123.45.67.89/32"        # Your public IP for SSH
project_name  = "compressorr-devops"
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Preview Changes

```bash
terraform plan
```

### 4. Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted.

### 5. Get Outputs

After deployment, Terraform will display:

```
Outputs:

instance_id = "i-xxxxxxxxxxxxxxxxx"
instance_public_ip = "x.x.x.x"
jenkins_url = "http://x.x.x.x:8081"
sonarqube_url = "http://x.x.x.x:9000"
prometheus_url = "http://x.x.x.x:9090"
grafana_url = "http://x.x.x.x:3001"
ssh_command = "ssh -i your-key.pem ubuntu@x.x.x.x"
jenkins_initial_password_command = "ssh -i your-key.pem ubuntu@x.x.x.x 'docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword'"
```

## What Gets Installed

The EC2 instance is automatically configured with:

### ✅ Development Tools
- Git
- Docker & Docker Compose
- kubectl
- eksctl
- AWS CLI

### ✅ DevOps Services (Running as Docker Containers)
- **Jenkins** - http://PUBLIC-IP:8081
- **SonarQube** - http://PUBLIC-IP:9000 (admin/admin)
- **Prometheus** - http://PUBLIC-IP:9090
- **Grafana** - http://PUBLIC-IP:3001 (admin/admin)
- **Node Exporter** - http://PUBLIC-IP:9100

### ✅ Infrastructure
- t3.large instance (2 vCPUs, 8 GB RAM)
- 30 GB gp3 encrypted root volume
- Security group with all required ports
- Elastic IP for static public IP address
- Docker network for container communication

## Access Your Services

### SSH into the instance:
```bash
ssh -i your-key-pair.pem ubuntu@<PUBLIC-IP>
```

### Get Jenkins initial admin password:
```bash
# From your local machine
ssh -i your-key-pair.pem ubuntu@<PUBLIC-IP> 'docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword'

# Or after SSH into instance
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### Check all running containers:
```bash
ssh -i your-key-pair.pem ubuntu@<PUBLIC-IP>
docker ps
```

## Resource Management

### View current infrastructure:
```bash
terraform show
```

### View outputs again:
```bash
terraform output
```

### Destroy all resources:
```bash
terraform destroy
```

Type `yes` when prompted. This will delete:
- EC2 instance
- Security group
- Elastic IP
- All associated resources

## Cost Estimation

**t3.large pricing (us-east-1):**
- On-Demand: ~$0.0832/hour (~$60/month if running 24/7)
- EBS gp3 30GB: ~$2.40/month
- Elastic IP: Free while attached to running instance

**Monthly estimate: ~$62-65**

💡 **Cost Saving Tips:**
- Stop the instance when not in use (EBS charges still apply)
- Use Spot instances for non-production (add in Terraform)
- Set up auto-stop/start schedules

## Security Notes

⚠️ **Important:**
- The configuration opens ports to `0.0.0.0/0` for demo purposes
- For production, restrict access using security group rules
- Change default passwords immediately:
  - SonarQube: admin/admin
  - Grafana: admin/admin
- Enable HTTPS with SSL certificates
- Use AWS Secrets Manager for sensitive data

## Troubleshooting

### Instance not accessible:
```bash
# Check instance status
aws ec2 describe-instance-status --instance-ids <INSTANCE-ID>

# Check system log
aws ec2 get-console-output --instance-id <INSTANCE-ID>
```

### Services not running:
```bash
# SSH into instance and check
ssh -i your-key.pem ubuntu@<PUBLIC-IP>

# Check if setup completed
cat /home/ubuntu/setup-complete.txt

# Check Docker containers
docker ps -a

# View container logs
docker logs jenkins
docker logs sonarqube
docker logs prometheus
docker logs grafana
```

### User data script still running:
```bash
# User data script can take 5-10 minutes to complete
# Check cloud-init logs
sudo tail -f /var/log/cloud-init-output.log
```

## File Structure

```
.
├── ec2.tf                      # Main Terraform configuration
├── terraform.tfvars.example    # Example variables file
├── terraform.tfvars           # Your actual variables (git-ignored)
└── README-TERRAFORM.md        # This file
```

## Advanced Configuration

### Change instance type:
Edit `terraform.tfvars`:
```hcl
instance_type = "t3.xlarge"  # 4 vCPUs, 16 GB RAM
```

Then run:
```bash
terraform apply
```

### Add additional security group rules:
Edit `ec2.tf` and add ingress rules in the `aws_security_group` resource.

### Use existing VPC:
Add VPC and subnet configuration to `ec2.tf`.

## Backup and State Management

### Remote State (Recommended for teams):
```hcl
# Add to ec2.tf
terraform {
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "compressorr/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### Local State:
Terraform automatically creates:
- `terraform.tfstate` - Current state
- `terraform.tfstate.backup` - Previous state

**⚠️ Keep these files secure - they contain sensitive data!**

## Next Steps

After infrastructure is ready:

1. **Configure Jenkins:**
   - Install suggested plugins
   - Create first admin user
   - Set up pipeline jobs

2. **Configure SonarQube:**
   - Change admin password
   - Generate authentication token
   - Set up quality gates

3. **Configure Grafana:**
   - Add Prometheus data source
   - Import dashboards (Node Exporter: 1860)
   - Set up alerting

4. **Deploy your application:**
   - Clone your repository
   - Set up Jenkins pipeline
   - Configure SonarQube analysis
   - Monitor with Prometheus/Grafana

## Support

For issues or questions:
- Terraform AWS Provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS EC2 Documentation: https://docs.aws.amazon.com/ec2/
