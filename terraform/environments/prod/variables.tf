# environments/prod/variables.tf — inputs for the prod environment.

variable "region" {
  type    = string
  default = "ap-southeast-1"
}

variable "aws_access_key" {
  description = "AWS access key id — set in gitignored terraform.tfvars"
  type        = string
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS secret access key — set in gitignored terraform.tfvars"
  type        = string
  sensitive   = true
}

variable "instance_type" {
  type    = string
  default = "t3.large" # prod = bigger
}

variable "my_ip" {
  description = "Your public IP in CIDR form; only this IP may SSH in"
  type        = string
}
