# Media Compressor - Complete Troubleshooting & Setup Script (PowerShell)
# Run this script to identify and fix all remaining issues

$ErrorActionPreference = "Continue"

# Color codes
$Success = @{ ForegroundColor = 'Green' }
$Error_Color = @{ ForegroundColor = 'Red' }
$Warning = @{ ForegroundColor = 'Yellow' }
$Info = @{ ForegroundColor = 'Cyan' }

function Print-Status { param([string]$message); Write-Host "✓ $message" @Success }
function Print-Error { param([string]$message); Write-Host "✗ $message" @Error_Color }
function Print-Warning { param([string]$message); Write-Host "⚠ $message" @Warning }
function Print-Section { param([string]$title); Write-Host "`n===========================================`n$title`n===========================================" @Info }

# ==========================================
# 1. Check Prerequisites
# ==========================================
Print-Section "1. CHECKING PREREQUISITES"

function Check-Command {
    param([string]$command)
    try {
        $result = & $command --version 2>$null
        if ($?) {
            Print-Status "$command is installed"
            Write-Host $result[0]
            return $true
        }
    } catch { }
    
    Print-Error "$command is not installed"
    return $false
}

Check-Command "git" | Out-Null
Check-Command "docker" | Out-Null
Check-Command "kubectl" | Out-Null
Check-Command "terraform" | Out-Null
Check-Command "ansible" | Out-Null
Check-Command "aws" | Out-Null

# ==========================================
# 2. Fix Git Issues
# ==========================================
Print-Section "2. FIXING GIT ISSUES"

if (Test-Path ".\.git") {
    Print-Status "Git repository found"
    
    Write-Host "Current git status:" @Info
    git status --short
    
    Write-Host "`nCleaning git repository..." @Info
    git add . 2>$null | Out-Null
    git status
} else {
    Print-Warning "No git repository found. Initializing..."
    git init
    git config user.email "deployment@media-compressor.local"
    git config user.name "Media Compressor CI"
    git add .
    git commit -m "Initial commit: Media Compressor deployment infrastructure" 2>$null | Out-Null
}

# ==========================================
# 3. Fix Docker Build Issues
# ==========================================
Print-Section "3. FIXING DOCKER BUILD ISSUES"

try {
    $dockerStatus = docker ps 2>$null
    Print-Status "Docker daemon is running"
} catch {
    Print-Error "Docker daemon is not running"
    Print-Warning "Please start Docker Desktop and try again"
    exit 1
}

Write-Host "Cleaning Docker system..." @Info
docker system prune -f --volumes 2>$null | Out-Null
Print-Status "Docker system cleaned"

# Check backend Dockerfile
if (Test-Path "backend\Dockerfile") {
    Print-Status "Backend Dockerfile found"
    Write-Host "Validating Dockerfile..." @Info
    try {
        docker build --no-cache --dry-run -t test-backend:latest ./backend 2>&1 | Out-Null
        Print-Status "Backend Dockerfile is valid"
    } catch {
        Print-Error "Backend Dockerfile has errors"
    }
} else {
    Print-Error "Backend Dockerfile not found"
}

# Check frontend Dockerfile
if (Test-Path "frontend\Dockerfile") {
    Print-Status "Frontend Dockerfile found"
    Write-Host "Validating Dockerfile..." @Info
    try {
        docker build --no-cache --dry-run -t test-frontend:latest ./frontend 2>&1 | Out-Null
        Print-Status "Frontend Dockerfile is valid"
    } catch {
        Print-Error "Frontend Dockerfile has errors"
    }
} else {
    Print-Error "Frontend Dockerfile not found"
}

# ==========================================
# 4. Fix Terraform Configuration
# ==========================================
Print-Section "4. FIXING TERRAFORM CONFIGURATION"

if (Test-Path "terraform") {
    Print-Status "Terraform directory found"
    
    Push-Location terraform
    
    Write-Host "Initializing Terraform..." @Info
    try {
        terraform init 2>&1 | Out-Null
        Print-Status "Terraform initialized successfully"
    } catch {
        Print-Error "Terraform initialization failed"
    }
    
    Write-Host "Validating Terraform configuration..." @Info
    try {
        terraform validate 2>&1 | Out-Null
        Print-Status "Terraform configuration is valid"
    } catch {
        Print-Error "Terraform configuration has errors"
    }
    
    Write-Host "Checking Terraform format..." @Info
    try {
        terraform fmt -check -recursive . 2>&1 | Out-Null
        Print-Status "Terraform format is correct"
    } catch {
        Print-Warning "Terraform formatting issues found - auto-fixing..."
        terraform fmt -recursive . 2>&1 | Out-Null
        Print-Status "Terraform formatting fixed"
    }
    
    Pop-Location
} else {
    Print-Error "Terraform directory not found"
}

# ==========================================
# 5. Fix Ansible Configuration
# ==========================================
Print-Section "5. CHECKING ANSIBLE CONFIGURATION"

if (Test-Path "ansible") {
    Print-Status "Ansible directory found"
    
    if (Test-Path "ansible\inventory") {
        Print-Status "Ansible inventory file found"
    } else {
        Print-Error "Ansible inventory file not found"
    }
    
    Write-Host "Checking playbooks..." @Info
    Get-ChildItem -Path "ansible" -Filter "*.yml" | ForEach-Object {
        $playbook = $_.FullName
        $basename = $_.Name
        try {
            ansible-playbook --syntax-check $playbook 2>&1 | Out-Null
            Print-Status "$basename syntax is valid"
        } catch {
            Print-Error "$basename has syntax errors"
        }
    }
    
    if (Test-Path "ansible\ansible.cfg") {
        Print-Status "Ansible configuration file found"
    } else {
        Print-Warning "Ansible configuration file not found"
    }
} else {
    Print-Error "Ansible directory not found"
}

# ==========================================
# 6. Fix Kubernetes Configuration
# ==========================================
Print-Section "6. CHECKING KUBERNETES CONFIGURATION"

if (Test-Path "k8s") {
    Print-Status "Kubernetes directory found"
    
    $manifestCount = (Get-ChildItem -Path "k8s" -Filter "*.yaml" -Recurse | Measure-Object).Count
    Print-Status "Found $manifestCount Kubernetes manifests"
    
    Write-Host "Validating manifests..." @Info
    Get-ChildItem -Path "k8s" -Filter "*.yaml" | ForEach-Object {
        $manifest = $_.FullName
        $basename = $_.Name
        try {
            kubectl apply -f $manifest --dry-run=client 2>&1 | Out-Null
            Print-Status "$basename is valid"
        } catch {
            Print-Error "$basename has errors"
        }
    }
} else {
    Print-Error "Kubernetes directory not found"
}

# ==========================================
# 7. Check Environment Configuration
# ==========================================
Print-Section "7. CHECKING ENVIRONMENT CONFIGURATION"

# Check AWS credentials
$awsCredsPath = "$env:USERPROFILE\.aws\credentials"
if (Test-Path $awsCredsPath) {
    Print-Status "AWS credentials file found"
    
    try {
        $identity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
        Print-Status "AWS credentials are valid"
        Write-Host "Account: $($identity.Account)" @Info
        Write-Host "User ARN: $($identity.Arn)" @Info
    } catch {
        Print-Error "AWS credentials are invalid or expired"
    }
} else {
    Print-Warning "AWS credentials file not found"
    Write-Host "Run: aws configure" @Warning
}

# Check environment variables
Write-Host "`nChecking required environment variables:" @Info

$requiredVars = @("AWS_REGION", "AWS_ACCOUNT_ID", "CLUSTER_NAME", "IMAGE_PREFIX")

foreach ($var in $requiredVars) {
    $value = [System.Environment]::GetEnvironmentVariable($var)
    if ([string]::IsNullOrEmpty($value)) {
        Print-Warning "$var is not set"
        Write-Host "  Run: `$env:$var = 'value'" @Warning
    } else {
        Print-Status "$var is set: $value"
    }
}

# ==========================================
# 8. Summary and Next Steps
# ==========================================
Print-Section "8. SUMMARY AND NEXT STEPS"

Write-Host "`nTroubleshooting complete!`n" @Success

Write-Host "Next steps:" @Info
Write-Host "1. Set required environment variables:" @Info
Write-Host '   $env:AWS_REGION = "us-west-2"'
Write-Host '   $env:AWS_ACCOUNT_ID = "514439471441"'
Write-Host '   $env:CLUSTER_NAME = "media-compressor-cluster"'
Write-Host '   $env:IMAGE_PREFIX = "saikiranasamwar4"'
Write-Host ""

Write-Host "2. Deploy infrastructure:" @Info
Write-Host "   cd terraform"
Write-Host "   terraform plan"
Write-Host "   terraform apply"
Write-Host ""

Write-Host "3. Build Docker images:" @Info
Write-Host '   docker build -t $env:IMAGE_PREFIX/media-compressor-backend:v1 ./backend'
Write-Host '   docker build -t $env:IMAGE_PREFIX/media-compressor-frontend:v1 ./frontend'
Write-Host ""

Write-Host "4. Deploy application:" @Info
Write-Host "   cd ansible"
Write-Host "   ansible-playbook -i inventory site.yml"
Write-Host ""

Print-Section "Troubleshooting script completed"