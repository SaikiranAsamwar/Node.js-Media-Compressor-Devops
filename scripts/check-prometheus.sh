#!/bin/bash

# Prometheus Troubleshooting Script
# This script helps diagnose Prometheus installation and runtime issues

echo "=== Prometheus Troubleshooting Script ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "Please run as root (use sudo)"
   exit 1
fi

echo "1. Checking Prometheus installation..."
if [ -f /usr/local/bin/prometheus ]; then
    echo "✓ Prometheus binary found"
    /usr/local/bin/prometheus --version
else
    echo "✗ Prometheus binary not found"
fi

echo ""
echo "2. Checking configuration file..."
if [ -f /etc/prometheus/prometheus.yml ]; then
    echo "✓ Configuration file exists"
    echo "Validating configuration..."
    /usr/local/bin/promtool check config /etc/prometheus/prometheus.yml
else
    echo "✗ Configuration file not found"
fi

echo ""
echo "3. Checking directories and permissions..."
ls -la /etc/prometheus/ 2>/dev/null || echo "✗ /etc/prometheus/ not found"
ls -la /var/lib/prometheus/ 2>/dev/null || echo "✗ /var/lib/prometheus/ not found"

echo ""
echo "4. Checking Prometheus user..."
id prometheus 2>/dev/null && echo "✓ Prometheus user exists" || echo "✗ Prometheus user not found"

echo ""
echo "5. Checking systemd service..."
if [ -f /etc/systemd/system/prometheus.service ]; then
    echo "✓ Service file exists"
    systemctl status prometheus --no-pager
else
    echo "✗ Service file not found"
fi

echo ""
echo "6. Checking if Prometheus is listening..."
netstat -tlnp | grep 9090 || echo "✗ Prometheus not listening on port 9090"

echo ""
echo "7. Recent logs (last 20 lines)..."
journalctl -u prometheus -n 20 --no-pager

echo ""
echo "8. Checking disk space..."
df -h /var/lib/prometheus

echo ""
echo "9. Testing Prometheus API..."
curl -s http://localhost:9090/-/healthy && echo "✓ Prometheus is healthy" || echo "✗ Prometheus API not responding"

echo ""
echo "=== Common Fixes ==="
echo "If Prometheus is failing:"
echo "• Restart: systemctl restart prometheus"
echo "• Check logs: journalctl -u prometheus -f"
echo "• Validate config: promtool check config /etc/prometheus/prometheus.yml"
echo "• Fix permissions: chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus"
echo "• Clean corrupted data: rm -rf /var/lib/prometheus/wal && systemctl restart prometheus"
