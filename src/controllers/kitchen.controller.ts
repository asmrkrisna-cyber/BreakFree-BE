import { Request, Response } from 'express';
import pool from '../config/database';

function formatTimeAgo(dateInput: any): string {
  if (!dateInput) return 'Baru saja';
  const now = new Date();
  const created = new Date(dateInput);
  const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
  if (diffInMinutes <= 1) return '1 mnt';
  if (diffInMinutes < 60) return `${diffInMinutes} mnt`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  return `${diffInHours} jam`;
}

// 1. Ambil Semua Pesanan Dapur Aktif
export const getKitchenOrders = async (req: Request, res: Response): Promise<any> => {
  try {
    const [orders]: any = await pool.query(
      `SELECT * FROM kitchen_orders 
       WHERE status NOT IN ('Selesai', 'Dibatalkan') 
       ORDER BY id DESC`
    );

    const ordersWithItems = await Promise.all(
      orders.map(async (o: any) => {
        const [items]: any = await pool.query(
          'SELECT name, quantity as qty, variant FROM kitchen_order_items WHERE kitchen_order_id = ?',
          [o.id]
        );

        const diffMinutes = Math.floor((new Date().getTime() - new Date(o.created_at).getTime()) / (1000 * 60));

        return {
          id: o.order_number || `#BF-${o.id}`,
          rawId: o.id,
          customerName: o.customer_name,
          source: o.source || 'Kasir',
          isLiveApp: o.source === 'App BreakFree',
          orderType: o.order_type || 'Dine-in',
          tableNumber: o.table_number || '-',
          paymentMethod: o.payment_method || 'Cash',
          timeAgo: formatTimeAgo(o.created_at),
          status: o.status,
          isOverdue: diffMinutes > 15 && o.status !== 'Siap Diambil',
          note: o.note || '',
          cancelReason: o.cancel_reason || '',
          items: items.map((i: any) => ({
            name: i.name,
            qty: Number(i.qty) || 1,
            variant: i.variant || '',
          })),
        };
      })
    );

    return res.json(ordersWithItems);
  } catch (error: any) {
    console.error('Error getKitchenOrders:', error);
    return res.status(500).json({ message: 'Gagal mengambil pesanan dapur', error: error.message });
  }
};

// 2. Update Status Pesanan Dapur (Baru -> Diproses -> Siap Diambil -> Selesai)
export const updateKitchenStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params; // rawId or order_number
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status wajib diisi' });
    }

    await pool.query(
      'UPDATE kitchen_orders SET status = ? WHERE id = ? OR order_number = ?',
      [status, id, id]
    );

    return res.json({
      success: true,
      message: `Status pesanan berhasil diubah menjadi ${status}`,
    });
  } catch (error: any) {
    console.error('Error updateKitchenStatus:', error);
    return res.status(500).json({ message: 'Gagal mengubah status dapur', error: error.message });
  }
};

// 3. Batalkan Pesanan Dapur
export const cancelKitchenOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await pool.query(
      'UPDATE kitchen_orders SET status = "Dibatalkan", cancel_reason = ? WHERE id = ? OR order_number = ?',
      [reason || 'Dibatalkan oleh staf dapur', id, id]
    );

    return res.json({
      success: true,
      message: 'Pesanan dapur berhasil dibatalkan',
    });
  } catch (error: any) {
    console.error('Error cancelKitchenOrder:', error);
    return res.status(500).json({ message: 'Gagal membatalkan pesanan dapur', error: error.message });
  }
};
