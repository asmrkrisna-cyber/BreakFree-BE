import { Request, Response } from 'express';
import pool from '../config/database';

// 1. Ambil Semua Daftar Kasir
export const getCashiers = async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows]: any = await pool.query(
      'SELECT id, name, is_active, created_at FROM cashiers ORDER BY name ASC'
    );
    return res.json(rows);
  } catch (error: any) {
    console.error('Error getCashiers:', error);
    return res.status(500).json({ message: 'Gagal mengambil data kasir', error: error.message });
  }
};

// 2. Tambah Kasir Baru
export const createCashier = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, pin } = req.body;
    if (!name || !pin) {
      return res.status(400).json({ message: 'Nama kasir dan PIN wajib diisi' });
    }

    if (pin.length < 4) {
      return res.status(400).json({ message: 'PIN minimal terdiri dari 4 digit angka' });
    }

    const cleanName = name.trim().toLowerCase();

    // Cek apakah nama kasir sudah ada
    const [existing]: any = await pool.query(
      'SELECT id FROM cashiers WHERE LOWER(name) = ?',
      [cleanName]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: `Kasir dengan nama "${name}" sudah terdaftar` });
    }

    const [result]: any = await pool.query(
      'INSERT INTO cashiers (name, pin, is_active, created_at) VALUES (?, ?, 1, NOW())',
      [cleanName, pin]
    );

    return res.status(201).json({
      success: true,
      message: 'Kasir baru berhasil ditambahkan',
      cashier: {
        id: result.insertId,
        name: cleanName,
        is_active: 1,
      },
    });
  } catch (error: any) {
    console.error('Error createCashier:', error);
    return res.status(500).json({ message: 'Gagal menambahkan kasir', error: error.message });
  }
};

// 3. Ubah / Reset PIN Kasir
export const updateCashierPin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { newPin } = req.body;

    if (!newPin || newPin.length < 4) {
      return res.status(400).json({ message: 'PIN baru minimal harus 4 digit angka' });
    }

    const [result]: any = await pool.query(
      'UPDATE cashiers SET pin = ? WHERE id = ?',
      [newPin, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Kasir tidak ditemukan' });
    }

    return res.json({
      success: true,
      message: 'PIN kasir berhasil diperbarui',
    });
  } catch (error: any) {
    console.error('Error updateCashierPin:', error);
    return res.status(500).json({ message: 'Gagal mengubah PIN kasir', error: error.message });
  }
};

// 4. Hapus Kasir (Wajib Verifikasi PIN Keamanan)
export const deleteCashier = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const pin = req.body?.pin || req.query?.pin;

    if (!pin) {
      return res.status(400).json({
        message: 'Kode PIN verifikasi wajib dimasukkan untuk menghapus akun kasir.',
      });
    }

    // Ambil data kasir
    const [rows]: any = await pool.query('SELECT id, name, pin FROM cashiers WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Kasir tidak ditemukan' });
    }

    const cashier = rows[0];

    // Verifikasi PIN yang dibuat di awal
    if (cashier.pin !== String(pin).trim()) {
      return res.status(401).json({
        message: 'Kode verifikasi PIN salah! Kasir gagal dihapus.',
      });
    }

    // Pastikan kasir tidak sedang aktif di shift yang terbuka
    const [activeShifts]: any = await pool.query(
      "SELECT id FROM shifts WHERE LOWER(cashier_name) = ? AND shift_status = 'OPEN'",
      [cashier.name.toLowerCase()]
    );
    if (activeShifts && activeShifts.length > 0) {
      return res.status(400).json({
        message: `Kasir "${cashier.name}" sedang memiliki shift aktif. Tutup shift terlebih dahulu sebelum menghapus kasir.`,
      });
    }

    const [result]: any = await pool.query('DELETE FROM cashiers WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Kasir tidak ditemukan' });
    }

    return res.json({
      success: true,
      message: `Kasir "${cashier.name}" berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('Error deleteCashier:', error);
    return res.status(500).json({ message: 'Gagal menghapus kasir', error: error.message });
  }
};

// 5. Verifikasi PIN Kasir (Digunakan saat Buka & Tutup Shift)
export const verifyCashierPin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, pin } = req.body;

    if (!name || !pin) {
      return res.status(400).json({ valid: false, message: 'Nama kasir dan PIN wajib diisi' });
    }

    const cleanName = name.trim().toLowerCase();

    const [rows]: any = await pool.query(
      'SELECT id, name, pin, is_active FROM cashiers WHERE LOWER(name) = ? LIMIT 1',
      [cleanName]
    );

    if (rows.length === 0) {
      return res.status(404).json({ valid: false, message: `Kasir "${name}" tidak ditemukan` });
    }

    const cashier = rows[0];

    if (cashier.is_active === 0) {
      return res.status(403).json({ valid: false, message: 'Akun kasir ini sedang dinonaktifkan' });
    }

    if (cashier.pin !== String(pin).trim()) {
      return res.status(401).json({ valid: false, message: 'PIN yang dimasukkan salah!' });
    }

    return res.json({
      valid: true,
      message: 'PIN valid dan terverifikasi',
      cashier: {
        id: cashier.id,
        name: cashier.name,
      },
    });
  } catch (error: any) {
    console.error('Error verifyCashierPin:', error);
    return res.status(500).json({ valid: false, message: 'Gagal memverifikasi PIN', error: error.message });
  }
};
