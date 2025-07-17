# AWS Deployment Guide for Chirper

This document outlines how to deploy the Chirper application to AWS using Terraform, Kubernetes (EKS), and CI/CD pipelines.

## Architecture Overview

![Architecture Diagram](architecture_diagram.png)

The Chirper application uses the following AWS services:

- **Amazon EKS**: Managed Kubernetes service for container orchestration
- **Amazon ECR**: Container registry for storing Docker images
- **Amazon RDS**: Managed PostgreSQL database for user data and chirps
- **Amazon S3**: Object storage for media files (images, videos)
- **Amazon CloudFront**: CDN for delivering static assets
- **AWS Route 53**: DNS management
- **AWS Certificate Manager**: SSL certificate management
- **AWS IAM**: Identity and access management
- **AWS CodePipeline/CodeBuild**: CI/CD pipeline

## Prerequisites

- AWS CLI installed and configured
- Terraform CLI installed (v1.0.0+)
- kubectl installed
- Docker installed
- Git repository for the application code

## Deployment Steps

### 1. Infrastructure Setup with Terraform

The `terraform` directory contains all the necessary configuration files to provision the AWS infrastructure.

```bash
cd terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### 2. CI/CD Pipeline Setup

The CI/CD pipeline is defined in the `.github/workflows` directory (for GitHub Actions) or in the `buildspec.yml` file (for AWS CodeBuild).

#### GitHub Actions Workflow

```yaml
name: Deploy to EKS

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build, tag, and push image to Amazon ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: chirper
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
      
      - name: Update kube config
        run: aws eks update-kubeconfig --name chirper-cluster --region us-west-2
      
      - name: Deploy to EKS
        run: |
          kubectl set image deployment/chirper-deployment chirper=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          kubectl rollout status deployment/chirper-deployment
```

### 3. Kubernetes Configuration

The `kubernetes` directory contains all the necessary Kubernetes manifests for deploying the application.

```bash
# Apply Kubernetes manifests
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secret.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/ingress.yaml
```

## Infrastructure as Code (Terraform)

### Directory Structure

```
terraform/
├── main.tf           # Main Terraform configuration
├── variables.tf      # Input variables
├── outputs.tf        # Output values
├── providers.tf      # Provider configuration
├── vpc.tf            # VPC configuration
├── eks.tf            # EKS cluster configuration
├── rds.tf            # RDS database configuration
├── s3.tf             # S3 bucket configuration
├── cloudfront.tf     # CloudFront distribution
└── iam.tf            # IAM roles and policies
```

### Key Terraform Modules

#### VPC Configuration (vpc.tf)

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.14.0"

  name = "chirper-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = {
    Environment = "production"
    Project     = "chirper"
  }
}
```

#### EKS Configuration (eks.tf)

```hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "18.20.0"

  cluster_name    = "chirper-cluster"
  cluster_version = "1.23"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    default = {
      min_size     = 2
      max_size     = 5
      desired_size = 2

      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
    }
  }

  tags = {
    Environment = "production"
    Project     = "chirper"
  }
}
```

#### RDS Configuration (rds.tf)

```hcl
module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "4.2.0"

  identifier = "chirper-db"

  engine            = "postgres"
  engine_version    = "13.4"
  instance_class    = "db.t3.medium"
  allocated_storage = 20

  db_name  = "chirper"
  username = "chirper_admin"
  password = var.db_password
  port     = "5432"

  vpc_security_group_ids = [aws_security_group.rds.id]
  subnet_ids             = module.vpc.private_subnets
  
  maintenance_window = "Mon:00:00-Mon:03:00"
  backup_window      = "03:00-06:00"

  tags = {
    Environment = "production"
    Project     = "chirper"
  }
}
```

## Kubernetes Configuration

### Directory Structure

```
kubernetes/
├── namespace.yaml    # Namespace definition
├── configmap.yaml    # ConfigMap for application configuration
├── secret.yaml       # Secret for sensitive data
├── deployment.yaml   # Deployment configuration
├── service.yaml      # Service configuration
└── ingress.yaml      # Ingress configuration
```

### Key Kubernetes Manifests

#### Deployment Configuration (deployment.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chirper-deployment
  namespace: chirper
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chirper
  template:
    metadata:
      labels:
        app: chirper
    spec:
      containers:
      - name: chirper
        image: ${ECR_REGISTRY}/chirper:latest
        ports:
        - containerPort: 80
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "200m"
            memory: "256Mi"
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: chirper-config
              key: db_host
        - name: DB_NAME
          valueFrom:
            configMapKeyRef:
              name: chirper-config
              key: db_name
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: chirper-secrets
              key: db_user
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: chirper-secrets
              key: db_password
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Service Configuration (service.yaml)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: chirper-service
  namespace: chirper
spec:
  selector:
    app: chirper
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

#### Ingress Configuration (ingress.yaml)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chirper-ingress
  namespace: chirper
  annotations:
    kubernetes.io/ingress.class: "alb"
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: ${ACM_CERTIFICATE_ARN}
spec:
  rules:
  - host: chirper.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: chirper-service
            port:
              number: 80
```

## Scaling and High Availability

The Chirper application is designed to be highly available and scalable:

1. **Horizontal Pod Autoscaling**: Automatically scales pods based on CPU/memory usage
2. **Multi-AZ Deployment**: Resources are distributed across multiple availability zones
3. **Database Replication**: RDS with read replicas for database scaling
4. **CDN**: CloudFront for global content delivery
5. **Load Balancing**: Application Load Balancer for distributing traffic

## Monitoring and Logging

The deployment includes:

1. **CloudWatch**: For monitoring and alerting
2. **Prometheus and Grafana**: For Kubernetes monitoring
3. **Fluentd**: For log aggregation
4. **X-Ray**: For distributed tracing

## Security Considerations

1. **Network Security**: VPC with private subnets, security groups, and NACLs
2. **IAM Roles**: Least privilege principle for all components
3. **Secrets Management**: Using Kubernetes Secrets and AWS Secrets Manager
4. **TLS**: HTTPS everywhere with AWS Certificate Manager
5. **Container Security**: Regular scanning of container images

## Cost Optimization

1. **Autoscaling**: Scale resources based on demand
2. **Spot Instances**: Use spot instances for non-critical workloads
3. **Resource Limits**: Set appropriate CPU and memory limits
4. **S3 Lifecycle Policies**: Automatically move infrequently accessed data to cheaper storage tiers

## Backup and Disaster Recovery

1. **Database Backups**: Automated RDS snapshots
2. **S3 Versioning**: Enable versioning for S3 buckets
3. **Multi-Region Replication**: Optional replication to a secondary region for disaster recovery
4. **Backup Retention**: Define appropriate retention policies for all backups

## Conclusion

This deployment guide provides a comprehensive approach to deploying the Chirper application on AWS using modern DevOps practices. By leveraging Terraform for infrastructure as code, Kubernetes for container orchestration, and CI/CD pipelines for automated deployments, you can ensure a reliable, scalable, and secure application.