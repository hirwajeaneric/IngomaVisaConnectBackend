# IngomaVisaConnectBackend

A robust backend service for the Ingoma Visa Connect platform, built with Node.js, Express, TypeScript, and PostgreSQL with Prisma ORM.

## 📋 Table of Contents
- [Requirements](#requirements)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
  - [Environment Setup](#environment-setup)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Contributing](#contributing)

## 🔧 Requirements

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## 🛠 Tech Stack

- **Runtime Environment**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Email Service**: Nodemailer
- **Payment Processing**: Stripe
- **Testing**: Jest & Supertest

## 📁 Project Structure

```
src/
├── controllers/     # Request handlers
├── services/       # Business logic
├── models/         # Data models and interfaces
├── middleware/     # Express middleware
├── routes/         # API routes
├── utils/         # Utility functions
├── config/        # Configuration files
└── server.ts      # Application entry point

prisma/
├── migrations/    # Database migrations
└── schema.prisma  # Prisma schema file
```

## 🗄 Database Schema

The database includes the following main entities:

- **User**: Manages user accounts and authentication
- **VisaApplication**: Handles visa application processes
- **VisaType**: Defines different types of visas
- **Document**: Stores application documents
- **Payment**: Manages payment transactions
- **Interview**: Handles visa interview scheduling
- **Notification**: Manages user notifications

For detailed schema information, refer to `prisma/schema.prisma`.

## 🚀 Getting Started

### Environment Setup

1. Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ingoma_visa_connect"

# JWT
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="24h"

# Email
SMTP_HOST="your-smtp-host"
SMTP_PORT=587
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"

# Stripe
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
```

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd IngomaVisaConnectBackend
```

2. Install dependencies:
```bash
npm install
```

### Database Setup

1. Create a PostgreSQL database:
```bash
createdb ingoma_visa_connect
```

2. Generate Prisma Client:
```bash
npm run prisma:generate
```

3. Run database migrations:
```bash
npm run prisma:migrate
```

### Running the Server

1. For development:
```bash
npm run dev
```

2. For production:
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` by default.

## 📚 API Documentation

The API includes the following main endpoints:

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request

### Visa Applications
- `POST /api/applications` - Create new application
- `GET /api/applications` - List applications
- `GET /api/applications/:id` - Get application details
- `PUT /api/applications/:id` - Update application

### Documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id` - Get document
- `PUT /api/documents/:id/verify` - Verify document

### Payments
- `POST /api/payments` - Create payment
- `GET /api/payments/:id` - Get payment details

For detailed API documentation, please refer to our API documentation (Swagger/OpenAPI).

## 🧪 Testing

Run the test suite:

```bash
npm test
```

For test coverage:

```bash
npm test -- --coverage
```

## Admin Permissions
APPLICATIONS_VIEW_APPLICATIONS,APPLICATIONS_MANAGE_APPLICATIONS,INTERVIEWS_SCHEDULE_INTERVIEWS,INTERVIEWS_CONDUCT_INTERVIEWS,USERS_CREATE_ADMIN,SYSTEM_MANAGE_SYSTEM,PAYMENTS_PROCESS_REFUNDS,ADMIN_DEFAULT_PERMISSIONS,APPLICATIONS_VIEW_APPLICATIONS,APPLICATIONS_MANAGE_APPLICATIONS,APPLICATIONS_APPROVE_VISAS,APPLICATIONS_REJECT_VISAS,USERS_VIEW_USERS,USERS_MANAGE_USERS,USERS_CREATE_ADMIN,SYSTEM_VIEW_REPORTS,SYSTEM_MANAGE_SYSTEM,SYSTEM_VIEW_LOGS,INTERVIEWS_SCHEDULE_INTERVIEWS,INTERVIEWS_CONDUCT_INTERVIEWS,PAYMENTS_VIEW_PAYMENTS,PAYMENTS_PROCESS_REFUNDS

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.