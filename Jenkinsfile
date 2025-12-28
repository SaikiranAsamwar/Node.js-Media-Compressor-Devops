pipeline {
  agent any

  environment {
    DOCKERHUB_USERNAME = 'saikiranasamwar4'
    DOCKERHUB_BACKEND  = "${DOCKERHUB_USERNAME}/compressor-backend"
    DOCKERHUB_FRONTEND = "${DOCKERHUB_USERNAME}/compressor-frontend"

    AWS_REGION  = 'us-east-1'
    EKS_CLUSTER = 'compressorr-cluster'
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
    // STAGE 5: EKS DEPLOYMENT
    // ============================================
    stage('Deploy to Amazon EKS') {
      steps {
        echo '☸️ Deploying to Amazon EKS cluster...'

        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: 'aws-credentials'
        ]]) {
          sh """
            aws eks update-kubeconfig \
              --name ${EKS_CLUSTER} \
              --region ${AWS_REGION}

            kubectl -n ${NAMESPACE} set image deployment/backend \
              backend=${DOCKERHUB_BACKEND}:${BUILD_NUMBER}

            kubectl -n ${NAMESPACE} set image deployment/frontend \
              frontend=${DOCKERHUB_FRONTEND}:${BUILD_NUMBER}

            kubectl -n ${NAMESPACE} rollout status deployment/backend
            kubectl -n ${NAMESPACE} rollout status deployment/frontend
          """
        }

        echo '✅ Deployment completed'
      }
    }

    // ============================================
    // STAGE 6: HEALTH CHECK
    // ============================================
    stage('Post-Deployment Health Check') {
      steps {
        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: 'aws-credentials'
        ]]) {
          sh """
            kubectl -n ${NAMESPACE} get pods -l app=backend
            kubectl -n ${NAMESPACE} get pods -l app=frontend
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
