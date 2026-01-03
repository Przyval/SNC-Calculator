# 🧮 SNC Calculator (Kalkulator Risiko Rayap)

A comprehensive termite risk calculator and pest inspection management system built with Laravel API and Next.js frontend.

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 🎯 Overview

SNC Calculator helps pest control agents:
- Calculate potential losses from not using anti-termite services
- Manage client inspections
- Generate professional proposals and reports
- Upload and analyze pest detection images

---

## 🛠 Tech Stack

### Backend (API)
| Technology | Version | Purpose |
|------------|---------|---------|
| PHP | 8.2+ | Runtime |
| Laravel | 12.x | Framework |
| SQLite | 3.x | Database |
| Sanctum | 4.x | Authentication |
| PHPWord | 1.4 | Document generation |

### Frontend (FRONT)
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| Next.js | 14.x | Framework |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | - | Components |

---

## 📁 Project Structure

```
SNC-calc/
├── .github/
│   ├── workflows/ci.yml      # CI/CD pipeline
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
├── API/                       # Laravel Backend
│   ├── app/
│   │   ├── Http/Controllers/
│   │   └── Models/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/api.php
│   └── .env.example
└── FRONT/                     # Next.js Frontend
    ├── app/
    ├── components/
    ├── hooks/
    └── .env.local
```

---

## 🚀 Getting Started

### Prerequisites
- PHP 8.2+ with extensions: pdo_sqlite, bcmath, gd, zip
- Composer 2.x
- Node.js 20.x
- pnpm 8.x

### Backend Setup

```bash
cd API
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

The API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd FRONT
pnpm install
cp .env.local.example .env.local  # Update API URL
pnpm dev
```

The frontend will be available at `http://localhost:3000`

---

## 🔐 Environment Variables

### API (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_KEY` | Encryption key | `base64:xxx...` |
| `APP_ENV` | Environment | `local` / `production` |
| `APP_DEBUG` | Debug mode | `true` / `false` |
| `DB_CONNECTION` | Database driver | `sqlite` |
| `DB_DATABASE` | Database path | `database/database.sqlite` |
| `CACHE_STORE` | Cache driver | `file` |
| `SESSION_DRIVER` | Session driver | `file` |

### Frontend (.env.local)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | API endpoint | `http://localhost:8000/api` |
| `NEXTAUTH_URL` | App URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Auth secret | `your-secret-key` |

---

## 🌐 Deployment

### Railway (Recommended)

1. Connect GitHub repository
2. Create two services:
   - **API**: Root directory `/API`
   - **Frontend**: Root directory `/FRONT`
3. Set environment variables per service
4. Deploy automatically on push to `main`

### Start Commands

**API:**
```bash
php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=$PORT
```

**Frontend:**
```bash
pnpm start
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **PHP**: Follow PSR-12, run `vendor/bin/pint` before committing
- **TypeScript**: ESLint + Prettier, run `pnpm lint` before committing

---

## 📄 License

This project is proprietary. All rights reserved.

---

## 👥 Team

- **Code Owner**: @Przyval
