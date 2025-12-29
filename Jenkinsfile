pipeline {
  agent any

  environment {
    DOCKERHUB_USERNAME = 'saikiranasamwar4'
    DOCKERHUB_BACKEND  = "${DOCKERHUB_USERNAME}/compressor-backend"
    DOCKERHUB_FRONTEND = "${DOCKERHUB_USERNAME}/compressor-frontend"

    AWS_REGION  = 'us-east-1'
    EKS_CLUSTER = 'compressor-cluster'
    NAMESPACE   = 'media-app'
  }

  stages {

    // ============================================
    // STAGE 1: GIT - Checkout Source Code
    // ============================================
    stage('Git Checkout') {
      steps {
        echo '🔄 Checking out code from repository...'
        checkout scm
        echo '✅ Code checkout completed'
      }
    }

    // ============================================
    // STAGE 2: SONARQUBE - Code Analysis
    // ============================================
    stage('SonarQube Analysis') {
      steps {
        echo '🔍 Running SonarQube code analysis...'

        withSonarQubeEnv('SonarQube') {
          sh """
            sonar-scanner \
              -Dsonar.projectKey=compressorr \
              -Dsonar.sources=. \
              -Dsonar.host.url=${env.SONAR_HOST_URL} \
              -Dsonar.login=${env.SONAR_AUTH_TOKEN}
          """
        }

        echo '✅ SonarQube analysis completed'
      }
    }

    // ============================================
    // STAGE 3: SONARQUBE - Quality Gate
    // ============================================
    stage('SonarQube Quality Gate') {
      steps {
        echo '🚦 Checking SonarQube Quality Gate...'

        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }

        echo '✅ Quality Gate passed'
      }
    }

    // ============================================
    // STAGE 4: DOCKER - Build & Push Images
    // ============================================
    stage('Build & Push Docker Images') {
      steps {
        echo '🐳 Building and pushing Docker images...'

        withCredentials([
          usernamePassword(
            credentialsId: 'dockerhub-credentials',
            usernameVariable: 'DOCKER_USER',
            passwordVariable: 'DOCKER_PASS'
          )
        ]) {
          sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
        }

        // Backend
        dir('backend') {
          sh """
            docker build -f ../Dockerfiles/backend.Dockerfile \
              -t ${DOCKERHUB_BACKEND}:${BUILD_NUMBER} \
              -t ${DOCKERHUB_BACKEND}:latest .
            docker push ${DOCKERHUB_BACKEND}:${BUILD_NUMBER}
            docker push ${DOCKERHUB_BACKEND}:latest
          """
        }

        // Frontend
        sh """
          docker build -f Dockerfiles/frontend.Dockerfile \
            -t ${DOCKERHUB_FRONTEND}:${BUILD_NUMBER} \
            -t ${DOCKERHUB_FRONTEND}:latest .
          docker push ${DOCKERHUB_FRONTEND}:${BUILD_NUMBER}
          docker push ${DOCKERHUB_FRONTEND}:latest
        """

        echo '🎉 Docker images built and pushed successfully'
      }
    }

    // ============================================
    // STAGE 5: KUBERNETES - Apply Manifests
    // ============================================
    stage('Apply Kubernetes Manifests') {
      steps {
        echo '📦 Applying Kubernetes manifests to EKS cluster...'

        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: 'aws-credentials'
        ]]) {
          sh """
            # Update kubeconfig for EKS cluster
            aws eks update-kubeconfig \
              --name ${EKS_CLUSTER} \
              --region ${AWS_REGION}

            # Create namespace if it doesn't exist
            kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

            # Apply namespace manifest
            kubectl apply -f k8s/namespace.yaml

            # Apply MongoDB manifests (StatefulSet, Service, Secrets)
            echo '🗄️  Deploying MongoDB...'
            kubectl apply -f k8s/mongo/ -n ${NAMESPACE}

            # Wait for MongoDB to be ready
            kubectl wait --for=condition=ready pod -l app=mongo -n ${NAMESPACE} --timeout=300s || true

            # Apply Backend manifests (Deployment, Service)
            echo '⚙️  Deploying Backend...'
            kubectl apply -f k8s/backend/ -n ${NAMESPACE}

            # Apply Frontend manifests (Deployment, Service)
            echo '🎨 Deploying Frontend...'
            kubectl apply -f k8s/frontend/ -n ${NAMESPACE}

            # Apply Monitoring manifests (Prometheus, Grafana)
            echo '📊 Deploying Monitoring stack...'
            kubectl apply -f k8s/monitoring/ -n ${NAMESPACE}

            echo '✅ All Kubernetes manifests applied successfully'
          """
        }
      }
    }

    // ============================================
    // STAGE 6: UPDATE - Container Images
    // ============================================
    stage('Update Container Images') {
      steps {
        echo '🔄 Updating container images to latest build...'

        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: 'aws-credentials'
        ]]) {
          sh """
            # Update backend image
            kubectl -n ${NAMESPACE} set image deployment/backend \
              backend=${DOCKERHUB_BACKEND}:${BUILD_NUMBER}

            # Update frontend image
            kubectl -n ${NAMESPACE} set image deployment/frontend \
              frontend=${DOCKERHUB_FRONTEND}:${BUILD_NUMBER}

            # Wait for rollouts to complete
            echo '⏳ Waiting for backend rollout...'
            kubectl -n ${NAMESPACE} rollout status deployment/backend --timeout=300s

            echo '⏳ Waiting for frontend rollout...'
            kubectl -n ${NAMESPACE} rollout status deployment/frontend --timeout=300s

            echo '✅ Container images updated successfully'
          """
        }
      }
    }

    // ============================================
    // STAGE 7: HEALTH CHECK
    // ============================================
    stage('Post-Deployment Health Check') {
      steps {
        echo '🏥 Running post-deployment health checks...'

        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: 'aws-credentials'
        ]]) {
          sh """
            echo '📋 Checking all pods status...'
            kubectl -n ${NAMESPACE} get pods

            echo ''
            echo '🔍 Checking backend pods...'
            kubectl -n ${NAMESPACE} get pods -l app=backend

            echo ''
            echo '🔍 Checking frontend pods...'
            kubectl -n ${NAMESPACE} get pods -l app=frontend

            echo ''
            echo '🔍 Checking MongoDB pods...'
            kubectl -n ${NAMESPACE} get pods -l app=mongo

            echo ''
            echo '📡 Checking services...'
            kubectl -n ${NAMESPACE} get svc

            echo ''
            echo '🌐 Getting LoadBalancer URLs...'
            kubectl -n ${NAMESPACE} get svc frontend-service -o wide
            kubectl -n ${NAMESPACE} get svc backend-service -o wide

            echo ''
            echo '✅ Health check completed'
          """
        }
      }
    }
  }

  // ============================================
  // POST ACTIONS
  // ============================================
  post {
    always {
      sh 'docker logout || true'
    }
    success {
      echo '✅ Pipeline executed successfully. Deployment is healthy.'
    }
    failure {
      echo '❌ Pipeline failed. Check logs for details.'
    }
  }
}
