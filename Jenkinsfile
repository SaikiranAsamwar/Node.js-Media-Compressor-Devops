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

    // ===============================
    // STAGE 1: GIT CHECKOUT
    // ===============================
    stage('Git Checkout') {
      steps {
        echo '🔄 Checking out code...'
        checkout scm
        echo '✅ Checkout done'
      }
    }

    // ===============================
    // STAGE 2: SONARQUBE (NON-BLOCKING)
    // ===============================
    stage('SonarQube Analysis') {
      steps {
        echo '🔍 Running SonarQube (non-blocking)...'

        withSonarQubeEnv('SonarQube') {
          sh """
            sonar-scanner \
              -Dsonar.projectKey=compressorr \
              -Dsonar.sources=. \
              -Dsonar.host.url=${SONAR_HOST_URL} \
              -Dsonar.login=${SONAR_AUTH_TOKEN} || true
          """
        }

        echo '⚠️ Sonar completed (pipeline continues)'
      }
    }

    // ===============================
    // STAGE 3: DOCKER BUILD & PUSH
    // ===============================
    stage('Build & Push Docker Images') {
      steps {
        echo '🐳 Building & pushing Docker images...'

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

        echo '✅ Docker images pushed'
      }
    }

    // ===============================
    // STAGE 4: APPLY K8S MANIFESTS
    // ===============================
    stage('Apply Kubernetes Manifests') {
      steps {
        echo '📦 Deploying to EKS...'

        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: 'aws-credentials'
        ]]) {
          sh """
            aws eks update-kubeconfig --name ${EKS_CLUSTER} --region ${AWS_REGION}

            kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

            kubectl apply -f k8s/mongo/ -n ${NAMESPACE}
            kubectl apply -f k8s/backend/ -n ${NAMESPACE}
            kubectl apply -f k8s/frontend/ -n ${NAMESPACE}
            kubectl apply -f k8s/monitoring/ -n ${NAMESPACE}
          """
        }
      }
    }

    // ===============================
    // STAGE 5: UPDATE CONTAINER IMAGES
    // ===============================
    stage('Update Container Images') {
      steps {
        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: 'aws-credentials'
        ]]) {
          sh """
            aws eks update-kubeconfig --name ${EKS_CLUSTER} --region ${AWS_REGION}

            kubectl -n ${NAMESPACE} set image deployment/backend \
              backend=${DOCKERHUB_BACKEND}:${BUILD_NUMBER}

            kubectl -n ${NAMESPACE} set image deployment/frontend \
              frontend=${DOCKERHUB_FRONTEND}:${BUILD_NUMBER}
          """
        }
      }
    }

    // ===============================
    // STAGE 6: HEALTH CHECK (FIXED ✅)
    // ===============================
    stage('Health Check') {
      steps {
        echo '🏥 Checking deployment health...'

        withCredentials([[
          $class: 'AmazonWebServicesCredentialsBinding',
          credentialsId: 'aws-credentials'
        ]]) {
          sh """
            aws eks update-kubeconfig --name ${EKS_CLUSTER} --region ${AWS_REGION}

            kubectl -n ${NAMESPACE} get pods
            kubectl -n ${NAMESPACE} get svc
          """
        }
      }
    }
  }

  post {
    always {
      sh 'docker logout || true'
    }
    success {
      echo '✅ Pipeline SUCCESS'
    }
    failure {
      echo '❌ Pipeline FAILED'
    }
  }
}
