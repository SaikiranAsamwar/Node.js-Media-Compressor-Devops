# Terraform Variables - Deployment Configuration
# These values are used to customize the infrastructure deployment

aws_region                 = "us-west-2"
cluster_name               = "media-compressor-cluster"
vpc_cidr                   = "10.0.0.0/16"
environment                = "production"
project_name               = "media-compressor"
node_instance_type         = "t3.medium"
desired_capacity           = 2
max_capacity               = 5
min_capacity               = 1
documentdb_instance_class  = "db.t3.medium"
documentdb_master_username = "compressoradmin"
documentdb_master_password = "ChangeThisPassword123!"
account_id                 = "514439471441"
