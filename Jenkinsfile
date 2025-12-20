pipeline {
  agent any   // Prefer a labeled agent like 'docker-eks' in production

  environment {
    DOCKERHUB_USERNAME = 'saikiranasamwar4'
    DOCKERHUB_BACKEND  = "${DOCKERHUB_USERNAME}/compressor-backend"
    DOCKERHUB_FRONTEND = "${DOCKERHUB_USERNAME}/compressor-frontend"
    AWS_REGION   = 'us-east-1'
    EKS_CLUSTER  = 'media-compressor-cluster'
    NAMESPACE    = 'media-app'
  }

  stages {

    stage('Checkout Code') {
      steps {
        checkout scm
      }
    }

    stage('Backend Build & Test') {
      steps {
        dir('backend') {
          sh 'npm ci'
          sh 'npm test'
        }
      }
    }

    stage('Frontend Build') {
      steps {
        dir('frontend') {
          sh 'npm ci'
          sh 'npm run build'
        }
      }
    }

    stage('SonarQube Scan - Backend') {
      steps {
        withSonarQubeEnv('SonarQube') {
          dir('backend') {
            sh '''
              sonar-scanner \
              -Dsonar.projectKey=compressorr-backend \
              -Dsonar.sources=.
            '''
          }
        }
      }
    }

    stage('SonarQube Scan - Frontend') {
      steps {
        withSonarQubeEnv('SonarQube') {
          dir('frontend') {
            sh '''
              sonar-scanner \
              -Dsonar.projectKey=compressorr-frontend \
              -Dsonar.sources=.
            '''
          }
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Build & Push Docker Images') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'dockerhub-credentials',
            usernameVariable: 'DOCKER_USER',
            passwordVariable: 'DOCKER_PASS'
          )
        ]) {
          sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
        }

        dir('backend') {
          sh """
            docker build -f ../Dockerfiles/backend.Dockerfile \
            -t ${DOCKERHUB_BACKEND}:${BUILD_NUMBER} \
            -t ${DOCKERHUB_BACKEND}:latest .
            docker push ${DOCKERHUB_BACKEND}:${BUILD_NUMBER}
            docker push ${DOCKERHUB_BACKEND}:latest
          """
        }

        dir('frontend') {
          sh """
            docker build -f ../Dockerfiles/frontend.Dockerfile \
            -t ${DOCKERHUB_FRONTEND}:${BUILD_NUMBER} \
            -t ${DOCKERHUB_FRONTEND}:latest .
            docker push ${DOCKERHUB_FRONTEND}:${BUILD_NUMBER}
            docker push ${DOCKERHUB_FRONTEND}:latest
          """
        }
      }
    }

    stage('Deploy to Amazon EKS') {
      steps {
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
      }
    }

    stage('Post-Deployment Health Check') {
      steps {
        sh '''
          echo "Checking Backend Health..."
          curl -f http://backend.media-app.svc.cluster.local:3000/api/health

          echo "Checking Frontend Service..."
          kubectl -n media-app get svc frontend
        '''
      }
    }
  }

  post {
    always {
      sh 'docker logout'
    }
    success {
      echo "✅ Pipeline executed successfully. Deployment is healthy."
    }
    failure {
      echo "❌ Pipeline failed. Check logs and SonarQube results."
    }
  }
}
