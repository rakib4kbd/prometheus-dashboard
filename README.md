<div style="padding: 10px; border-radius: 10px; color: #856404; background-color: #fff3cd">
<strong>Warning!</strong> Requires security audit on production use case.

</div>

<br>

# Prometheus Multi-User Monitoring Dashboard

A SaaS dashboard built with Next.js for managing Prometheus Blackbox monitoring jobs. Each user gets their own monitoring job, can add targets, view alerts, and receive email notifications.

## Overview

This application provides a multi-user interface for Prometheus monitoring, specifically designed for Blackbox exporter jobs. It allows users to:

- Register and manage their own monitoring targets
- View real-time alerts and metrics
- Receive email notifications for alert events
- Access a personalized dashboard with monitoring statistics

The system maintains a single Prometheus instance where each user corresponds to exactly one Blackbox job, ensuring isolation and scalability.

## Screenshots

![dashboard](./assets/demo/dashboard.png)
![dashboard](./assets/demo/monitoring-targets.png)

## Features

- **User Authentication**: Secure login/registration with JWT tokens
- **Target Management**: Add, view, and manage monitoring targets per user
- **Alert Monitoring**: Real-time polling of Prometheus alerts with filtering
- **Email Notifications**: SMTP-based alert notifications with throttling
- **Dashboard Metrics**: Visual display of monitoring statistics and status
- **Configuration Management**: Automated Prometheus config updates with backups
- **Admin Panel**: Administrative access for system configuration
- **Docker Integration**: Complete containerized setup with Prometheus stack

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, DaisyUI
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL
- **Monitoring**: Prometheus, Alertmanager, Blackbox Exporter
- **Authentication**: JWT with bcryptjs
- **Email**: Nodemailer
- **HTTP Client**: Axios
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- PostgreSQL (provided via Docker)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd prometheus-dashboard
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   Create a `.env.local` file with the following variables:

   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
   JWT_SECRET=your-jwt-secret-key
   PROMETHEUS_URL=http://localhost:9090
   PROMETHEUS_CONFIG_PATH=./configs/prometheus.yml
   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_USER=your-email@domain.com
   SMTP_PASS=your-email-password
   NEXTAUTH_SECRET=your-nextauth-secret
   POSTGRES_PASSWORD=postgres
   ```

4. **Database Setup**

   The database schema will be created automatically when the application starts. The Docker Compose includes PostgreSQL.

5. **Start the services**

   ```bash
   docker-compose up -d
   ```

6. **Run the application**

   ```bash
   pnpm run dev
   ```

   The application will be available at `http://localhost:3000`

## Usage

### User Registration

1. Visit the homepage and click "Register"
2. Fill in username, email, and password
3. Upon registration, a new Blackbox job is automatically created in Prometheus

### Adding Targets

1. Login to your account
2. Navigate to the dashboard
3. Use the target management interface to add URLs to monitor
4. Targets are validated and Prometheus config is updated automatically

### Viewing Alerts

- The dashboard displays current alerts filtered by user
- Alerts are polled every 60 seconds from Prometheus
- Status indicators show firing, resolved, or healthy states

### Email Notifications

- Automatic email alerts for firing and resolved events
- Throttled to prevent spam (10-minute intervals)
- Configurable SMTP settings

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Targets

- `GET /api/targets` - Get user's targets
- `POST /api/targets` - Update user's targets

### Alerts

- `GET /api/alerts` - Get user's alerts

### Statistics

- `GET /api/stats` - Get monitoring statistics

### Configuration (Admin Only)

- `GET /api/config` - Get Prometheus config
- `GET /api/config/versions` - Get config version history

## Configuration

### Prometheus Config

The application manages `configs/prometheus.yml` automatically. Each user gets a Blackbox job:

```yaml
- job_name: "<username>"
  metrics_path: /probe
  params:
    module: [http_default]
  static_configs:
    - targets: []
      labels:
        username: "<username>"
```

### Alert Rules

Alert rules are defined in `configs/alert_rules.yml` and managed by Alertmanager.

### Blackbox Config

Blackbox exporter configuration in `configs/blackbox.yml` defines monitoring modules.

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alert events table
CREATE TABLE alert_events (
  id SERIAL PRIMARY KEY,
  fingerprint VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  alert_name VARCHAR(255) NOT NULL,
  instance VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP,
  last_sent_at TIMESTAMP
);

-- Config versions table
CREATE TABLE config_versions (
  id SERIAL PRIMARY KEY,
  version INTEGER NOT NULL,
  config_yaml TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Project Structure

```
app/
  api/              # API routes
    auth/           # Authentication endpoints
    targets/        # Target management
    alerts/         # Alert endpoints
    stats/          # Statistics
    config/         # Admin config
  dashboard/        # Main dashboard page
  settings/         # User settings
  alerts/           # Alerts page
lib/
  db.ts             # Database connection
  prometheus.ts     # Prometheus API client
  configManager.ts  # Config management
  alertPoller.ts    # Alert polling service
  mailer.ts         # Email service
  auth.ts           # Authentication utilities
types/              # TypeScript types
configs/            # Prometheus configurations
  prometheus.yml    # Main config
  alert_rules.yml   # Alert rules
  blackbox.yml      # Blackbox config
  backups/          # Config backups
```

## Security

- Passwords are hashed using bcryptjs
- JWT tokens for session management
- User isolation: users can only access their own data
- Input validation on all API endpoints
- HTTPS recommended for production

## Monitoring

The application includes built-in monitoring:

- Prometheus metrics collection
- Alertmanager for alert routing
- Blackbox exporter for HTTP monitoring
- Docker health checks for all services

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the GitHub repository.
