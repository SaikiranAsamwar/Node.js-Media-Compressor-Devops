variable "aws_region" {
  default = "us-east-1"
}

variable "instance_type" {
  default = "t3.large"
}

variable "key_name" {
  description = "EC2 key pair name"
}

variable "your_ip" {
  description = "Your IP for SSH (x.x.x.x/32)"
}

variable "project_name" {
  default = "devops-server"
}
