# ------------------------------------------------------------
# FRONTEND DOCKERFILE FOR DOCKER COMPOSE
# Serves static HTML/JS/CSS files with Nginx
# ------------------------------------------------------------

FROM nginx:stable-alpine

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/default.conf && \
    rm -rf /usr/share/nginx/html/*

# Copy static frontend files to nginx directory
COPY frontend/*.html frontend/*.css frontend/*.js /usr/share/nginx/html/

# Copy Docker Compose specific nginx configuration
COPY frontend/nginx-docker.conf /etc/nginx/conf.d/default.conf

# Create health check endpoint and verify files
RUN echo "OK" > /usr/share/nginx/html/health && \
    ls -la /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
