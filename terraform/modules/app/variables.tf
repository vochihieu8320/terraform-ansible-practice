# modules/app/variables.tf — the inputs the module needs. The environment
# folders supply these. Note there's no region/credentials here: those belong
# to the provider, which the environment configures.

variable "environment" {
  description = "Environment name (dev / prod) — stamped on resource names + tags"
  type        = string
}

variable "project" {
  description = "Project name for tagging"
  type        = string
  default     = "otel-demo"
}

variable "instance_type" {
  description = "EC2 size"
  type        = string
}

variable "my_ip" {
  description = "Your public IP in CIDR form; only this IP may SSH in"
  type        = string
}

variable "public_key_path" {
  description = "Path to your local SSH public key"
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}
