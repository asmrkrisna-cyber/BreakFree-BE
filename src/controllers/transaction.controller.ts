import { Request, Response } from 'express';
import pool from '../config/database';

// 1. Membuat Transaksi Baru (POS)
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const {
      transactionId,
      customerName,
      tableNumber,
      subtotal,
      discountAmount,
      tax,
      total,
      paymentMethod,
      cashGiven,
      change,
      items,
    } = req.body;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO transactions 
        (transaction_id, customer_name, table_number, subtotal, discount_amount, tax, total, payment_method, cash_given, change_amount, status, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUKSES', NOW())`,
        [
          transactionId,
          customerName || 'Tamu / Umum',
          tableNumber || '-',
          subtotal || 0,
          discountAmount || 0,
          tax || 0,
          total || 0,
          paymentMethod || 'Cash',
          cashGiven || 0,
          change || 0,
        ]
      );

      if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          await connection.query(
            `INSERT INTO transaction_items 
            (transaction_id, product_name, price, quantity, note) 
            VALUES (?, ?, ?, ?, ?)`,
            [
              transactionId,
              item.name || item.product_name,
              item.price,
              item.quantity,
              item.note || '',
            ]
          );
        }
      }

      // Otomatis teruskan ke antrian Kitchen Live Tracking
      try {
        const orderSuffix = transactionId ? transactionId.replace(/[^0-9]/g, '').slice(-4) : '';
        const orderNumber = `#BF-${orderSuffix || Math.floor(1000 + Math.random() * 9000)}`;
        const orderType = tableNumber && tableNumber !== '-' ? 'Dine-in' : 'Takeaway';

        const [kResult]: any = await connection.query(
          `INSERT INTO kitchen_orders 
          (order_number, transaction_id, customer_name, source, order_type, table_number, payment_method, status, created_at)
          VALUES (?, ?, ?, 'Kasir', ?, ?, ?, 'Baru', NOW())`,
          [
            orderNumber,
            transactionId,
            customerName || 'Tamu / Umum',
            orderType,
            tableNumber || '-',
            paymentMethod || 'Cash',
          ]
        );

        const kitchenOrderId = kResult.insertId;
        if (items && Array.isArray(items) && items.length > 0) {
          for (const item of items) {
            await connection.query(
              `INSERT INTO kitchen_order_items (kitchen_order_id, name, quantity, variant)
               VALUES (?, ?, ?, ?)`,
              [kitchenOrderId, item.name || item.product_name, item.quantity, item.note || '']
            );
          }
        }
      } catch (kitchenErr) {
        console.warn('Gagal meneruskan ke antrian dapur (non-blocking):', kitchenErr);
      }

      await connection.commit();
      connection.release();

      return res.status(201).json({
        success: true,
        message: 'Transaksi berhasil disimpan ke database',
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error: any) {
    console.error('Error createTransaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan transaksi ke server',
      error: error.message,
    });
  }
};

// 2. Mengambil Semua Daftar Transaksi (Riwayat)
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transactions ORDER BY id DESC');
    return res.status(200).json(rows);
  } catch (error: any) {
    console.error('Error getTransactions:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil riwayat transaksi' });
  }
};

// 3. Mengambil Detail Item Berdasarkan ID Transaksi
export const getTransactionItems = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const [rows] = await pool.query('SELECT * FROM transaction_items WHERE transaction_id = ?', [transactionId]);
    return res.status(200).json(rows);
  } catch (error: any) {
    console.error('Error getTransactionItems:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail item transaksi' });
  }
};

// 4. Membatalkan / Void Transaksi
export const voidTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { reason } = req.body;
    await pool.query(
      'UPDATE transactions SET status = "VOID", void_reason = ? WHERE transaction_id = ?',
      [reason || 'Void oleh Kasir', transactionId]
    );

    // Otomatis batalkan status pesanan di dapur jika ada
    await pool.query(
      'UPDATE kitchen_orders SET status = "Dibatalkan", cancel_reason = ? WHERE transaction_id = ?',
      [`Transaksi Void: ${reason || 'Dibatalkan kasir'}`, transactionId]
    ).catch(() => {});

    return res.status(200).json({ success: true, message: 'Transaksi berhasil di-void' });
  } catch (error: any) {
    console.error('Error voidTransaction:', error);
    return res.status(500).json({ success: false, message: 'Gagal melakukan void transaksi' });
  }
};