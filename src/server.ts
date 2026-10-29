import app from './app';
import pool from './config/database';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Tes koneksi database
    await pool.query('SELECT 1');
    console.log('Database connected successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server due to database error:', error);
    process.exit(1);
  }
}

startServer();