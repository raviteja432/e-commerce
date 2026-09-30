# E-Commerce Microservices Platform

A comprehensive distributed e-commerce architecture built with Spring Boot, Spring Cloud Gateway, Apache Kafka, Redis, and MySQL.

---

## 🏗️ Architecture Overview

The system consists of 8 microservices and supporting infrastructure containers:

| Service | Port | Description | Tech Stack / Dependencies |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `8080` | Single entry point, JWT validation, frontend UI host (`ApexMarket`) | Spring Cloud Gateway MVC, Spring Security |
| **Auth Service** | `8081` | Authentication, registration, JWT issuance, password reset | Spring Boot, Spring Security, MySQL (`ecom_auth`) |
| **Vendor Service** | `8082` | Vendor store management and verification | Spring Boot, JPA, MySQL (`ecom_vendor`) |
| **Product Service** | `8083` | Product catalog, categories, search, caching | Spring Boot, JPA, Redis (`redis-product:6379`), MySQL (`ecom_product`) |
| **Cart Service** | `8084` | Shopping cart operations, cart persistence | Spring Boot, Redis (`redis-cart:6380`), MySQL (`ecom_cart`) |
| **Order Service** | `8085` | Order lifecycle, order placement, order events | Spring Boot, JPA, Apache Kafka, MySQL (`ecom_order`) |
| **Payment Service** | `8086` | Payment processing, transaction history, payouts | Spring Boot, JPA, Apache Kafka, MySQL (`ecom_payment`) |
| **Notification Service** | `8087` | Event-driven customer alerts & email dispatch | Spring Boot, Apache Kafka consumer (`notification-group`) |

---

## 📦 Infrastructure Components

Managed via `docker-compose.yml`:

- **Redis Product** (`localhost:6379`): Redis 7 cache for product catalog.
- **Redis Cart** (`localhost:6380`): Redis 7 store for cart sessions.
- **Apache Kafka** (`localhost:9092`): Event streaming platform in KRaft mode.
  - Topics: `order_completed`, `payment_completed`
- **MySQL** (`localhost:3306`): Relational data store for entities across all services.

---

## 🚀 Getting Started

### 1. Prerequisites
- Java 21+
- Apache Maven 3.9+
- Docker & Docker Compose
- MySQL Server (port 3306)

### 2. Start Infrastructure
```bash
docker compose up -d
```

### 3. Start Microservices
Run the PowerShell launcher script:
```powershell
.\start-all.ps1
```
Or run persistently in background:
```powershell
.\run-all-persist.ps1
```

### 4. Access Application
- **Frontend / Storefront**: http://localhost:8080
- **Products API**: http://localhost:8080/api/products
