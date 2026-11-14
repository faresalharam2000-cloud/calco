import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'GET') {
    try {
      const data = {
        companies: await sql`SELECT * FROM companies`,
        branches: await sql`SELECT * FROM branches`,
        users: await sql`SELECT * FROM users`,
        contacts: await sql`SELECT * FROM contacts`,
        sales: await sql`SELECT * FROM sales`,
        purchases: await sql`SELECT * FROM purchases`,
        expenses: await sql`SELECT * FROM expenses`,
        payments: await sql`SELECT * FROM payments`,
        auditLogs: await sql`SELECT * FROM audit_logs`
      };
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { table, data, action, id } = req.body;
      const allowedTables = ['sales', 'purchases', 'expenses', 'payments', 'contacts', 'users', 'branches', 'companies', 'audit_logs'];
      if (!allowedTables.includes(table)) return res.status(400).json({ error: 'Invalid table name' });

      // ميزة الحذف
      if (action === 'delete') {
        await sql(`DELETE FROM ${table} WHERE id = $1`, [id]);
        return res.status(200).json({ success: true });
      }

      // الحفظ والتحديث
      if (data && data.length > 0) {
        for (const row of data) {
          const keys = Object.keys(row).map(k => k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`));
          const values = Object.values(row);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(',');
          const updates = keys.map((k, i) => `${k} = $${i + 1}`).join(',');
          
          await sql(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updates}`, values);
        }
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
