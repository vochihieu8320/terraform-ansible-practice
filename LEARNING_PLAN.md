# Learning Plan — from observability to a full platform loop

Goal: go from "knows the tools" to genuinely senior across **observability, infra
provisioning, and deployment**. We build one coherent end-to-end project:

```
Terraform  ──provisions──▶  EC2 + network
                                  │
Ansible    ──configures──▶  installs runtime, deploys app, sets up node_exporter
                                  │
App (OTel) ──emits──▶  RED metrics + traces + logs
node_exporter ──emits──▶  host CPU / mem / disk / network
                                  │
Grafana/LGTM ──visualizes──▶  the dashboards
```

**Guiding principle:** finish each phase *fully working* before starting the next.
A linear, complete project beats a sprawling, half-built one. Resist adding
Kubernetes/Helm, autoscaling, load balancers, or RDS until the simple version runs.
Those are a separate Project 2 (see bottom).

---

## Phase 0 — Close the observability foundation  ✅ (almost done)

Already done in this `otel-demo` repo:
- [x] Three pillars wired (Prometheus / Loki / Tempo via OTLP)
- [x] RED dashboard built (`dashboard.json`): RPS, error rate %, latency p50/95/99
- [x] USE panels (process + system CPU/mem)
- [x] Trace ⇄ logs pivot verified (works both directions in Explore)

Remaining — **concepts to read once, not months of hands-on:**
- [ ] Read the **Google SRE Workbook** chapter on **SLOs & error budgets** (free online)
- [ ] Read the **Alerting on SLOs** chapter (multi-window burn-rate alerts)
- [ ] Understand **cardinality**: why high-cardinality labels (user_id, request_id,
      raw URL) kill Prometheus. Rule: labels must be *bounded*.

**Done when:** you can explain *why* the naive version is wrong — average vs p99,
symptom vs cause alerts, bounded vs unbounded labels. That's the senior line.

---

## Phase 1 — Terraform → EC2 (the VM track)

Learn to **provision** infrastructure declaratively.

Learn:
- [ ] Core model: providers, resources, **state**, `plan` / `apply` / `destroy`
- [ ] Variables, outputs, `terraform.tfvars`
- [ ] Provider auth (AWS credentials via env vars — NEVER commit keys)

Build (keep it minimal):
- [ ] One VPC, one public subnet, one internet gateway + route
- [ ] One security group (SSH from your IP, app port, monitoring ports)
- [ ] One `t3.micro` EC2 instance + SSH key pair
- [ ] Output the instance's public IP

**Done when:** `terraform apply` gives you an IP and you can `ssh` into the box.
Nothing more. No load balancer, no autoscaling.

**Guardrails:**
- `.gitignore` your `*.tfstate`, `*.tfvars` with secrets, and `.pem` keys.
- `terraform destroy` when not using it. Set an AWS billing alert. A forgotten
  EC2 is the classic "$200 surprise."

---

## Phase 2 — Ansible → configure + deploy

Learn to **configure** an existing machine. Clean boundary: Terraform makes the
box *exist*; Ansible decides what's *on* it. If Ansible starts creating servers or
Terraform starts installing packages, you've crossed the streams.

Learn:
- [ ] Inventory (point Ansible at the EC2 IP from Phase 1)
- [ ] Playbooks, tasks, modules, idempotency
- [ ] Variables and templates (Jinja2)

Build a playbook that:
- [ ] Installs the app runtime (Python / Node)
- [ ] Copies the app and installs dependencies
- [ ] Runs the app as a **systemd service** (NOT `npm start &` — that dies on logout)
- [ ] Installs **node_exporter** as a service (host metrics)

**Done when:** running the playbook against a fresh EC2 produces a running,
auto-restarting app + node_exporter, from zero, repeatably.

**Note:** Ansible ≠ CI/CD. Ansible *configures/deploys*. CI/CD (GitHub Actions) is
the *trigger* — "on git push, run the playbook." Learn Ansible standalone first
(run from your laptop), wrap it in CI later.

---

## Phase 3 — Monitoring the EC2 + the app

Two *distinct* things to monitor — don't conflate them:
- **Host (EC2 itself):** node_exporter → CPU, disk, memory, network of the machine
- **App:** OTel metrics → RED signals of the application

Decide where Grafana/LGTM runs:
- [ ] **Start: same EC2** as the app (cheapest, one `apply`, fast feedback)
- [ ] **Later: separate monitoring EC2** (realistic — monitoring shouldn't die with
      the app). Doing this upgrade is itself a great Terraform lesson.

Build:
- [ ] Point the app's OTLP exporter at wherever LGTM runs
- [ ] Add a Prometheus scrape job (or OTel) for node_exporter
- [ ] Build a **host dashboard** (USE: CPU/mem/disk/network of the EC2)
- [ ] Reuse the RED dashboard from Phase 0 for the app
- [ ] (Stretch) Add one **SLO burn-rate alert** in Grafana Alerting

**Done when:** you can see both the box's health and the app's health in Grafana,
and an alert fires when you deliberately break the app.

---

## Phase 4 — Instrument the real Python app

"My app has nothing to monitor" really means "it isn't instrumented yet."
Apply the same RED/USE concepts, in Python.

Learn / build:
- [ ] Add the **OpenTelemetry Python SDK** (or `prometheus_client` exposing `/metrics`)
- [ ] Emit RED: request count, error count, latency histogram
- [ ] Add traces for key operations (DB calls, external APIs)
- [ ] Ship logs with `trace_id` injected (same pivot you already built)

**Done when:** your Python app shows up in Grafana with its own RED dashboard and
clickable trace→logs pivot — same as the Node demo, but real.

---

## Future — Project 2: Kubernetes + Helm (the sequel, NOT now)

Do this *after* the VM track, so K8s abstractions map onto fundamentals you already
understand ("a Deployment is just managed processes", "a Service is just a LB").

- Terraform → EKS (managed Kubernetes)
- Deploy the app via a **Helm** chart
- Deploy monitoring via `helm install kube-prometheus-stack` — Prometheus + Grafana
  + Alertmanager + node-exporter + dashboards in ONE command (Helm's killer payoff)

Note: on the K8s track, Ansible largely drops out — containers + Helm replace
"configure the box." That's why K8s *replaces* parts of the VM track rather than
extending it.

---

## The senior framing

Senior ≠ deep in everything. It's **T-shaped**: deep in one spine (backend +
observability), conversant in adjacent layers (infra, deployment). This plan adds
the adjacent layers without trying to learn all of it at once.

Order of leverage: **SLOs (Phase 0) → Terraform → Ansible → instrument the app.**
The concepts (SLOs, symptom-based alerting, cardinality) are what separate senior
from "knows the tools." The tools are implementation an AI can help you write once
you own the decisions.

---

## One book, not many

**Google SRE Workbook** (free online) — SLO + Alerting chapters cover the senior
core. Then learn Terraform & Ansible *by building this project*, not by watching
courses. You learn the "why" by feeling the pain in a safe lab — which is exactly
what this repo is for.
