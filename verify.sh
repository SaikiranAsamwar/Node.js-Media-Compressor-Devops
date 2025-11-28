#!/bin/bash
# Final Verification Script - Ensures all issues are resolved
# Run this to confirm everything is ready for deployment

set -e

echo "═══════════════════════════════════════════════════════"
echo "    FINAL VERIFICATION - Media Compressor Project"
echo "═══════════════════════════════════════════════════════"
echo ""

PASSED=0
FAILED=0

# Helper functions
pass() {
    echo "✓ $1"
    ((PASSED++))
}

fail() {
    echo "✗ $1"
    ((FAILED++))
}

# ===================================================
# 1. Terraform Validation
# ===================================================
echo "Checking Terraform Configuration..."

if [ -d "terraform" ]; then
    cd terraform
    
    if terraform init -backend=false > /dev/null 2>&1; then
        pass "Terraform initialized"
    else
        fail "Terraform initialization"
    fi
    
    if terraform validate > /dev/null 2>&1; then
        pass "Terraform validation"
    else
        fail "Terraform validation"
    fi
    
    # Check required files
    [ -f "providers.tf" ] && pass "providers.tf exists" || fail "providers.tf missing"
    [ -f "variables.tf" ] && pass "variables.tf exists" || fail "variables.tf missing"
    [ -f "terraform.tfvars" ] && pass "terraform.tfvars exists" || fail "terraform.tfvars missing"
    [ -f "data-sources.tf" ] && pass "data-sources.tf exists" || fail "data-sources.tf missing"
    [ -f "main.tf" ] && pass "main.tf exists" || fail "main.tf missing"
    [ -f "outputs.tf" ] && pass "outputs.tf exists" || fail "outputs.tf missing"
    
    cd ..
else
    fail "terraform directory missing"
fi

# ===================================================
# 2. Docker Files Validation
# ===================================================
echo ""
echo "Checking Docker Configuration..."

[ -f "backend/Dockerfile" ] && pass "Backend Dockerfile exists" || fail "Backend Dockerfile missing"
[ -f "frontend/Dockerfile" ] && pass "Frontend Dockerfile exists" || fail "Frontend Dockerfile missing"
[ -f "backend/package.json" ] && pass "Backend package.json exists" || fail "Backend package.json missing"
[ -f "frontend/index.html" ] && pass "Frontend index.html exists" || fail "Frontend index.html missing"

# ===================================================
# 3. Kubernetes Configuration
# ===================================================
echo ""
echo "Checking Kubernetes Configuration..."

[ -d "k8s" ] && pass "k8s directory exists" || fail "k8s directory missing"

if [ -d "k8s" ]; then
    [ -f "k8s/deploy-to-eks.sh" ] && pass "EKS deployment script exists" || fail "EKS deployment script missing"
    [ -f "k8s/backend-deployment.yaml" ] && pass "Backend deployment manifest exists" || fail "Backend deployment manifest missing"
    [ -f "k8s/frontend-deployment.yaml" ] && pass "Frontend deployment manifest exists" || fail "Frontend deployment manifest missing"
fi

# ===================================================
# 4. Ansible Configuration
# ===================================================
echo ""
echo "Checking Ansible Configuration..."

[ -d "ansible" ] && pass "ansible directory exists" || fail "ansible directory missing"

if [ -d "ansible" ]; then
    [ -f "ansible/inventory" ] && pass "Ansible inventory exists" || fail "Ansible inventory missing"
    [ -f "ansible/ansible.cfg" ] && pass "Ansible config exists" || fail "Ansible config missing"
    [ -f "ansible/site.yml" ] && pass "site.yml playbook exists" || fail "site.yml playbook missing"
    [ -f "ansible/deployment-playbook.yml" ] && pass "deployment-playbook.yml exists" || fail "deployment-playbook.yml missing"
    [ -f "ansible/monitoring-playbook.yml" ] && pass "monitoring-playbook.yml exists" || fail "monitoring-playbook.yml missing"
    
    # Check playbook syntax
    for playbook in ansible/*.yml; do
        if [ -f "$playbook" ]; then
            if ansible-playbook --syntax-check "$playbook" > /dev/null 2>&1; then
                pass "$(basename $playbook) syntax valid"
            else
                fail "$(basename $playbook) syntax invalid"
            fi
        fi
    done
fi

# ===================================================
# 5. Jenkins Configuration
# ===================================================
echo ""
echo "Checking Jenkins Configuration..."

[ -d "jenkins" ] && pass "jenkins directory exists" || fail "jenkins directory missing"
[ -f "jenkins/Jenkinsfile" ] && pass "Jenkinsfile exists" || fail "Jenkinsfile missing"

# ===================================================
# 6. Documentation
# ===================================================
echo ""
echo "Checking Documentation..."

[ -f "README.md" ] && pass "README.md exists" || fail "README.md missing"
[ -f "QUICK_FIX_GUIDE.md" ] && pass "QUICK_FIX_GUIDE.md exists" || fail "QUICK_FIX_GUIDE.md missing"
[ -f "ISSUES_FIXED_SUMMARY.md" ] && pass "ISSUES_FIXED_SUMMARY.md exists" || fail "ISSUES_FIXED_SUMMARY.md missing"

# ===================================================
# 7. Deployment Scripts
# ===================================================
echo ""
echo "Checking Deployment Scripts..."

[ -f "troubleshoot.sh" ] && pass "troubleshoot.sh exists" || fail "troubleshoot.sh missing"
[ -f "troubleshoot.ps1" ] && pass "troubleshoot.ps1 exists" || fail "troubleshoot.ps1 missing"
[ -f "deploy.bat" ] && pass "deploy.bat exists" || fail "deploy.bat missing"

# ===================================================
# 8. Git Configuration
# ===================================================
echo ""
echo "Checking Git Configuration..."

if [ -d ".git" ]; then
    pass "Git repository initialized"
    
    if git status > /dev/null 2>&1; then
        pass "Git status accessible"
    else
        fail "Git status check failed"
    fi
else
    fail "Git repository not initialized"
fi

# ===================================================
# 9. Prerequisites Check
# ===================================================
echo ""
echo "Checking Prerequisites..."

command -v terraform &> /dev/null && pass "terraform installed" || fail "terraform not installed"
command -v kubectl &> /dev/null && pass "kubectl installed" || fail "kubectl not installed"
command -v docker &> /dev/null && pass "docker installed" || fail "docker not installed"
command -v aws &> /dev/null && pass "aws CLI installed" || fail "aws CLI not installed"
command -v ansible &> /dev/null && pass "ansible installed" || fail "ansible not installed"
command -v git &> /dev/null && pass "git installed" || fail "git not installed"

# ===================================================
# 10. AWS Configuration
# ===================================================
echo ""
echo "Checking AWS Configuration..."

if aws sts get-caller-identity > /dev/null 2>&1; then
    pass "AWS credentials valid"
else
    fail "AWS credentials invalid - run: aws configure"
fi

# ===================================================
# Summary
# ===================================================
echo ""
echo "═══════════════════════════════════════════════════════"
echo "                    VERIFICATION SUMMARY"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "✓ Passed: $PASSED"
echo "✗ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL CHECKS PASSED - READY FOR DEPLOYMENT! 🎉"
    echo ""
    echo "Next steps:"
    echo "1. Set environment variables:"
    echo "   export AWS_REGION=us-west-2"
    echo "   export AWS_ACCOUNT_ID=514439471441"
    echo "   export CLUSTER_NAME=media-compressor-cluster"
    echo "   export IMAGE_PREFIX=saikiranasamwar4"
    echo ""
    echo "2. Deploy infrastructure:"
    echo "   cd terraform && terraform apply"
    echo ""
    echo "3. Deploy application:"
    echo "   cd ansible && ansible-playbook -i inventory site.yml"
    echo ""
    exit 0
else
    echo "⚠️  SOME CHECKS FAILED - PLEASE FIX ISSUES ABOVE"
    echo ""
    echo "Refer to:"
    echo "- README.md for complete deployment guide"
    echo "- QUICK_FIX_GUIDE.md for troubleshooting"
    echo "- ISSUES_FIXED_SUMMARY.md for issue details"
    echo ""
    exit 1
fi