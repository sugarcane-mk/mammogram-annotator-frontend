# Mammogram Database Platform - Backend API

A comprehensive backend API for the Mammogram Database Platform built with Node.js, Express, and SQLite.

## Features

- ✅ User Authentication & Authorization (JWT-based)
- ✅ Role-Based Access Control (Admin, Hospital, General)
- ✅ Multi-tenant Support (Hospital-scoped data)
- ✅ Patient & Image Management
- ✅ Annotation with Versioning Support
- ✅ Download Request Management
- ✅ Audit Logging
- ✅ Local SQLite Database
- ✅ Cloud Storage Abstraction (Ready for AWS S3, Azure, GCS)

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite3
- **Authentication**: JWT
- **Password Hashing**: bcryptjs
- **File Handling**: Multer (future integration)

## Installation

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn

### Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration

3. **Build TypeScript**
   ```bash
   npm run build
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Server will start at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/register` - Register new user
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users` - List all users (Admin only)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Hospitals
- `GET /api/hospitals` - List all hospitals
- `GET /api/hospitals/:id` - Get hospital details
- `POST /api/hospitals` - Create hospital (Admin only)
- `PUT /api/hospitals/:id` - Update hospital (Admin/Hospital)

### Patients
- `GET /api/patients` - List patients
- `GET /api/patients/:id` - Get patient details
- `POST /api/patients` - Create patient (Hospital/Admin)
- `PUT /api/patients/:id` - Update patient (Hospital/Admin)

### Images
- `GET /api/images` - List images
- `GET /api/images/:id` - Get image details
- `POST /api/images/upload` - Upload image (Hospital/Admin)
- `PUT /api/images/:id` - Update image status

### Annotations
- `GET /api/annotations` - List annotations (with optional imageId filter)
- `GET /api/annotations/:id` - Get annotation details
- `POST /api/annotations` - Create annotation
- `PUT /api/annotations/:id` - Update annotation (with automatic versioning)
- `DELETE /api/annotations/:id` - Delete annotation

### Download Requests
- `GET /api/download-requests` - List download requests (with filters)
- `POST /api/download-requests` - Create download request
- `POST /api/download-requests/:id/approve` - Approve request (Admin only)
- `POST /api/download-requests/:id/reject` - Reject request (Admin only)

## Database Schema

The application uses SQLite with the following tables:

- **users**: User accounts with roles (admin, hospital, general)
- **hospitals**: Healthcare institution records
- **patients**: Patient information linked to hospitals
- **images**: Mammogram images with metadata
- **annotations**: Image annotations with versioning support
- **downloadRequests**: User download requests with approval workflow
- **auditLogs**: Audit trail for all actions

## Authentication & Authorization

### JWT Token
- Tokens include user ID, email, role, and organization ID
- Token expiration: 24 hours
- Include token in Authorization header: `Bearer <token>`

### Role-Based Access Control
- **Admin**: Full system access
- **Hospital**: Access to own hospital's data
- **General**: Read-only access to sample data

## Deployment

### Production Checklist
- [ ] Update JWT_SECRET in environment
- [ ] Configure proper CORS origins
- [ ] Set up proper logging
- [ ] Configure backup strategy for database
- [ ] Set up monitoring and alerting
- [ ] Use environment variables for all secrets

### Docker Deployment (Example)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Development

### Project Structure
```
src/
├── index.ts                 # Main entry point
├── database.ts             # Database initialization
├── middleware/
│   └── auth.middleware.ts  # JWT authentication
├── controllers/            # Route controllers
├── types/                  # TypeScript types
└── services/              # Business logic
```

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run compiled server
- `npm test` - Run tests

## Future Enhancements

### Cloud Storage Integration
The backend is designed to support cloud storage providers:
- AWS S3
- Azure Blob Storage
- Google Cloud Storage

Configure via environment variables:
```bash
VITE_STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
```

### Additional Features (Roadmap)
- [ ] Email notifications for download requests
- [ ] Advanced search and filtering
- [ ] Batch operations
- [ ] Dataset export functionality
- [ ] Real-time collaboration (WebSocket)
- [ ] Advanced analytics and reporting

## Security

- Passwords are hashed using bcryptjs
- JWT for stateless authentication
- Role-based access control
- Comprehensive audit logging
- CORS protection
- SQL injection prevention via parameterized queries

## Troubleshooting

### Database Lock Error
If you encounter database lock errors, ensure only one instance of the application is running.

### Token Expired
Users need to re-login when JWT token expires (24 hours).

### CORS Errors
Check that FRONTEND_URL in .env matches your frontend URL.

## Support

For issues and feature requests, please contact the development team or submit an issue in the repository.

## License

Proprietary - Mammogram Database Platform
