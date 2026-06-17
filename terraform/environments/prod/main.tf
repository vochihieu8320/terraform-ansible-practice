# environments/prod/main.tf — the PROD environment. SAME module as dev, but
# its own folder, own state, own credentials. To touch prod you must `cd` here
# — there's no way to accidentally hit prod from the dev folder.

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # backend "s3" {
  #   bucket = "my-tf-state"
  #   key    = "otel-demo/prod/terraform.tfstate"   # <-- prod's own state path
  #   region = "ap-southeast-1"
  # }
}

# Credentials from variables set in the gitignored terraform.tfvars.
provider "aws" {
  region     = var.region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

module "app" {
  source = "../../modules/app"

  environment   = "prod"
  instance_type = var.instance_type
  my_ip         = var.my_ip
}

output "instance_public_ip" {
  value = module.app.instance_public_ip
}
output "ssh_command" {
  value = module.app.ssh_command
}
