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

    stage('Checkout Code') {
      steps {
        checkout scm
      }
    }

    stage('Backend Build') {
      steps {
        dir('backend') {
          sh 'npm ci'
          echo 'No backend tests configured. Skipping test step.'
        }
      }
    }

    stage('SonarQube Scan - Backend') {
      steps {
        withSonarQubeEnv('SonarQube') {
          dir('backend') {
            sh '''
              sonar-scanner \
              -Dsonar.projectKey=compressor-backend \
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

    stage('Build & Push Docker Images (Docker Hub)') {
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

        dir('.') {
          sh """
            docker build -f Dockerfiles/frontend.Dockerfile \
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
          kubectl -n media-app get pods
          kubectl -n media-app get svc
        '''
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
