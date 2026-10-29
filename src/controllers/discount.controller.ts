import { Request, Response } from 'express';
import pool from '../config/database';

// 1. Ambil Semua Diskon
export const getDiscounts = async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM discounts ORDER BY id DESC');
    const mapped = rows.map((d: any) => ({
      id: d.id.toString(),
      code: d.code,
      name: d.name,
      type: d.type as 'PERCENTAGE' | 'FIXED',
      value: Number(d.value) || 0,
      minPurchase: Number(d.min_purchase) || 0,
      isActive: d.is_active === 1,
    }));
    return res.json(mapped);
  } catch (error: any) {
    console.error('Error getDiscounts:', error);
    return res.status(500).json({ message: 'Gagal mengambil data diskon', error: error.message });
  }
};

// 2. Tambah Diskon Baru
export const createDiscount = async (req: Request, res: Response): Promise<any> => {
  try {
    const { code, name, type, value, minPurchase } = req.body;
    if (!code || !name || value === undefined) {
      return res.status(400).json({ message: 'Kode, nama, dan nilai diskon wajib diisi' });
    }

    const [result]: any = await pool.query(
      `INSERT INTO discounts (code, name, type, value, min_purchase, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [
        code.toUpperCase(),
        name,
        type === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
        Number(value),
        Number(minPurchase) || 0,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Diskon berhasil dibuat',
      discount: {
        id: result.insertId.toString(),
        code: code.toUpperCase(),
        name,
        type: type === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
        value: Number(value),
        minPurchase: Number(minPurchase) || 0,
        isActive: true,
      },
    });
  } catch (error: any) {
    console.error('Error createDiscount:', error);
    return res.status(500).json({ message: 'Gagal menambahkan diskon', error: error.message });
  }
};

// 3. Toggle Status Aktif Diskon
export const toggleDiscountStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE discounts SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?`,
      [id]
    );

    const [updated]: any = await pool.query('SELECT is_active FROM discounts WHERE id = ?', [id]);
    const isActive = updated.length > 0 && updated[0].is_active === 1;

    return res.json({
      success: true,
      message: 'Status diskon berhasil diubah',
      isActive,
    });
  } catch (error: any) {
    console.error('Error toggleDiscountStatus:', error);
    return res.status(500).json({ message: 'Gagal mengubah status diskon', error: error.message });
  }
};

// 4. Hapus Diskon
export const deleteDiscount = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM discounts WHERE id = ?', [id]);
    return res.json({
      success: true,
      message: 'Diskon berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleteDiscount:', error);
    return res.status(500).json({ message: 'Gagal menghapus diskon', error: error.message });
  }
};
