# ------------------------------------------------------------
# FRONTEND DOCKERFILE
# Serves static HTML/JS/CSS files with Nginx
# ------------------------------------------------------------

FROM nginx:stable-alpine

# Copy static frontend files to nginx directory
COPY . /usr/share/nginx/html

# Copy custom nginx configuration
COPY Dockerfiles/nginx.conf /etc/nginx/conf.d/default.conf



EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
