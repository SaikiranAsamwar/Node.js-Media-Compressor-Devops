@echo off
REM Media Compressor - Complete Deployment Script for Windows
REM This script automates the entire deployment process

setlocal enabledelayedexpansion

REM Colors for output
set GREEN=[92m
set RED=[91m
set YELLOW=[93m
set BLUE=[94m
set RESET=[0m

REM Configuration
set AWS_REGION=us-west-2
set AWS_ACCOUNT_ID=514439471441
set CLUSTER_NAME=media-compressor-cluster
set IMAGE_PREFIX=saikiranasamwar4
set IMAGE_TAG=v1

REM Set environment variables
set AWS_REGION=%AWS_REGION%
set AWS_ACCOUNT_ID=%AWS_ACCOUNT_ID%
set CLUSTER_NAME=%CLUSTER_NAME%
set IMAGE_PREFIX=%IMAGE_PREFIX%

echo.
echo =========================================================
echo   Media Compressor - Complete Deployment Script
echo =========================================================
echo.

REM =========================================================
REM 1. Prerequisite Checks
REM =========================================================
echo [*] Checking prerequisites...

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Git is not installed. Please install Git first.
    exit /b 1
)

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

where kubectl >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] kubectl is not installed. Please install kubectl first.
    exit /b 1
)

where terraform >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Terraform is not installed. Please install Terraform first.
    exit /b 1
)

where ansible >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Ansible is not installed. Please install Ansible first.
    exit /b 1
)

where aws >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] AWS CLI is not installed. Please install AWS CLI first.
    exit /b 1
)

echo [+] All prerequisites are installed

REM =========================================================
REM 2. Git Repository Setup
REM =========================================================
echo.
echo [*] Setting up Git repository...

if not exist .git (
    echo [+] Initializing git repository...
    call git init
    call git config user.email "deployment@media-compressor.local"
    call git config user.name "Media Compressor CI"
) else (
    echo [+] Git repository already initialized
)

echo [+] Git repository ready

REM =========================================================
REM 3. Docker Build
REM =========================================================
echo.
echo [*] Building Docker images...

echo [+] Checking Docker daemon...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Docker daemon is not running. Please start Docker Desktop.
    exit /b 1
)

echo [+] Cleaning Docker system...
docker system prune -f >nul 2>&1

echo [+] Building backend image...
docker build -t %IMAGE_PREFIX%/media-compressor-backend:%IMAGE_TAG% .\backend
if %errorlevel% neq 0 (
    echo [!] Backend build failed
    exit /b 1
)
echo [+] Backend image built successfully

echo [+] Building frontend image...
docker build -t %IMAGE_PREFIX%/media-compressor-frontend:%IMAGE_TAG% .\frontend
if %errorlevel% neq 0 (
    echo [!] Frontend build failed
    exit /b 1
)
echo [+] Frontend image built successfully

REM =========================================================
REM 4. Terraform Validation
REM =========================================================
echo.
echo [*] Validating Terraform configuration...

cd terraform

echo [+] Initializing Terraform...
call terraform init -upgrade
if %errorlevel% neq 0 (
    echo [!] Terraform initialization failed
    cd ..
    exit /b 1
)

echo [+] Validating Terraform...
call terraform validate
if %errorlevel% neq 0 (
    echo [!] Terraform validation failed
    cd ..
    exit /b 1
)
echo [+] Terraform configuration is valid

cd ..

REM =========================================================
REM 5. AWS Credentials Verification
REM =========================================================
echo.
echo [*] Verifying AWS credentials...

aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] AWS credentials are invalid. Please run: aws configure
    exit /b 1
)

for /f "tokens=2" %%i in ('aws sts get-caller-identity --query Account --output text') do set ACCOUNT_ID=%%i
echo [+] AWS Account ID: %ACCOUNT_ID%
echo [+] AWS credentials verified

REM =========================================================
REM 6. Deploy Infrastructure (Optional - User Prompt)
REM =========================================================
echo.
echo [*] Infrastructure deployment options:
echo.
echo Do you want to deploy infrastructure now? (y/n)
set /p DEPLOY_INFRA=">"

if /i "%DEPLOY_INFRA%"=="y" (
    echo.
    echo [+] Deploying infrastructure with Terraform...
    
    cd terraform
    
    echo [+] Planning deployment...
    terraform plan ^
        -var="cluster_name=%CLUSTER_NAME%" ^
        -var="region=%AWS_REGION%" ^
        -var="account_id=%AWS_ACCOUNT_ID%" ^
        -out=tfplan
    
    if %errorlevel% neq 0 (
        echo [!] Terraform plan failed
        cd ..
        exit /b 1
    )
    
    echo.
    echo Do you want to apply this plan? (y/n)
    set /p APPLY_PLAN=">"
    
    if /i "%APPLY_PLAN%"=="y" (
        terraform apply tfplan
        if %errorlevel% neq 0 (
            echo [!] Terraform apply failed
            cd ..
            exit /b 1
        )
        echo [+] Infrastructure deployed successfully
    ) else (
        echo [!] Infrastructure deployment skipped
    )
    
    cd ..
) else (
    echo [!] Infrastructure deployment skipped
)

REM =========================================================
REM 7. Push Docker Images to ECR
REM =========================================================
echo.
echo [*] Docker image push options:
echo.
echo Do you want to push images to ECR? (y/n)
set /p PUSH_IMAGES=">"

if /i "%PUSH_IMAGES%"=="y" (
    echo.
    echo [+] Logging in to ECR...
    
    for /f "tokens=*" %%i in ('aws ecr get-login-password --region %AWS_REGION%') do set ECR_PASSWORD=%%i
    echo !ECR_PASSWORD! | docker login --username AWS --password-stdin %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com
    
    if %errorlevel% neq 0 (
        echo [!] ECR login failed
        exit /b 1
    )
    
    echo [+] Tagging backend image...
    docker tag %IMAGE_PREFIX%/media-compressor-backend:%IMAGE_TAG% %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%IMAGE_PREFIX%/media-compressor-backend:%IMAGE_TAG%
    
    echo [+] Tagging frontend image...
    docker tag %IMAGE_PREFIX%/media-compressor-frontend:%IMAGE_TAG% %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%IMAGE_PREFIX%/media-compressor-frontend:%IMAGE_TAG%
    
    echo [+] Pushing backend image...
    docker push %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%IMAGE_PREFIX%/media-compressor-backend:%IMAGE_TAG%
    if %errorlevel% neq 0 (
        echo [!] Backend push failed
        exit /b 1
    )
    
    echo [+] Pushing frontend image...
    docker push %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%IMAGE_PREFIX%/media-compressor-frontend:%IMAGE_TAG%
    if %errorlevel% neq 0 (
        echo [!] Frontend push failed
        exit /b 1
    )
    
    echo [+] Images pushed to ECR successfully
) else (
    echo [!] Image push skipped
)

REM =========================================================
REM 8. Configure kubectl
REM =========================================================
echo.
echo [*] Configuring kubectl...

echo [+] Updating kubeconfig...
aws eks update-kubeconfig --region %AWS_REGION% --name %CLUSTER_NAME%
if %errorlevel% neq 0 (
    echo [!] kubectl configuration failed
    exit /b 1
)

echo [+] Testing kubectl connection...
kubectl cluster-info >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] kubectl connection failed
    exit /b 1
)

echo [+] kubectl configured successfully

REM =========================================================
REM 9. Deploy Application with Ansible
REM =========================================================
echo.
echo [*] Application deployment options:
echo.
echo Do you want to deploy the application now? (y/n)
set /p DEPLOY_APP=">"

if /i "%DEPLOY_APP%"=="y" (
    echo.
    echo [+] Deploying application with Ansible...
    
    cd ansible
    
    echo [+] Installing Ansible collections...
    call ansible-galaxy collection install kubernetes.core
    call ansible-galaxy collection install community.general
    
    echo [+] Running site playbook...
    call ansible-playbook -i inventory site.yml ^
        --extra-vars "image_tag=%IMAGE_TAG%" ^
        --extra-vars "backend_image=%AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%IMAGE_PREFIX%/media-compressor-backend" ^
        --extra-vars "frontend_image=%AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%IMAGE_PREFIX%/media-compressor-frontend"
    
    if %errorlevel% neq 0 (
        echo [!] Application deployment failed
        cd ..
        exit /b 1
    )
    
    echo [+] Application deployed successfully
    
    cd ..
) else (
    echo [!] Application deployment skipped
)

REM =========================================================
REM 10. Verification
REM =========================================================
echo.
echo [*] Verifying deployment...

echo [+] Checking application pods...
kubectl get pods -n media-compressor

echo [+] Checking monitoring pods...
kubectl get pods -n monitoring

echo [+] Checking services...
kubectl get svc -n media-compressor
kubectl get svc -n monitoring

REM =========================================================
REM 11. Summary
REM =========================================================
echo.
echo =========================================================
echo   Deployment Summary
echo =========================================================
echo.
echo [+] Configuration:
echo     - AWS Region: %AWS_REGION%
echo     - AWS Account ID: %AWS_ACCOUNT_ID%
echo     - Cluster Name: %CLUSTER_NAME%
echo     - Image Prefix: %IMAGE_PREFIX%
echo     - Image Tag: %IMAGE_TAG%
echo.
echo [+] Next steps:
echo     1. Monitor pods: kubectl get pods -w -n media-compressor
echo     2. Check logs: kubectl logs deployment/backend-deployment -n media-compressor
echo     3. Access Grafana: kubectl port-forward svc/grafana-service 3000:3000 -n monitoring
echo     4. Access Prometheus: kubectl port-forward svc/prometheus-service 9090:9090 -n monitoring
echo.
echo [+] Useful commands:
echo     - Scale backend: kubectl scale deployment backend-deployment --replicas=5 -n media-compressor
echo     - View all resources: kubectl get all -n media-compressor
echo     - Delete deployment: kubectl delete namespace media-compressor
echo.
echo =========================================================
echo   Deployment completed successfully!
echo =========================================================
echo.

pause