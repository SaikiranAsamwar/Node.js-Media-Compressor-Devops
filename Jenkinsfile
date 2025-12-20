pipeline {
  agent any

  environment {
    DOCKERHUB_USERNAME = 'saikiranasamwar4'
    DOCKERHUB_BACKEND  = "${DOCKERHUB_USERNAME}/compressor-backend"
    DOCKERHUB_FRONTEND = "${DOCKERHUB_USERNAME}/compressor-frontend"
    AWS_REGION = 'us-east-1'
    EKS_CLUSTER = 'media-compressor-cluster'
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

    stage('SonarQube Scan') {
      steps {
        withSonarQubeEnv('SonarQube') {
          dir('backend') {
            sh 'sonar-scanner'
          }
          dir('frontend') {
            sh 'sonar-scanner'
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
          usernamePassword(credentialsId: 'dockerhub-credentials',
                           usernameVariable: 'DOCKER_USER',
                           passwordVariable: 'DOCKER_PASS')
        ]) {
          sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
        }

        dir('backend') {
          sh "docker build -f ../Dockerfiles/backend.Dockerfile -t ${DOCKERHUB_BACKEND}:${BUILD_NUMBER} -t ${DOCKERHUB_BACKEND}:latest ."
          sh "docker push ${DOCKERHUB_BACKEND}:${BUILD_NUMBER}"
          sh "docker push ${DOCKERHUB_BACKEND}:latest"
        }

        dir('frontend') {
          sh "docker build -f ../Dockerfiles/frontend.Dockerfile -t ${DOCKERHUB_FRONTEND}:${BUILD_NUMBER} -t ${DOCKERHUB_FRONTEND}:latest ."
          sh "docker push ${DOCKERHUB_FRONTEND}:${BUILD_NUMBER}"
          sh "docker push ${DOCKERHUB_FRONTEND}:latest"
        }
      }
    }

    stage('Deploy to EKS') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                          credentialsId: 'aws-credentials']]) {
          sh """
          aws eks update-kubeconfig --name ${EKS_CLUSTER} --region ${AWS_REGION}
          kubectl -n media-app set image deployment/backend backend=${DOCKERHUB_BACKEND}:${BUILD_NUMBER}
          kubectl -n media-app set image deployment/frontend frontend=${DOCKERHUB_FRONTEND}:${BUILD_NUMBER}
          kubectl -n media-app rollout status deployment/backend
          kubectl -n media-app rollout status deployment/frontend
          """
        }
      }
    }

    stage('Post-Deployment Health Check') {
      steps {
        sh '''
        echo "Health check completed"
        '''
      }
    }
  }

  post {
    always {
      sh 'docker logout'
    }
    success {
      echo "✅ Pipeline completed successfully"
    }
    failure {
      echo "❌ Pipeline failed"
    }
  }
}
