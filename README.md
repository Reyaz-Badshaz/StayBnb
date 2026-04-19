# StayBnB - Airbnb Clone (MERN Stack)

A full-featured vacation rental marketplace built with MongoDB, Express, React, and Node.js.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account
- Stripe account

### Installation

1. **Clone and install dependencies:**
```bash
cd staybnb

# Install server dependencies
cd server && npm install

# Install client dependencies  
cd ../client && npm install
```

2. **Configure environment variables:**
```bash
# In /server folder
cp .env.example .env
# Edit .env with your credentials
```

3. **Start development servers:**
```bash
# Terminal 1 - Backend (from /server)
npm run dev

# Terminal 2 - Frontend (from /client)
npm run dev
```

4. **Access the app:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api/v1
- Health Check: http://localhost:5000/health

## 📁 Project Structure

```
staybnb/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── features/       # Redux slices
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── ...
│   └── package.json
│
├── server/                 # Express Backend
│   ├── src/
│   │   ├── config/         # DB & service configs
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   └── utils/          # Helper utilities
│   └── package.json
│
└── README.md
```

## 🛠 Tech Stack

**Frontend:**
- React 18 + Vite
- Redux Toolkit + React Query
- Tailwind CSS
- React Router DOM
- React Hook Form

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Socket.io (real-time)

**Services:**
- Cloudinary (images)
- Stripe (payments)
- SendGrid (emails)
- Mapbox (maps)

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/refresh-token` - Refresh JWT

### Properties
- `GET /api/v1/properties` - List properties
- `GET /api/v1/properties/:id` - Get property
- `POST /api/v1/properties` - Create property (host)
- `PUT /api/v1/properties/:id` - Update property
- `DELETE /api/v1/properties/:id` - Delete property

### Bookings
- `GET /api/v1/bookings` - Get user bookings
- `POST /api/v1/bookings` - Create booking
- `PUT /api/v1/bookings/:id/cancel` - Cancel booking

### Reviews
- `GET /api/v1/reviews/property/:id` - Get property reviews
- `POST /api/v1/reviews` - Create review

### Experiences
- `GET /api/v1/experiences` - List experiences
- `GET /api/v1/experiences/:id` - Get experience
- `POST /api/v1/experiences` - Create experience (host)
- `POST /api/v1/experiences/:id/book` - Book experience

## 🐳 Docker Deployment

### Development
```bash
# Start all services (MongoDB, Redis, Server, Client)
docker-compose -f docker-compose.dev.yml up --build
```

### Production
```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with production values

# 2. Build and start
docker-compose up --build -d

# 3. View logs
docker-compose logs -f
```

### Individual Services
```bash
# Just the server
cd server && docker build -t staybnb-server .

# Just the client
cd client && docker build -t staybnb-client .
```

## 🧪 Testing

```bash
# Run all tests
cd server && npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 🔒 Security Features

- **Rate Limiting**: API-wide and endpoint-specific limits
- **Input Sanitization**: NoSQL injection & XSS protection
- **Helmet**: Security headers
- **CORS**: Configurable origins
- **JWT**: Short-lived access tokens + refresh token rotation
- **Password Hashing**: bcrypt with salt rounds

## 🔐 Environment Variables

See `.env.example` in the server folder for required variables.

## 📝 License

MIT License - feel free to use for learning and personal projects.

---

Built with ❤️ using the MERN stack
