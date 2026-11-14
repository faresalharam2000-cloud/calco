// api/data.js
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // إعداد CORS للسماح للمتصفح بالاتصال
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = neon(process.env.DATABASE_URL);

  // 1. جلب البيانات (عندما يفتح المستخدم الموقع)
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

  // 2. حفظ البيانات (عندما يقوم المستخدم بإضافة أو حذف)
  if (req.method === 'POST') {
    try {
      const { table, data } = req.body;
      
      // قائمة الجداول المسموح بها لحماية قاعدة البيانات
      const allowedTables = ['sales', 'purchases', 'expenses', 'payments', 'contacts', 'users', 'branches', 'companies', 'audit_logs'];
      if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: 'Invalid table name' });
      }

      // لحفظ البيانات، سنقوم بمسح الجدول وإعادة إدخال البيانات المحدثة (لأن التطبيق يرسل المصفوفة كاملة)
      await sql(`DELETE FROM ${table}`);
      
      if (data && data.length > 0) {
        for (const row of data) {
          // تحويل أسماء الحقول من camelCase (الواجهة) إلى snake_case (قاعدة البيانات)
          const keys = Object.keys(row).map(k => k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`));
          const values = Object.values(row);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(',');
          
          await sql(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`, values);
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