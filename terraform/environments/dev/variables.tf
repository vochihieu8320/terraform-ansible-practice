# environments/dev/variables.tf — inputs for the dev environment.

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
  default = "t3.micro" # dev = small + cheap
}

variable "my_ip" {
  description = "CIDR allowed to SSH in. 0.0.0.0/0 = anywhere (ok for a short lab)."
  type        = string
  default     = "0.0.0.0/0"
}
