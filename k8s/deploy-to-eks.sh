#!/bin/bash

# AWS EKS Deployment Script
# This script sets up the complete EKS cluster and deploys the application

set -e

# Configuration
export AWS_REGION="us-east-1"
export CLUSTER_NAME="media-compressor-cluster"
export AWS_ACCOUNT_ID=514439471441

echo "=== AWS EKS Deployment Script ==="
echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
echo "Cluster Name: $CLUSTER_NAME"
echo ""

# Step 1: Create ECR Repositories
echo "Step 1: Creating ECR repositories..."
aws ecr describe-repositories --repository-names saikiranasamwar4/media-compressor-backend --region $AWS_REGION 2>/dev/null || \
  aws ecr create-repository --repository-name saikiranasamwar4/media-compressor-backend --region $AWS_REGION

aws ecr describe-repositories --repository-names saikiranasamwar4/media-compressor-frontend --region $AWS_REGION 2>/dev/null || \
  aws ecr create-repository --repository-name saikiranasamwar4/media-compressor-frontend --region $AWS_REGION

echo "✓ ECR repositories created"

# Step 2: Build and Push Docker Images
echo ""
echo "Step 2: Building and pushing Docker images..."

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push backend
cd ../backend
docker build -t saikiranasamwar4/media-compressor-backend:v1 .
docker tag saikiranasamwar4/media-compressor-backend:v1 $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/saikiranasamwar4/media-compressor-backend:v1
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/saikiranasamwar4/media-compressor-backend:v1

# Build and push frontend
cd ../frontend
docker build -t saikiranasamwar4/media-compressor-frontend:v1 .
docker tag saikiranasamwar4/media-compressor-frontend:v1 $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/saikiranasamwar4/media-compressor-frontend:v1
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/saikiranasamwar4/media-compressor-frontend:v1

cd ../k8s
echo "✓ Docker images pushed to ECR"

# Step 3: Create EKS Cluster
echo ""
echo "Step 3: Creating EKS cluster (this takes 15-20 minutes)..."

if ! eksctl get cluster --name $CLUSTER_NAME --region $AWS_REGION 2>/dev/null; then
  eksctl create cluster \
    --name $CLUSTER_NAME \
    --region $AWS_REGION \
    --nodegroup-name standard-workers \
    --node-type t3.medium \
    --nodes 3 \
    --nodes-min 2 \
    --nodes-max 5 \
    --managed \
    --with-oidc \
    --ssh-access=false \
    --tags Environment=production,Project=media-compressor
  
  echo "✓ EKS cluster created"
else
  echo "✓ EKS cluster already exists"
fi

# Update kubeconfig
aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION

# Step 4: Create DocumentDB Cluster
echo ""
echo "Step 4: Creating DocumentDB cluster..."

# Create DocumentDB subnet group
aws docdb create-db-subnet-group \
  --db-subnet-group-name media-compressor-docdb-subnet-group \
  --db-subnet-group-description "DocumentDB subnet group for media compressor" \
  --subnet-ids $(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$(aws eks describe-cluster --name $CLUSTER_NAME --query cluster.resourcesVpcConfig.vpcId --output text)" --query 'Subnets[*].SubnetId' --output text | tr '\t' ' ') \
  --region $AWS_REGION 2>/dev/null || echo "DocumentDB subnet group already exists"

# Create DocumentDB cluster
aws docdb create-db-cluster \
  --db-cluster-identifier media-compressor-docdb-cluster \
  --engine docdb \
  --master-username compressoradmin \
  --master-user-password ChangeThisPassword123! \
  --db-subnet-group-name media-compressor-docdb-subnet-group \
  --vpc-security-group-ids $(aws eks describe-cluster --name $CLUSTER_NAME --query cluster.resourcesVpcConfig.securityGroupIds[0] --output text) \
  --region $AWS_REGION 2>/dev/null || echo "DocumentDB cluster already exists"

# Create DocumentDB instance
aws docdb create-db-instance \
  --db-instance-identifier media-compressor-docdb-primary \
  --db-instance-class db.t3.medium \
  --db-cluster-identifier media-compressor-docdb-cluster \
  --engine docdb \
  --region $AWS_REGION 2>/dev/null || echo "DocumentDB instance already exists"

echo "✓ DocumentDB cluster creation initiated (this may take 10-15 minutes)"

# Step 5: Install AWS Load Balancer Controller
echo ""
echo "Step 5: Installing AWS Load Balancer Controller..."

# Create IAM policy
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.0/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json 2>/dev/null || echo "Policy already exists"

rm iam_policy.json

# Create service account
eksctl create iamserviceaccount \
  --cluster=$CLUSTER_NAME \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --attach-policy-arn=arn:aws:iam::$AWS_ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve \
  --region=$AWS_REGION \
  --override-existing-serviceaccounts 2>/dev/null || echo "Service account already exists"

# Install AWS Load Balancer Controller using Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

echo "✓ AWS Load Balancer Controller installed"

# Step 6: Deploy application
echo ""
echo "Step 6: Deploying application..."

kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f hpa.yaml
kubectl apply -f storage.yaml
kubectl apply -f ingress.yaml

echo "✓ Application deployed"

# Step 7: Deploy monitoring
echo ""
echo "Step 7: Deploying monitoring stack..."

kubectl apply -f prometheus/
kubectl apply -f grafana-deployment.yaml

echo "✓ Monitoring stack deployed"

echo ""
echo "=== Deployment Complete ==="
echo "Frontend URL: $(kubectl get svc frontend-service -n media-compressor -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
echo "Grafana URL: $(kubectl get svc grafana-service -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'):3000"
echo "Grafana Login: admin/admin123"
