# DocumentDB Subnet Group
resource "aws_docdb_subnet_group" "main" {
  name       = "${var.project_name}-docdb-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name        = "${var.project_name}-docdb-subnet-group"
    Environment = var.environment
    Project     = var.project_name
  }
}

# DocumentDB Cluster Parameter Group
resource "aws_docdb_cluster_parameter_group" "main" {
  family = "docdb4.0"
  name   = "${var.project_name}-docdb-cluster-pg"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  tags = {
    Name        = "${var.project_name}-docdb-cluster-pg"
    Environment = var.environment
    Project     = var.project_name
  }
}

# DocumentDB Cluster
resource "aws_docdb_cluster" "main" {
  cluster_identifier      = "${var.project_name}-docdb-cluster"
  engine                  = "docdb"
  master_username         = var.documentdb_master_username
  master_password         = var.documentdb_master_password
  backup_retention_period = 7
  preferred_backup_window = "07:00-09:00"
  skip_final_snapshot     = true

  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name
  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.documentdb.id]

  storage_encrypted = true
  kms_key_id        = aws_kms_key.documentdb.arn

  tags = {
    Name        = "${var.project_name}-docdb-cluster"
    Environment = var.environment
    Project     = var.project_name
  }
}

# DocumentDB Cluster Instances
resource "aws_docdb_cluster_instance" "cluster_instances" {
  count              = 2
  identifier         = "${var.project_name}-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.documentdb_instance_class

  tags = {
    Name        = "${var.project_name}-docdb-${count.index}"
    Environment = var.environment
    Project     = var.project_name
  }
}

# KMS Key for DocumentDB encryption
resource "aws_kms_key" "documentdb" {
  description             = "KMS key for DocumentDB encryption"
  deletion_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-docdb-kms"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_kms_alias" "documentdb" {
  name          = "alias/${var.project_name}-docdb"
  target_key_id = aws_kms_key.documentdb.key_id
}
