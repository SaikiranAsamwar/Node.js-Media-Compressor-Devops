#!/bin/bash

# Kubernetes Rollback Script
# Use this to rollback deployments to previous versions

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="media-app"

echo -e "${BLUE}=== Kubernetes Rollback Script ===${NC}"
echo ""

# Function to rollback a deployment
rollback_deployment() {
    local deployment=$1
    echo -e "${YELLOW}Rolling back ${deployment}...${NC}"
    
    kubectl rollout undo deployment/${deployment} -n ${NAMESPACE}
    
    echo "Waiting for rollback to complete..."
    kubectl rollout status deployment/${deployment} -n ${NAMESPACE} --timeout=300s
    
    echo -e "${GREEN}✓ ${deployment} rolled back successfully${NC}"
}

# Show current deployments and their revisions
echo "Current deployments and revisions:"
echo ""
kubectl rollout history deployment/backend -n ${NAMESPACE}
echo ""
kubectl rollout history deployment/frontend -n ${NAMESPACE}
echo ""

# Ask user what to rollback
echo "What would you like to rollback?"
echo "1) Backend only"
echo "2) Frontend only"
echo "3) Both Backend and Frontend"
echo "4) Cancel"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        rollback_deployment "backend"
        ;;
    2)
        rollback_deployment "frontend"
        ;;
    3)
        rollback_deployment "backend"
        rollback_deployment "frontend"
        ;;
    4)
        echo "Rollback cancelled"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=== Rollback Complete ===${NC}"
echo ""
echo "Current pod status:"
kubectl get pods -n ${NAMESPACE}
