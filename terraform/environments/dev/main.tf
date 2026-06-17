# environments/dev/main.tf — the DEV environment. This folder has its OWN
# state, so applying here can never touch prod. It does two jobs:
#   1. configure the AWS provider (region + WHICH credentials to use)
#   2. call the shared module with dev-specific values.

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # STATE: where dev's state lives. Local file for the lab. In a real team you'd
  # uncomment the S3 backend so each environment has isolated, locked, remote
  # state (note the per-env `key`):
  #
  # backend "s3" {
  #   bucket = "my-tf-state"
  #   key    = "otel-demo/dev/terraform.tfstate"   # <-- dev's own state path
  #   region = "ap-southeast-1"
  # }
}

# CREDENTIALS come from variables set in terraform.tfvars — which is GITIGNORED,
# so the real keys never get committed/pushed. The .tf files stay secret-free.
provider "aws" {
  region     = var.region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

module "app" {
  source = "../../modules/app"

  environment   = "dev"
  instance_type = var.instance_type
  my_ip         = var.my_ip
}

# Re-expose the module's outputs at the environment level.
output "instance_public_ip" {
  value = module.app.instance_public_ip
}
output "ssh_command" {
  value = module.app.ssh_command
}
