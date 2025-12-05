output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ids attached to the cluster control plane"
  value       = module.eks.cluster_primary_security_group_id
}

output "cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = module.eks.cluster_iam_role_name
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = module.eks.cluster_oidc_issuer_url
}

output "node_groups" {
  description = "EKS node groups"
  value       = module.eks.eks_managed_node_groups
}

output "aws_auth_configmap_yaml" {
  description = "Formatted yaml output for base aws-auth configmap containing roles used in cluster node groups/fargate profiles"
  value       = module.eks.aws_auth_configmap_yaml
}

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "database_subnets" {
  description = "List of IDs of database subnets"
  value       = aws_subnet.database[*].id
}

# ECR Outputs
output "ecr_backend_repository_url" {
  description = "URL of the backend ECR repository"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  description = "URL of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.repository_url
}

# DocumentDB Outputs
output "documentdb_cluster_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = aws_docdb_cluster.main.endpoint
}

output "documentdb_cluster_reader_endpoint" {
  description = "DocumentDB cluster reader endpoint"
  value       = aws_docdb_cluster.main.reader_endpoint
}

output "documentdb_cluster_port" {
  description = "DocumentDB cluster port"
  value       = aws_docdb_cluster.main.port
}

output "documentdb_cluster_master_username" {
  description = "DocumentDB cluster master username"
  value       = aws_docdb_cluster.main.master_username
  sensitive   = true
}

# Jenkins Outputs
output "jenkins_instance_id" {
  description = "Jenkins EC2 Instance ID"
  value       = aws_instance.jenkins.id
}

output "jenkins_public_ip" {
  description = "Jenkins public IP address (Elastic IP)"
  value       = aws_eip.jenkins.public_ip
}

output "jenkins_private_ip" {
  description = "Jenkins private IP address"
  value       = aws_instance.jenkins.private_ip
}

output "jenkins_url" {
  description = "Jenkins web interface URL"
  value       = "http://${aws_eip.jenkins.public_ip}:8080"
}

output "jenkins_ssh_command" {
  description = "SSH command to connect to master instance (Amazon Linux)"
  value       = "ssh -i .ssh/jenkins_key.pem ec2-user@${aws_eip.jenkins.public_ip}"
}

output "jenkins_security_group_id" {
  description = "Jenkins security group ID"
  value       = aws_security_group.jenkins.id
}

output "jenkins_iam_role_name" {
  description = "Jenkins IAM role name"
  value       = aws_iam_role.jenkins.name
}

output "jenkins_private_key_path" {
  description = "Path to Jenkins private key for SSH access"
  value       = local_file.jenkins_private_key.filename
  sensitive   = true
}
