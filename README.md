# Nutech Integration API

REST API untuk layanan PPOB dengan fitur registrasi, login, topup saldo, dan transaksi sesuai spesifikasi Nutech Integration.

## 🚀 Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT Token
- **Deployment**: Railway.app

## 📋 API Endpoints

### Authentication
- `POST /registration` - Registrasi user baru
- `POST /login` - Login dan mendapatkan JWT token

### Profile Management  
- `GET /profile` - Get profile user
- `PUT /profile/update` - Update profile
- `PUT /profile/image` - Upload profile image

### Information
- `GET /banner` - Get list banner (public)
- `GET /services` - Get list layanan PPOB

### Transactions
- `GET /balance` - Cek saldo
- `POST /topup` - Top up saldo
- `POST /transaction` - Transaksi layanan
- `GET /transaction/history` - Riwayat transaksi

## 🗄️ Database Schema

### Tables
- `users` - Data pengguna
- `balances` - Saldo pengguna  
- `services` - Layanan PPOB
- `banners` - Banner promosi
- `transactions` - Riwayat transaksi

## 🔧 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL
- Git

### Installation
1. Clone repository:
```bash
git clone <repository-url>
cd nutech-api