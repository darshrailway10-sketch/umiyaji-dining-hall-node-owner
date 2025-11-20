# Backend API - Next Level Project Setup

This is a modular, scalable backend API built with Node.js, Express.js, and MongoDB.

## Features

- ✅ Fast API responses with Express.js
- ✅ User Registration API (fullName, email, mobileNumber, password)
- ✅ Login API with mobile number and password
- ✅ MongoDB database integration
- ✅ Health check endpoint
- ✅ JWT authentication
- ✅ Security middleware (Helmet, CORS, Rate Limiting)
- ✅ Modular structure for multiple modules
- ✅ Environment variable support

## Project Structure

```
backend/
├── config/          # Configuration files
│   └── database.js  # MongoDB connection
├── controllers/     # Business logic controllers
│   └── auth.controller.js
├── routes/          # API routes
│   ├── auth.routes.js
│   └── health.routes.js
├── models/          # Database models
│   └── User.model.js
├── middleware/      # Custom middleware (add as needed)
├── utils/           # Utility functions
│   └── passwordHelper.js
├── server.js        # Main server file
├── package.json     # Dependencies
└── .env            # Environment variables
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file and add your configuration:
```bash
# Copy from env.example or create manually
```

3. Update `.env` file with your MongoDB connection:
   - For local MongoDB: `MONGODB_URI=mongodb://localhost:27017/testapk`
   - For MongoDB Atlas: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/testapk`

4. Make sure MongoDB is running (local or Atlas)

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

Server will run on `http://localhost:3000` (or PORT from .env)

## API Endpoints

### Health Check
```
GET /api/health
```

Response:
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

### Register
```
POST /api/auth/register
```

Request Body:
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "mobileNumber": "9876543210",
  "password": "123456"
}
```

Response (Success):
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "john@example.com",
      "mobileNumber": "9876543210"
    }
  }
}
```

Response (Error - Duplicate):
```json
{
  "success": false,
  "message": "Email already registered"
}
```

### Login
```
POST /api/auth/login
```

Request Body:
```json
{
  "mobileNumber": "9876543210",
  "password": "123456"
}
```

Response (Success):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "john@example.com",
      "mobileNumber": "9876543210"
    }
  }
}
```

Response (Error):
```json
{
  "success": false,
  "message": "Invalid mobile number or password"
}
```

## Adding New Modules

To add a new module:

1. Create controller in `controllers/` folder
2. Create routes in `routes/` folder
3. Import and use routes in `server.js`

Example:
```javascript
// routes/user.routes.js
const userRoutes = require('./routes/user.routes');
app.use('/api/users', userRoutes);
```

## Security Features

- **Helmet**: Sets security HTTP headers
- **CORS**: Cross-origin resource sharing enabled
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Password Hashing**: Using bcryptjs (automatic hashing before save)
- **JWT Tokens**: Secure token-based authentication
- **MongoDB**: Secure database with validation

## Database

- **MongoDB**: Used for storing user data
- **Mongoose**: ODM for MongoDB
- **User Model**: Includes fullName, email, mobileNumber, password
- **Validation**: Email and mobile number uniqueness enforced
- **Auto-hashing**: Passwords automatically hashed before saving

## Next Steps

1. ✅ ~~Integrate database (MongoDB)~~
2. ✅ ~~Add user registration~~
3. Add password reset functionality
4. Add more authentication middleware
5. Add logging system
6. Add API documentation (Swagger)
7. Add email verification

## Testing the API

You can test using:
- Postman
- cURL
- Thunder Client (VS Code extension)

Example cURL:
```bash
# Health check
curl http://localhost:3000/api/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","email":"john@example.com","mobileNumber":"9876543210","password":"123456"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210","password":"123456"}'
```

## MongoDB Setup

### Local MongoDB:
1. Install MongoDB on your system
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/testapk`

### MongoDB Atlas (Cloud):
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

## Notes

- Make sure MongoDB is running before starting the server
- Change JWT_SECRET in production
- Email and mobile number must be unique
- Password minimum length: 6 characters
- Mobile number must be exactly 10 digits
- Passwords are automatically hashed using bcryptjs

