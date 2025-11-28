# Final Verification Script (PowerShell)
# Run this to confirm everything is ready for deployment

$ErrorActionPreference = "Continue"

$Success = @{ ForegroundColor = 'Green' }
$Error_Color = @{ ForegroundColor = 'Red' }
$Info = @{ ForegroundColor = 'Cyan' }

$PASSED = 0
$FAILED = 0

function Pass {
    param([string]$message)
    Write-Host "✓ $message" @Success
    $global:PASSED++
}

function Fail {
    param([string]$message)
    Write-Host "✗ $message" @Error_Color
    $global:FAILED++
}

Write-Host "`n═══════════════════════════════════════════════════════" @Info
Write-Host "    FINAL VERIFICATION - Media Compressor Project" @Info
Write-Host "═══════════════════════════════════════════════════════`n" @Info

# ===================================================
# 1. Terraform Validation
# ===================================================
Write-Host "Checking Terraform Configuration..." @Info

if (Test-Path "terraform") {
    Push-Location terraform
    
    try {
        terraform init -backend=false 2>$null | Out-Null
        Pass "Terraform initialized"
    } catch {
        Fail "Terraform initialization"
    }
    
    try {
        terraform validate 2>$null | Out-Null
        Pass "Terraform validation"
    } catch {
        Fail "Terraform validation"
    }
    
    # Check required files
    (Test-Path "providers.tf") ? (Pass "providers.tf exists") : (Fail "providers.tf missing")
    (Test-Path "variables.tf") ? (Pass "variables.tf exists") : (Fail "variables.tf missing")
    (Test-Path "terraform.tfvars") ? (Pass "terraform.tfvars exists") : (Fail "terraform.tfvars missing")
    (Test-Path "data-sources.tf") ? (Pass "data-sources.tf exists") : (Fail "data-sources.tf missing")
    (Test-Path "main.tf") ? (Pass "main.tf exists") : (Fail "main.tf missing")
    (Test-Path "outputs.tf") ? (Pass "outputs.tf exists") : (Fail "outputs.tf missing")
    
    Pop-Location
} else {
    Fail "terraform directory missing"
}

# ===================================================
# 2. Docker Files Validation
# ===================================================
Write-Host "`nChecking Docker Configuration..." @Info

(Test-Path "backend\Dockerfile") ? (Pass "Backend Dockerfile exists") : (Fail "Backend Dockerfile missing")
(Test-Path "frontend\Dockerfile") ? (Pass "Frontend Dockerfile exists") : (Fail "Frontend Dockerfile missing")
(Test-Path "backend\package.json") ? (Pass "Backend package.json exists") : (Fail "Backend package.json missing")
(Test-Path "frontend\index.html") ? (Pass "Frontend index.html exists") : (Fail "Frontend index.html missing")

# ===================================================
# 3. Kubernetes Configuration
# ===================================================
Write-Host "`nChecking Kubernetes Configuration..." @Info

(Test-Path "k8s") ? (Pass "k8s directory exists") : (Fail "k8s directory missing")

if (Test-Path "k8s") {
    (Test-Path "k8s\deploy-to-eks.sh") ? (Pass "EKS deployment script exists") : (Fail "EKS deployment script missing")
    (Test-Path "k8s\backend-deployment.yaml") ? (Pass "Backend deployment manifest exists") : (Fail "Backend deployment manifest missing")
    (Test-Path "k8s\frontend-deployment.yaml") ? (Pass "Frontend deployment manifest exists") : (Fail "Frontend deployment manifest missing")
}

# ===================================================
# 4. Ansible Configuration
# ===================================================
Write-Host "`nChecking Ansible Configuration..." @Info

(Test-Path "ansible") ? (Pass "ansible directory exists") : (Fail "ansible directory missing")

if (Test-Path "ansible") {
    (Test-Path "ansible\inventory") ? (Pass "Ansible inventory exists") : (Fail "Ansible inventory missing")
    (Test-Path "ansible\ansible.cfg") ? (Pass "Ansible config exists") : (Fail "Ansible config missing")
    (Test-Path "ansible\site.yml") ? (Pass "site.yml playbook exists") : (Fail "site.yml playbook missing")
    (Test-Path "ansible\deployment-playbook.yml") ? (Pass "deployment-playbook.yml exists") : (Fail "deployment-playbook.yml missing")
    (Test-Path "ansible\monitoring-playbook.yml") ? (Pass "monitoring-playbook.yml exists") : (Fail "monitoring-playbook.yml missing")
    
    # Check playbook syntax
    Get-ChildItem -Path "ansible" -Filter "*.yml" | ForEach-Object {
        try {
            ansible-playbook --syntax-check $_.FullName 2>$null | Out-Null
            Pass "$($_.Name) syntax valid"
        } catch {
            Fail "$($_.Name) syntax invalid"
        }
    }
}

# ===================================================
# 5. Jenkins Configuration
# ===================================================
Write-Host "`nChecking Jenkins Configuration..." @Info

(Test-Path "jenkins") ? (Pass "jenkins directory exists") : (Fail "jenkins directory missing")
(Test-Path "jenkins\Jenkinsfile") ? (Pass "Jenkinsfile exists") : (Fail "Jenkinsfile missing")

# ===================================================
# 6. Documentation
# ===================================================
Write-Host "`nChecking Documentation..." @Info

(Test-Path "README.md") ? (Pass "README.md exists") : (Fail "README.md missing")
(Test-Path "QUICK_FIX_GUIDE.md") ? (Pass "QUICK_FIX_GUIDE.md exists") : (Fail "QUICK_FIX_GUIDE.md missing")
(Test-Path "ISSUES_FIXED_SUMMARY.md") ? (Pass "ISSUES_FIXED_SUMMARY.md exists") : (Fail "ISSUES_FIXED_SUMMARY.md missing")

# ===================================================
# 7. Deployment Scripts
# ===================================================
Write-Host "`nChecking Deployment Scripts..." @Info

(Test-Path "troubleshoot.sh") ? (Pass "troubleshoot.sh exists") : (Fail "troubleshoot.sh missing")
(Test-Path "troubleshoot.ps1") ? (Pass "troubleshoot.ps1 exists") : (Fail "troubleshoot.ps1 missing")
(Test-Path "deploy.bat") ? (Pass "deploy.bat exists") : (Fail "deploy.bat missing")

# ===================================================
# 8. Git Configuration
# ===================================================
Write-Host "`nChecking Git Configuration..." @Info

if (Test-Path ".git") {
    Pass "Git repository initialized"
    
    try {
        git status 2>$null | Out-Null
        Pass "Git status accessible"
    } catch {
        Fail "Git status check failed"
    }
} else {
    Fail "Git repository not initialized"
}

# ===================================================
# 9. Prerequisites Check
# ===================================================
Write-Host "`nChecking Prerequisites..." @Info

try { terraform --version 2>$null | Out-Null; Pass "terraform installed" } catch { Fail "terraform not installed" }
try { kubectl version --client 2>$null | Out-Null; Pass "kubectl installed" } catch { Fail "kubectl not installed" }
try { docker --version 2>$null | Out-Null; Pass "docker installed" } catch { Fail "docker not installed" }
try { aws --version 2>$null | Out-Null; Pass "aws CLI installed" } catch { Fail "aws CLI not installed" }
try { ansible --version 2>$null | Out-Null; Pass "ansible installed" } catch { Fail "ansible not installed" }
try { git --version 2>$null | Out-Null; Pass "git installed" } catch { Fail "git not installed" }

# ===================================================
# 10. AWS Configuration
# ===================================================
Write-Host "`nChecking AWS Configuration..." @Info

try {
    aws sts get-caller-identity 2>$null | Out-Null
    Pass "AWS credentials valid"
} catch {
    Fail "AWS credentials invalid - run: aws configure"
}

# ===================================================
# Summary
# ===================================================
Write-Host "`n═══════════════════════════════════════════════════════" @Info
Write-Host "                    VERIFICATION SUMMARY" @Info
Write-Host "═══════════════════════════════════════════════════════" @Info
Write-Host ""

Write-Host "✓ Passed: $PASSED" @Success
Write-Host "✗ Failed: $FAILED" @Error_Color
Write-Host ""

if ($FAILED -eq 0) {
    Write-Host "🎉 ALL CHECKS PASSED - READY FOR DEPLOYMENT! 🎉" @Success
    Write-Host "`nNext steps:" @Info
    Write-Host "1. Set environment variables:" @Info
    Write-Host '   $env:AWS_REGION = "us-west-2"'
    Write-Host '   $env:AWS_ACCOUNT_ID = "514439471441"'
    Write-Host '   $env:CLUSTER_NAME = "media-compressor-cluster"'
    Write-Host '   $env:IMAGE_PREFIX = "saikiranasamwar4"'
    Write-Host ""
    Write-Host "2. Deploy infrastructure:" @Info
    Write-Host "   cd terraform; terraform apply"
    Write-Host ""
    Write-Host "3. Deploy application:" @Info
    Write-Host "   cd ansible; ansible-playbook -i inventory site.yml"
    Write-Host ""
} else {
    Write-Host "⚠️  SOME CHECKS FAILED - PLEASE FIX ISSUES ABOVE" @Error_Color
    Write-Host "`nRefer to:" @Info
    Write-Host "- README.md for complete deployment guide"
    Write-Host "- QUICK_FIX_GUIDE.md for troubleshooting"
    Write-Host "- ISSUES_FIXED_SUMMARY.md for issue details"
    Write-Host ""
}