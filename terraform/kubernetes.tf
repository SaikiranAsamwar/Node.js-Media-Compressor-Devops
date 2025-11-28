# Deploy the application to EKS using Kubernetes provider
# This file requires the providers to be configured in providers.tf
# and the data source aws_eks_cluster_auth to be available in main.tf

resource "kubernetes_namespace" "media_compressor" {
  metadata {
    name = "media-compressor"

    labels = {
      name        = "media-compressor"
      environment = var.environment
    }
  }

  depends_on = [module.eks, data.aws_eks_cluster_auth.cluster]
}

# Kubernetes Secret for DocumentDB connection
resource "kubernetes_secret" "media_compressor_secrets" {
  metadata {
    name      = "media-compressor-secrets"
    namespace = kubernetes_namespace.media_compressor.metadata[0].name
  }

  data = {
    mongo-uri  = "mongodb://${var.documentdb_master_username}:${var.documentdb_master_password}@${aws_docdb_cluster.main.endpoint}:${aws_docdb_cluster.main.port}/compressor?ssl=true&retryWrites=false"
    jwt-secret = "your-super-secret-jwt-key-change-in-production"
  }

  type = "Opaque"
}

# Service Account for the application
resource "kubernetes_service_account" "media_compressor_sa" {
  metadata {
    name      = "media-compressor-sa"
    namespace = kubernetes_namespace.media_compressor.metadata[0].name
  }
}

# Backend Deployment
resource "kubernetes_deployment" "backend" {
  metadata {
    name      = "media-compressor-backend"
    namespace = kubernetes_namespace.media_compressor.metadata[0].name

    labels = {
      app = "media-compressor-backend"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "media-compressor-backend"
      }
    }

    template {
      metadata {
        labels = {
          app = "media-compressor-backend"
        }

        annotations = {
          "prometheus.io/scrape" = "true"
          "prometheus.io/port"   = "3000"
          "prometheus.io/path"   = "/metrics"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.media_compressor_sa.metadata[0].name

        container {
          image = "${aws_ecr_repository.backend.repository_url}:v1"
          name  = "backend"

          port {
            container_port = 3000
            protocol       = "TCP"
          }

          env {
            name  = "NODE_ENV"
            value = "production"
          }

          env {
            name  = "PORT"
            value = "3000"
          }

          env {
            name = "MONGO_URI"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.media_compressor_secrets.metadata[0].name
                key  = "mongo-uri"
              }
            }
          }

          env {
            name = "JWT_SECRET"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.media_compressor_secrets.metadata[0].name
                key  = "jwt-secret"
              }
            }
          }

          resources {
            requests = {
              memory = "512Mi"
              cpu    = "250m"
            }
            limits = {
              memory = "1Gi"
              cpu    = "500m"
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 3000
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/health"
              port = 3000
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }
        }
      }
    }
  }

  depends_on = [
    aws_docdb_cluster.main,
    aws_ecr_repository.backend
  ]
}

# Backend Service
resource "kubernetes_service" "backend" {
  metadata {
    name      = "backend-service"
    namespace = kubernetes_namespace.media_compressor.metadata[0].name
  }

  spec {
    selector = {
      app = kubernetes_deployment.backend.metadata[0].labels.app
    }

    port {
      port        = 3000
      target_port = 3000
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# Frontend Deployment
resource "kubernetes_deployment" "frontend" {
  metadata {
    name      = "media-compressor-frontend"
    namespace = kubernetes_namespace.media_compressor.metadata[0].name

    labels = {
      app = "media-compressor-frontend"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "media-compressor-frontend"
      }
    }

    template {
      metadata {
        labels = {
          app = "media-compressor-frontend"
        }
      }

      spec {
        container {
          image = "${aws_ecr_repository.frontend.repository_url}:v1"
          name  = "frontend"

          port {
            container_port = 80
            protocol       = "TCP"
          }

          resources {
            requests = {
              memory = "256Mi"
              cpu    = "100m"
            }
            limits = {
              memory = "512Mi"
              cpu    = "250m"
            }
          }

          liveness_probe {
            http_get {
              path = "/"
              port = 80
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/"
              port = 80
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }
        }
      }
    }
  }

  depends_on = [aws_ecr_repository.frontend]
}

# Frontend Service
resource "kubernetes_service" "frontend" {
  metadata {
    name      = "frontend-service"
    namespace = kubernetes_namespace.media_compressor.metadata[0].name
  }

  spec {
    selector = {
      app = kubernetes_deployment.frontend.metadata[0].labels.app
    }

    port {
      port        = 80
      target_port = 80
      protocol    = "TCP"
    }

    type = "LoadBalancer"
  }
}
