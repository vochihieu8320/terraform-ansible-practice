# modules/app/outputs.tf — values the module hands back to the environment
# that called it. The environment can then re-expose or use them.

output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.app.public_ip
}

output "ssh_command" {
  description = "Command to log in (Ubuntu's default user is 'ubuntu')"
  value       = "ssh ubuntu@${aws_instance.app.public_ip}"
}
