# Trove Backend API

Backend API for the Trove app - a digital family support and lottery platform built with NestJS, MongoDB, and WebSockets.

## Tech Stack

- **Framework**: NestJS 11
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT + Passport
- **Real-time**: Socket.io (WebSockets)
- **Push Notifications**: Firebase Admin SDK
- **Documentation**: Swagger/OpenAPI
- **File Upload**: Cloudinary

## Project Structure

```
src/
├── auth/           # Authentication (OTP, JWT, login/register)
├── users/          # User management and profiles
├── groups/         # Group CRUD and membership
├── lottery/        # Lottery management and draw logic
├── finance/        # Contributions, payouts, savings
├── notifications/  # Push notifications (Firebase)
├── invites/        # Group invitation handling
├── proposals/      # Member proposals
├── schemas/        # MongoDB schemas
└── common/         # Shared utilities and guards
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance
- Firebase project (for push notifications)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/trove
JWT_SECRET=your-jwt-secret
PORT=5000
```

Create a `firebase-service-account.json` file with your Firebase credentials.

### Running the App

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

### API Documentation

Once running, visit `http://localhost:5000/api` for Swagger docs.

## API Modules

| Module | Description |
|--------|-------------|
| `/auth` | OTP-based login, registration, JWT tokens |
| `/users` | User profiles, FCM token registration |
| `/groups` | Create/join groups, manage members |
| `/lottery` | Confirm participation, run draws |
| `/finance` | Contributions, payouts, savings tracking |
| `/notifications` | Push notification sending |
| `/invites` | Generate and accept group invites |

## WebSocket Events

Real-time features are handled via Socket.io:

- `lottery:started` - Lottery draw begins
- `lottery:winner` - Winner announced
- `contribution:received` - New contribution made

## License

Private - All rights reserved.
