# Data source for EKS cluster authentication
# This is used by the Kubernetes and Helm providers to authenticate with the EKS cluster

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}
