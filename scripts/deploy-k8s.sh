#!/bin/bash

# Manual Kubernetes Deployment Script
# Use this for manual deployments outside of Jenkins CI/CD

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="media-app"
AWS_REGION="us-east-1"
EKS_CLUSTER="media-compressor-cluster"

echo -e "${BLUE}=== Kubernetes Deployment Script ===${NC}"
echo ""

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Updating kubeconfig for EKS cluster...${NC}"
aws eks update-kubeconfig \
    --name ${EKS_CLUSTER} \
    --region ${AWS_REGION}
echo -e "${GREEN}✓ Kubeconfig updated${NC}"
echo ""

echo -e "${YELLOW}Step 2: Creating/Verifying namespace...${NC}"
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/namespace.yaml
echo -e "${GREEN}✓ Namespace ready${NC}"
echo ""

echo -e "${YELLOW}Step 3: Deploying MongoDB...${NC}"
kubectl apply -f k8s/mongo/ -n ${NAMESPACE}
echo "Waiting for MongoDB to be ready..."
kubectl wait --for=condition=ready pod -l app=mongo -n ${NAMESPACE} --timeout=300s || {
    echo -e "${YELLOW}⚠ MongoDB not ready yet, continuing anyway...${NC}"
}
echo -e "${GREEN}✓ MongoDB deployed${NC}"
echo ""

echo -e "${YELLOW}Step 4: Deploying Backend...${NC}"
kubectl apply -f k8s/backend/ -n ${NAMESPACE}
echo "Waiting for Backend to be ready..."
kubectl wait --for=condition=ready pod -l app=backend -n ${NAMESPACE} --timeout=300s || {
    echo -e "${YELLOW}⚠ Backend not ready yet, continuing anyway...${NC}"
}
echo -e "${GREEN}✓ Backend deployed${NC}"
echo ""

echo -e "${YELLOW}Step 5: Deploying Frontend...${NC}"
kubectl apply -f k8s/frontend/ -n ${NAMESPACE}
echo "Waiting for Frontend to be ready..."
kubectl wait --for=condition=ready pod -l app=frontend -n ${NAMESPACE} --timeout=300s || {
    echo -e "${YELLOW}⚠ Frontend not ready yet, continuing anyway...${NC}"
}
echo -e "${GREEN}✓ Frontend deployed${NC}"
echo ""

echo -e "${YELLOW}Step 6: Deploying Monitoring (Prometheus & Grafana)...${NC}"
kubectl apply -f k8s/monitoring/ -n ${NAMESPACE}
echo -e "${GREEN}✓ Monitoring deployed${NC}"
echo ""

echo -e "${BLUE}=== Deployment Summary ===${NC}"
echo ""

echo "📋 All Pods:"
kubectl get pods -n ${NAMESPACE}
echo ""

echo "📡 All Services:"
kubectl get svc -n ${NAMESPACE}
echo ""

echo "🌐 LoadBalancer URLs:"
echo ""

FRONTEND_LB=$(kubectl get svc frontend-service -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Pending...")
echo "Frontend: http://${FRONTEND_LB}"

PROMETHEUS_LB=$(kubectl get svc prometheus -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Pending...")
if [ "$PROMETHEUS_LB" != "Pending..." ]; then
    echo "Prometheus: http://${PROMETHEUS_LB}:9090"
fi

GRAFANA_LB=$(kubectl get svc grafana -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Pending...")
if [ "$GRAFANA_LB" != "Pending..." ]; then
    echo "Grafana: http://${GRAFANA_LB}:3000"
fi

echo ""
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Useful commands:"
echo "  kubectl get all -n ${NAMESPACE}"
echo "  kubectl logs -n ${NAMESPACE} -l app=backend"
echo "  kubectl logs -n ${NAMESPACE} -l app=frontend"
echo "  kubectl describe pod -n ${NAMESPACE} <pod-name>"
