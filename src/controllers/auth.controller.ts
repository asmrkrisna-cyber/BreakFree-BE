import { Request, Response } from 'express';
import pool from '../config/database';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';

const JWT_SECRET: Secret = (process.env.JWT_SECRET || 'rahasiabanget123') as Secret;

export const login = async (req: Request, res: Response): Promise<Response> => {
  const { username, password } = req.body;

  try {
    const [rows] = (await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    )) as [any[], any];

    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: 'Username atau password salah!' });
    }

    const user = rows[0];

    if (password !== user.password) {
      return res.status(401).json({ message: 'Username atau password salah!' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1d' } as SignOptions
    );

    return res.json({
      message: 'Login berhasil!',
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error('Error saat login:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};