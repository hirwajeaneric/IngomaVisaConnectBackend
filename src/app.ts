import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import visaRoutes from "./routes/visa.routes";
import visaApplicationRoutes from "./routes/visaApplication.routes";
import personalInfoRoutes from "./routes/personalInfo.routes";
import travelInfoRoutes from "./routes/travelInfo.routes";
import documentRoutes from "./routes/document.routes";
import financialInfoRoutes from "./routes/financialInfo.routes";
import messageRoutes from "./routes/message.routes";
import requestForDocumentRoutes from "./routes/requestForDocument.routes";
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import paymentRoutes from './routes/payment.routes';

dotenv.config();

const app: Application = express();

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: process.env.CORS_METHODS?.split(',') || ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: process.env.CORS_CREDENTIALS === 'true',
  maxAge: parseInt(process.env.CORS_MAX_AGE || '86400'),
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/visas', visaRoutes);
app.use('/api/applications', visaApplicationRoutes);
app.use('/api/personal-info', personalInfoRoutes);
app.use('/api/travel-info', travelInfoRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/financial-info', financialInfoRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/document-requests', requestForDocumentRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;