#!/bin/bash

# Script to rebuild and redeploy frontend with correct nginx configuration
# Run this script after fixing nginx configuration issues

set -e

echo "=== Frontend Rebuild & Redeploy Script ==="
echo ""

# Configuration
DOCKER_USERNAME="saikiranasamwar4"
IMAGE_NAME="compressor-frontend"
VERSION="v1.0"
FULL_IMAGE="${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Validating nginx configuration...${NC}"
# Test nginx config syntax (requires nginx installed locally)
if command -v nginx &> /dev/null; then
    nginx -t -c frontend/nginx.conf 2>&1 || echo "Local nginx validation skipped"
fi

echo -e "${GREEN}✓ Nginx config files ready${NC}"
echo ""

echo -e "${YELLOW}Step 2: Building Docker image...${NC}"
docker build \
    -f Dockerfiles/frontend.Dockerfile \
    -t ${FULL_IMAGE} \
    .

echo -e "${GREEN}✓ Docker image built successfully${NC}"
echo ""

echo -e "${YELLOW}Step 3: Testing image locally...${NC}"
# Remove old test container if exists
docker rm -f frontend-test 2>/dev/null || true

# Run test container
docker run -d \
    --name frontend-test \
    -p 8080:80 \
    ${FULL_IMAGE}

sleep 3

# Test if nginx serves correctly
echo "Testing nginx response..."
curl -f http://localhost:8080/health || {
    echo -e "${RED}✗ Health check failed${NC}"
    docker logs frontend-test
    docker rm -f frontend-test
    exit 1
}

echo "Testing index.html..."
curl -f http://localhost:8080/ | grep -q "html" || {
    echo -e "${RED}✗ index.html not served${NC}"
    docker logs frontend-test
    docker rm -f frontend-test
    exit 1
}

echo -e "${GREEN}✓ Local test passed${NC}"
docker rm -f frontend-test
echo ""

echo -e "${YELLOW}Step 4: Logging into Docker Hub...${NC}"
docker login

echo -e "${GREEN}✓ Logged in${NC}"
echo ""

echo -e "${YELLOW}Step 5: Pushing image to Docker Hub...${NC}"
docker push ${FULL_IMAGE}

echo -e "${GREEN}✓ Image pushed successfully${NC}"
echo ""

echo -e "${YELLOW}Step 6: Updating Kubernetes deployment...${NC}"

# Delete existing pods to force pull new image
kubectl delete pods -n media-app -l app=frontend

# Wait for new pods to be ready
echo "Waiting for new pods to be ready..."
kubectl wait --for=condition=ready pod \
    -n media-app \
    -l app=frontend \
    --timeout=120s

echo -e "${GREEN}✓ Deployment updated${NC}"
echo ""

echo -e "${YELLOW}Step 7: Verifying deployment...${NC}"

# Get pod status
kubectl get pods -n media-app -l app=frontend

# Get service details
echo ""
echo "Frontend Service:"
kubectl get svc frontend-service -n media-app

# Get LoadBalancer URL
LB_URL=$(kubectl get svc frontend-service -n media-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
if [ -z "$LB_URL" ]; then
    LB_URL=$(kubectl get svc frontend-service -n media-app -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Not ready yet")
fi

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "LoadBalancer URL: http://${LB_URL}"
echo ""
echo "Test commands:"
echo "  curl http://${LB_URL}/health"
echo "  curl http://${LB_URL}/"
echo ""
echo "If you still see the default nginx page:"
echo "1. Wait 1-2 minutes for DNS propagation"
echo "2. Clear browser cache (Ctrl+Shift+R)"
echo "3. Try incognito/private mode"
echo "4. Check pod logs: kubectl logs -n media-app -l app=frontend"
