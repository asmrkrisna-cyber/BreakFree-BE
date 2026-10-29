import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import v1Router from './routes/v1'; // Mengarah ke router v1

dotenv.config();

const app: Application = express();

// Middleware Global
app.use(cors());
app.use(express.json());

// API Versioning Prefix (Semua endpoint berawalan /api/v1)
app.use('/api/v1', v1Router);

// Test Route sederhana
app.get('/', (req, res) => {
  res.json({ message: 'BreakFree Backend API is running smoothly!' });
});

export default app;