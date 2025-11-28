#!/bin/bash

# Media Compressor - Complete Troubleshooting & Setup Script
# This script will identify and fix all remaining issues

set -e

echo "=============================================="
echo "Media Compressor - Troubleshooting Script"
echo "=============================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_section() {
    echo ""
    echo "=============================================="
    echo "$1"
    echo "=============================================="
}

# ==========================================
# 1. Check Prerequisites
# ==========================================
print_section "1. CHECKING PREREQUISITES"

check_command() {
    if command -v $1 &> /dev/null; then
        print_status "$1 is installed"
        $1 --version | head -n1
    else
        print_error "$1 is not installed"
        return 1
    fi
}

# Check required commands
check_command "git" || true
check_command "docker" || true
check_command "kubectl" || true
check_command "terraform" || true
check_command "ansible" || true
check_command "aws" || true

# ==========================================
# 2. Fix Git Issues
# ==========================================
print_section "2. FIXING GIT ISSUES"

if [ -d ".git" ]; then
    print_status "Git repository found"
    
    # Check git status
    echo "Current git status:"
    git status --short || true
    
    # Clean git state
    echo ""
    echo "Cleaning git repository..."
    git add . || true
    git status || true
else
    print_warning "No git repository found. Initializing..."
    git init
    git config user.email "deployment@media-compressor.local"
    git config user.name "Media Compressor CI"
    git add .
    git commit -m "Initial commit: Media Compressor deployment infrastructure" || true
fi

# ==========================================
# 3. Fix Docker Build Issues
# ==========================================
print_section "3. FIXING DOCKER BUILD ISSUES"

# Check Docker daemon
if docker ps > /dev/null 2>&1; then
    print_status "Docker daemon is running"
else
    print_error "Docker daemon is not running"
    print_warning "Please start Docker daemon and try again"
    exit 1
fi

# Clean Docker environment
echo "Cleaning Docker system..."
docker system prune -f --volumes > /dev/null 2>&1 || true
print_status "Docker system cleaned"

# Check backend Dockerfile
if [ -f "backend/Dockerfile" ]; then
    print_status "Backend Dockerfile found"
    echo "Validating Dockerfile..."
    docker build --no-cache --dry-run -t test-backend:latest ./backend > /dev/null 2>&1 && \
        print_status "Backend Dockerfile is valid" || \
        print_error "Backend Dockerfile has errors"
else
    print_error "Backend Dockerfile not found"
fi

# Check frontend Dockerfile
if [ -f "frontend/Dockerfile" ]; then
    print_status "Frontend Dockerfile found"
    echo "Validating Dockerfile..."
    docker build --no-cache --dry-run -t test-frontend:latest ./frontend > /dev/null 2>&1 && \
        print_status "Frontend Dockerfile is valid" || \
        print_error "Frontend Dockerfile has errors"
else
    print_error "Frontend Dockerfile not found"
fi

# ==========================================
# 4. Fix Terraform Configuration
# ==========================================
print_section "4. FIXING TERRAFORM CONFIGURATION"

if [ -d "terraform" ]; then
    print_status "Terraform directory found"
    
    cd terraform
    
    # Initialize Terraform
    echo "Initializing Terraform..."
    terraform init > /dev/null 2>&1 && \
        print_status "Terraform initialized successfully" || \
        print_error "Terraform initialization failed"
    
    # Validate configuration
    echo "Validating Terraform configuration..."
    terraform validate > /dev/null 2>&1 && \
        print_status "Terraform configuration is valid" || \
        print_error "Terraform configuration has errors"
    
    # Format check
    echo "Checking Terraform format..."
    terraform fmt -check -recursive . > /dev/null 2>&1 && \
        print_status "Terraform format is correct" || \
        print_warning "Terraform formatting issues found - auto-fixing..."
    terraform fmt -recursive . > /dev/null 2>&1
    
    cd ..
else
    print_error "Terraform directory not found"
fi

# ==========================================
# 5. Fix Ansible Configuration
# ==========================================
print_section "5. CHECKING ANSIBLE CONFIGURATION"

if [ -d "ansible" ]; then
    print_status "Ansible directory found"
    
    # Check inventory
    if [ -f "ansible/inventory" ]; then
        print_status "Ansible inventory file found"
    else
        print_error "Ansible inventory file not found"
    fi
    
    # Check playbooks
    for playbook in ansible/*.yml; do
        if [ -f "$playbook" ]; then
            basename=$(basename "$playbook")
            echo "Checking playbook: $basename"
            ansible-playbook --syntax-check "$playbook" > /dev/null 2>&1 && \
                print_status "$basename syntax is valid" || \
                print_error "$basename has syntax errors"
        fi
    done
    
    # Check ansible.cfg
    if [ -f "ansible/ansible.cfg" ]; then
        print_status "Ansible configuration file found"
    else
        print_warning "Ansible configuration file not found"
    fi
else
    print_error "Ansible directory not found"
fi

# ==========================================
# 6. Fix Kubernetes Configuration
# ==========================================
print_section "6. CHECKING KUBERNETES CONFIGURATION"

if [ -d "k8s" ]; then
    print_status "Kubernetes directory found"
    
    # Check manifests
    manifest_count=$(find k8s -name "*.yaml" -o -name "*.yml" | wc -l)
    print_status "Found $manifest_count Kubernetes manifests"
    
    # Validate manifests
    for manifest in k8s/*.yaml k8s/*.yml; do
        if [ -f "$manifest" ]; then
            basename=$(basename "$manifest")
            kubectl apply -f "$manifest" --dry-run=client > /dev/null 2>&1 && \
                print_status "$basename is valid" || \
                print_error "$basename has errors"
        fi
    done 2>/dev/null || true
else
    print_error "Kubernetes directory not found"
fi

# ==========================================
# 7. Check Environment Configuration
# ==========================================
print_section "7. CHECKING ENVIRONMENT CONFIGURATION"

# Check AWS credentials
if [ -f ~/.aws/credentials ]; then
    print_status "AWS credentials file found"
    
    if aws sts get-caller-identity > /dev/null 2>&1; then
        print_status "AWS credentials are valid"
        aws sts get-caller-identity
    else
        print_error "AWS credentials are invalid or expired"
    fi
else
    print_warning "AWS credentials file not found"
    echo "Run: aws configure"
fi

# Check environment variables
echo ""
echo "Checking required environment variables:"

required_vars=("AWS_REGION" "AWS_ACCOUNT_ID" "CLUSTER_NAME" "IMAGE_PREFIX")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_warning "$var is not set"
        echo "  Run: export $var=value"
    else
        print_status "$var is set: ${!var}"
    fi
done

# ==========================================
# 8. Summary and Next Steps
# ==========================================
print_section "8. SUMMARY AND NEXT STEPS"

echo ""
echo "Troubleshooting complete!"
echo ""
echo "Next steps:"
echo "1. Set required environment variables:"
echo "   export AWS_REGION=us-west-2"
echo "   export AWS_ACCOUNT_ID=514439471441"
echo "   export CLUSTER_NAME=media-compressor-cluster"
echo "   export IMAGE_PREFIX=saikiranasamwar4"
echo ""
echo "2. Deploy infrastructure:"
echo "   cd terraform"
echo "   terraform plan"
echo "   terraform apply"
echo ""
echo "3. Build Docker images:"
echo "   docker build -t \${IMAGE_PREFIX}/media-compressor-backend:v1 ./backend"
echo "   docker build -t \${IMAGE_PREFIX}/media-compressor-frontend:v1 ./frontend"
echo ""
echo "4. Deploy application:"
echo "   cd ansible"
echo "   ansible-playbook -i inventory site.yml"
echo ""
echo "=============================================="
print_status "Troubleshooting script completed"
echo "=============================================="