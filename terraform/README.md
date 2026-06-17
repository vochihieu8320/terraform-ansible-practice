# Terraform — otel-demo infrastructure

Provisions a single EC2 instance (+ VPC, subnet, internet gateway, firewall, SSH
key) you can SSH into. Phase 1 of the learning plan.

## Layout

```
terraform/
├── modules/app/          # the reusable infra, written once (no provider/creds here)
└── environments/
    ├── dev/              # dev env — own state, profile "otel-dev",  t3.micro
    └── prod/             # prod env — own state, profile "otel-prod", t3.large
```

Each environment folder has its own state, so applying in `dev/` can never touch
`prod/`. The shared resources live in `modules/app` and are called by both.

## Resume steps (later you, fresh clone)

The real `terraform.tfvars` is gitignored, so after cloning you must recreate it.
Credentials (access key + secret) live IN that gitignored tfvars.

```bash
# 1. Create your tfvars from the template.
cd environments/dev
cp terraform.tfvars.example terraform.tfvars

# 2. Edit terraform.tfvars and fill in:
#    - aws_access_key / aws_secret_key  (AWS Console → IAM → Security credentials)
#    - my_ip   (your CURRENT public IP — get it: curl https://checkip.amazonaws.com)

# 3. Init (downloads the AWS provider) and review the plan BEFORE applying.
terraform init
terraform plan          # read it: expect "~6 to add, 0 to destroy"
terraform apply         # creates the box; prints the public IP

# 4. Log in.
ssh ubuntu@<public_ip_from_output>

# 5. ⚠️ Tear it down when done so it stops costing money.
terraform destroy
```

For prod, do the same in `environments/prod/`.

## Never committed (gitignored)

- `*.tfstate` — state; maps to real infra, can contain IPs/secrets
- `terraform.tfvars` — your values (use the `.example` as a template)
- `.terraform/` — downloaded provider plugins (large)
- `*.pem` — private keys

## Committed on purpose

- `.terraform.lock.hcl` — pins exact provider versions so `init` is reproducible
- everything in `modules/` and the `*.tf` + `*.tfvars.example` files
