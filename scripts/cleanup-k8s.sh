#!/bin/bash

# Delete all Kubernetes resources in the namespace
# WARNING: This will delete everything!

set -e

NAMESPACE="media-app"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}=== WARNING: Kubernetes Cleanup Script ===${NC}"
echo ""
echo -e "${YELLOW}This will DELETE ALL resources in the ${NAMESPACE} namespace!${NC}"
echo ""
echo "Resources to be deleted:"
kubectl get all -n ${NAMESPACE} 2>/dev/null || echo "No resources found or namespace doesn't exist"
echo ""

read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled"
    exit 0
fi

echo ""
echo -e "${YELLOW}Deleting resources...${NC}"

# Delete all resources in the namespace
kubectl delete -f k8s/monitoring/ -n ${NAMESPACE} --ignore-not-found=true
kubectl delete -f k8s/frontend/ -n ${NAMESPACE} --ignore-not-found=true
kubectl delete -f k8s/backend/ -n ${NAMESPACE} --ignore-not-found=true
kubectl delete -f k8s/mongo/ -n ${NAMESPACE} --ignore-not-found=true

# Wait a bit for resources to be deleted
sleep 5

# Check if any resources remain
echo ""
echo "Remaining resources:"
kubectl get all -n ${NAMESPACE} 2>/dev/null || echo "No resources remaining"

echo ""
read -p "Do you want to delete the namespace as well? (type 'yes' to confirm): " confirm_ns

if [ "$confirm_ns" == "yes" ]; then
    kubectl delete namespace ${NAMESPACE} --ignore-not-found=true
    echo -e "${GREEN}✓ Namespace deleted${NC}"
else
    echo "Namespace ${NAMESPACE} kept"
fi

echo ""
echo -e "${GREEN}=== Cleanup Complete ===${NC}"
