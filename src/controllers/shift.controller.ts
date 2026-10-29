import { Request, Response } from 'express';
import pool from '../config/database';

export const startShift = async (req: Request, res: Response): Promise<any> => {
  const { cashierName, shiftStatus, startingCash } = req.body;

  try {
    // Pastikan shift sebelumnya ditutup sebelum shift baru dimulai
    await pool.query(
      'UPDATE shifts SET shift_status = "CLOSED", end_time = NOW() WHERE shift_status != "CLOSED"'
    );

    const [result]: any = await pool.query(
      `INSERT INTO shifts (cashier_name, shift_status, starting_cash, start_time) 
       VALUES (?, ?, ?, NOW())`,
      [
        cashierName || 'Kasir', 
        shiftStatus || 'Opening', 
        Number(startingCash) || 0
      ]
    );

    return res.status(201).json({
      message: 'Shift berhasil dimulai!',
      shiftId: result.insertId,
      cashierName,
      startingCash,
    });
  } catch (error) {
    console.error('Gagal menyimpan shift:', error);
    return res.status(500).json({ message: 'Gagal menyimpan data shift' });
  }
};

export const getActiveShift = async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM shifts ORDER BY id DESC LIMIT 1'
    );

    if (rows.length === 0 || rows[0].shift_status === 'CLOSED') {
      return res.status(200).json({ active: false, message: 'Belum ada shift' });
    }

    return res.status(200).json({
      active: true,
      shift: rows[0],
    });
  } catch (error) {
    console.error('Gagal mengambil shift:', error);
    return res.status(500).json({ message: 'Gagal mengambil data shift' });
  }
};

export const closeShift = async (req: Request, res: Response): Promise<any> => {
  const { shiftId } = req.body;

  try {
    const [shiftRows]: any = await pool.query('SELECT * FROM shifts WHERE id = ?', [shiftId]);
    if (shiftRows.length === 0) {
      return res.status(404).json({ message: 'Shift tidak ditemukan' });
    }

    const currentShift = shiftRows[0];
    const startTime = currentShift.start_time;

    const [trxRows]: any = await pool.query(
      `SELECT 
        COALESCE(SUM(total), 0) as grandTotal,
        COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%cash%' OR LOWER(payment_method) LIKE '%tunai%' THEN total ELSE 0 END), 0) as totalCash,
        COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%qris%' OR LOWER(payment_method) LIKE '%non%' THEN total ELSE 0 END), 0) as totalQRIS,
        COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%shopee%' THEN total ELSE 0 END), 0) as totalShopeeFood
       FROM transactions WHERE created_at >= ? AND (status != "VOID" OR status IS NULL)`,
      [startTime]
    );

    const summary = trxRows[0];
    const startingCash = Number(currentShift.starting_cash) || 0;
    const totalCash = Number(summary.totalCash) || 0;
    const totalQRIS = Number(summary.totalQRIS) || 0;
    const totalShopeeFood = Number(summary.totalShopeeFood) || 0;
    const grandTotal = Number(summary.grandTotal) || 0;

    const tax = Math.round(grandTotal * 0.1);
    const netRevenue = grandTotal - tax;
    const finalPhysicalCash = startingCash + totalCash;

    await pool.query(
      'UPDATE shifts SET shift_status = "CLOSED", end_time = NOW() WHERE id = ? OR shift_status != "CLOSED"',
      [shiftId]
    );

    return res.status(200).json({ 
      message: 'Shift berhasil ditutup',
      summary: { totalCash, totalQRIS, totalShopeeFood, tax, netRevenue, finalPhysicalCash }
    });
  } catch (error) {
    console.error('Gagal menutup shift:', error);
    return res.status(500).json({ message: 'Gagal menutup shift' });
  }
};

export const getShiftHistory = async (req: Request, res: Response): Promise<any> => {
  try {
    const [shifts]: any = await pool.query(
      'SELECT * FROM shifts WHERE shift_status = "CLOSED" ORDER BY id DESC'
    );

    const historyWithSales = await Promise.all(
      shifts.map(async (shift: any) => {
        const start = shift.start_time;
        const end = shift.end_time || new Date();

        const [trxRows]: any = await pool.query(
          `SELECT 
            COALESCE(SUM(total), 0) as grandTotal,
            COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%cash%' OR LOWER(payment_method) LIKE '%tunai%' THEN total ELSE 0 END), 0) as totalCash,
            COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%qris%' OR LOWER(payment_method) LIKE '%non%' THEN total ELSE 0 END), 0) as totalQRIS,
            COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%shopee%' THEN total ELSE 0 END), 0) as totalShopeeFood
           FROM transactions WHERE created_at >= ? AND created_at <= ? AND (status != "VOID" OR status IS NULL)`,
          [start, end]
        );

        const summary = trxRows[0];
        const startingCash = Number(shift.starting_cash) || 0;
        const totalCash = Number(summary.totalCash) || 0;
        const grandTotal = Number(summary.grandTotal) || 0;
        const tax = Math.round(grandTotal * 0.1);
        const netRevenue = grandTotal - tax;
        const finalPhysicalCash = startingCash + totalCash;

        return {
          ...shift,
          total_cash: totalCash,
          total_qris: Number(summary.totalQRIS) || 0,
          total_shopeefood: Number(summary.totalShopeeFood) || 0,
          tax_amount: tax,
          net_revenue: netRevenue,
          final_physical_cash: finalPhysicalCash,
        };
      })
    );

    return res.status(200).json(historyWithSales);
  } catch (error) {
    console.error('Gagal mengambil riwayat shift:', error);
    return res.status(500).json({ message: 'Gagal mengambil riwayat' });
  }
};

export const getShiftSummary = async (req: Request, res: Response): Promise<any> => {
  try {
    const [shiftRows]: any = await pool.query(
      'SELECT * FROM shifts ORDER BY id DESC LIMIT 1'
    );

    if (shiftRows.length === 0 || shiftRows[0].shift_status === 'CLOSED') {
      return res.status(200).json({ active: false, message: 'Tidak ada shift aktif' });
    }

    const currentShift = shiftRows[0];
    const shiftStartTime = currentShift.start_time;

    const [trxRows]: any = await pool.query(
      `SELECT 
        COUNT(*) as totalTransactions,
        COALESCE(SUM(total), 0) as grandTotal,
        COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%cash%' OR LOWER(payment_method) LIKE '%tunai%' THEN total ELSE 0 END), 0) as totalCash,
        COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%qris%' OR LOWER(payment_method) LIKE '%non%' THEN total ELSE 0 END), 0) as totalQRIS,
        COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%shopee%' THEN total ELSE 0 END), 0) as totalShopeeFood
       FROM transactions WHERE created_at >= ? AND (status != "VOID" OR status IS NULL)`,
      [shiftStartTime]
    );

    const [itemRows]: any = await pool.query(
      `SELECT ti.product_name, SUM(ti.quantity) as total_qty, SUM(ti.price * ti.quantity) as total_price 
       FROM transaction_items ti
       INNER JOIN transactions t ON ti.transaction_id = t.transaction_id
       WHERE t.created_at >= ? AND (t.status != "VOID" OR t.status IS NULL)
       GROUP BY ti.product_name`,
      [shiftStartTime]
    ).catch(() => []);

    const summary = trxRows[0];
    const startingCash = Number(currentShift.starting_cash) || 0;
    const totalCashSales = Number(summary.totalCash) || 0;
    const grandTotal = Number(summary.grandTotal) || 0;
    
    const tax = Math.round(grandTotal * 0.1);
    const netRevenue = grandTotal - tax;
    const expectedCashInDrawer = startingCash + totalCashSales;

    return res.status(200).json({
      active: true,
      shiftInfo: currentShift,
      totalTransactions: Number(summary.totalTransactions) || 0,
      grandTotal: grandTotal,
      totalCash: totalCashSales,
      totalQRIS: Number(summary.totalQRIS) || 0,
      totalShopeeFood: Number(summary.totalShopeeFood) || 0,
      tax: tax,
      netRevenue: netRevenue,
      expectedCashInDrawer: expectedCashInDrawer,
      soldItems: Array.isArray(itemRows) ? itemRows : [],
    });
  } catch (error) {
    console.error('Gagal mengambil rekap shift:', error);
    return res.status(500).json({ message: 'Gagal menghitung rekap shift' });
  }
};