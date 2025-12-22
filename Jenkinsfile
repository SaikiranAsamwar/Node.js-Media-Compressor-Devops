pipeline {
  agent any

  environment {
    DOCKERHUB_USERNAME = 'saikiranasamwar4'
    DOCKERHUB_BACKEND  = "${DOCKERHUB_USERNAME}/compressor-backend"
    DOCKERHUB_FRONTEND = "${DOCKERHUB_USERNAME}/compressor-frontend"

    AWS_REGION  = 'us-east-1'
    EKS_CLUSTER = 'media-compressor-cluster'
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
    // STAGE 2: DOCKER - Build & Push to DockerHub
    // ============================================
    stage('Build & Push Docker Images') {
      steps {
        echo '🐳 Building and pushing Docker images...'
        
        // Login to DockerHub
        withCredentials([
          usernamePassword(
            credentialsId: 'dockerhub-credentials',
            usernameVariable: 'DOCKER_USER',
            passwordVariable: 'DOCKER_PASS'
          )
        ]) {
          sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
        }

        // Build and push backend image
        echo '📦 Building backend Docker image...'
        dir('backend') {
          sh """
            docker build -f ../Dockerfiles/backend.Dockerfile \
              -t ${DOCKERHUB_BACKEND}:${BUILD_NUMBER} \
              -t ${DOCKERHUB_BACKEND}:latest .
            docker push ${DOCKERHUB_BACKEND}:${BUILD_NUMBER}
            docker push ${DOCKERHUB_BACKEND}:latest
          """
        }
        echo '✅ Backend image pushed to DockerHub'

        // Build and push frontend image
        echo '📦 Building frontend Docker image...'
        dir('.') {
          sh """
            docker build -f Dockerfiles/frontend.Dockerfile \
              -t ${DOCKERHUB_FRONTEND}:${BUILD_NUMBER} \
              -t ${DOCKERHUB_FRONTEND}:latest .
            docker push ${DOCKERHUB_FRONTEND}:${BUILD_NUMBER}
            docker push ${DOCKERHUB_FRONTEND}:latest
          """
        }
        echo '✅ Frontend image pushed to DockerHub'
        echo '🎉 All Docker images built and pushed successfully'
      }
    }

  }

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
