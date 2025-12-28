#!/bin/bash

# Frontend debugging script for Kubernetes deployment
# Helps diagnose nginx and file serving issues

echo "=== Frontend Debug Information ==="
echo ""

NAMESPACE="media-app"
APP_LABEL="app=frontend"

echo "1. Pod Status:"
kubectl get pods -n $NAMESPACE -l $APP_LABEL
echo ""

echo "2. Pod Logs (last 50 lines):"
POD_NAME=$(kubectl get pods -n $NAMESPACE -l $APP_LABEL -o jsonpath='{.items[0].metadata.name}')
if [ -n "$POD_NAME" ]; then
    echo "Pod: $POD_NAME"
    kubectl logs -n $NAMESPACE $POD_NAME --tail=50
else
    echo "No frontend pods found!"
fi
echo ""

echo "3. Exec into pod - Check nginx config:"
if [ -n "$POD_NAME" ]; then
    echo "Nginx configuration:"
    kubectl exec -n $NAMESPACE $POD_NAME -- cat /etc/nginx/conf.d/default.conf
    echo ""
    
    echo "4. Files in /usr/share/nginx/html:"
    kubectl exec -n $NAMESPACE $POD_NAME -- ls -la /usr/share/nginx/html/
    echo ""
    
    echo "5. Test nginx configuration:"
    kubectl exec -n $NAMESPACE $POD_NAME -- nginx -t
    echo ""
    
    echo "6. Check if index.html exists and has content:"
    kubectl exec -n $NAMESPACE $POD_NAME -- sh -c 'if [ -f /usr/share/nginx/html/index.html ]; then echo "✓ index.html exists"; head -5 /usr/share/nginx/html/index.html; else echo "✗ index.html NOT found"; fi'
    echo ""
fi

echo "7. Service Configuration:"
kubectl get svc frontend-service -n $NAMESPACE -o yaml
echo ""

echo "8. LoadBalancer URL:"
LB_URL=$(kubectl get svc frontend-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
if [ -z "$LB_URL" ]; then
    LB_URL=$(kubectl get svc frontend-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Not ready")
fi
echo "URL: http://${LB_URL}"
echo ""

if [ "$LB_URL" != "Not ready" ]; then
    echo "9. Testing LoadBalancer endpoints:"
    echo "Health check:"
    curl -v "http://${LB_URL}/health" 2>&1 | head -20
    echo ""
    
    echo "Homepage (first 10 lines):"
    curl -s "http://${LB_URL}/" | head -10
    echo ""
fi

echo "10. Describe pod for detailed info:"
kubectl describe pod -n $NAMESPACE -l $APP_LABEL | grep -A 10 "Events:"
echo ""

echo "=== Debug Complete ==="
echo ""
echo "Common Issues & Solutions:"
echo "- Default nginx page: Image not rebuilt or cached. Rebuild and push new image."
echo "- 404 errors: Files not copied correctly. Check Dockerfile COPY commands."
echo "- 502 Bad Gateway: Backend service not reachable. Check backend-service name."
echo "- Connection refused: Pod not ready. Check pod status and logs."
