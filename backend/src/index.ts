import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from './database';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { HospitalController } from './controllers/hospital.controller';
import { PatientController } from './controllers/patient.controller';
import { ImageController } from './controllers/image.controller';
import { AnnotationController } from './controllers/annotation.controller';
import { DownloadRequestController } from './controllers/download-request.controller';
import { authenticate, authorize } from './middleware/auth.middleware';
import type { UserRole } from './types/user.types';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize database
const db = new Database(process.env.DATABASE_PATH || path.join(__dirname, '../data/mammogram.db'));
db.initialize();

// Make database available to routes
app.locals.db = db;

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ PUBLIC ROUTES ============

// Authentication endpoints
const authController = new AuthController(db);
app.post('/api/auth/login', (req, res) => authController.login(req, res));
app.post('/api/auth/register', (req, res) => authController.register(req, res));
app.post('/api/auth/logout', (req, res) => authController.logout(req, res));

// ============ PROTECTED ROUTES ============

// Apply authentication middleware
app.use('/api', authenticate);

// User endpoints
const userController = new UserController(db);
app.get('/api/users', (req, res) => userController.listUsers(req, res));
app.get('/api/users/:id', (req, res) => userController.getUser(req, res));
app.put('/api/users/:id', (req, res) => userController.updateUser(req, res));
app.delete('/api/users/:id', authorize(['admin']), (req, res) => userController.deleteUser(req, res));

// Hospital endpoints
const hospitalController = new HospitalController(db);
app.get('/api/hospitals', (req, res) => hospitalController.listHospitals(req, res));
app.get('/api/hospitals/:id', (req, res) => hospitalController.getHospital(req, res));
app.post('/api/hospitals', authorize(['admin']), (req, res) => hospitalController.createHospital(req, res));
app.put('/api/hospitals/:id', authorize(['admin', 'hospital']), (req, res) => hospitalController.updateHospital(req, res));

// Patient endpoints
const patientController = new PatientController(db);
app.get('/api/patients', (req, res) => patientController.listPatients(req, res));
app.get('/api/patients/:id', (req, res) => patientController.getPatient(req, res));
app.post('/api/patients', authorize(['hospital', 'admin']), (req, res) => patientController.createPatient(req, res));
app.put('/api/patients/:id', authorize(['hospital', 'admin']), (req, res) => patientController.updatePatient(req, res));

// Image endpoints
const imageController = new ImageController(db);
app.get('/api/images', (req, res) => imageController.listImages(req, res));
app.get('/api/images/:id', (req, res) => imageController.getImage(req, res));
app.post('/api/images/upload', authorize(['hospital', 'admin']), (req, res) => imageController.uploadImage(req, res));
app.put('/api/images/:id', authorize(['hospital', 'admin']), (req, res) => imageController.updateImage(req, res));

// Annotation endpoints
const annotationController = new AnnotationController(db);
app.get('/api/annotations', (req, res) => annotationController.listAnnotations(req, res));
app.get('/api/annotations/:id', (req, res) => annotationController.getAnnotation(req, res));
app.post('/api/annotations', (req, res) => annotationController.createAnnotation(req, res));
app.put('/api/annotations/:id', (req, res) => annotationController.updateAnnotation(req, res));
app.delete('/api/annotations/:id', (req, res) => annotationController.deleteAnnotation(req, res));

// Download request endpoints
const downloadController = new DownloadRequestController(db);
app.get('/api/download-requests', (req, res) => downloadController.listDownloadRequests(req, res));
app.post('/api/download-requests', (req, res) => downloadController.createDownloadRequest(req, res));
app.post('/api/download-requests/:id/approve', authorize(['admin']), (req, res) => downloadController.approveDownloadRequest(req, res));
app.post('/api/download-requests/:id/reject', authorize(['admin']), (req, res) => downloadController.rejectDownloadRequest(req, res));

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`✓ Database: ${process.env.DATABASE_PATH || 'SQLite'}`);
});

export default app;
