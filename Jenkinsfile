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
    // STAGE 3: SONARQUBE - Quality Gate Check
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
    // STAGE 4: DOCKER - Build & Push to DockerHub
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

    // ============================================
    // STAGE 5: EKS DEPLOYMENT - Deploy to Amazon EKS
    // ============================================
    stage('Deploy to Amazon EKS') {
      steps {
        echo '☸️ Deploying to Amazon EKS cluster...'
        
        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: 'aws-credentials'
        ]]) {
          sh """
            # Update kubeconfig for EKS cluster
            aws eks update-kubeconfig \
              --name ${EKS_CLUSTER} \
              --region ${AWS_REGION}

            # Update backend deployment with new image
            kubectl -n ${NAMESPACE} set image deployment/backend \
              backend=${DOCKERHUB_BACKEND}:${BUILD_NUMBER}

            # Update frontend deployment with new image
            kubectl -n ${NAMESPACE} set image deployment/frontend \
              frontend=${DOCKERHUB_FRONTEND}:${BUILD_NUMBER}

            # Wait for rollout to complete
            kubectl -n ${NAMESPACE} rollout status deployment/backend
            kubectl -n ${NAMESPACE} rollout status deployment/frontend
          """
        }
        
        echo '✅ Deployment to EKS completed successfully'
      }
    }

    // ============================================
    // STAGE 6: HEALTH CHECK - Verify Deployment
    // ============================================
   stages {
        stage('Post-Deployment Health Check') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials'
                ]]) {
                    sh '''
                      kubectl -n media-app get pods -l app=backend
                      kubectl -n media-app get pods -l app=frontend
                    '''
                }
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
}
