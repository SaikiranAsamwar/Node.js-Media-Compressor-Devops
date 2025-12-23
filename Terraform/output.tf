output "public_ip" {
  value = aws_eip.devops_eip.public_ip
}

output "jenkins_url" {
  value = "http://${aws_eip.devops_eip.public_ip}:8080"
}

output "sonarqube_url" {
  value = "http://${aws_eip.devops_eip.public_ip}:9000"
}

output "grafana_url" {
  value = "http://${aws_eip.devops_eip.public_ip}:3000"
}
