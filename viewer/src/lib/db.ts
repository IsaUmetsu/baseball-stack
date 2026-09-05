import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getDbPool() {
  if (!pool) {
    const host = process.env.DB_HOST || 'db';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const database = process.env.DB_NAME || 'baseball_2026';
    const user = process.env.DB_USER || 'baseball';
    const password = process.env.DB_PASSWORD || 'baseball';

    pool = mysql.createPool({
      host,
      port,
      database,
      user,
      password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
    });
  }
  return pool;
}

export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const dbPool = getDbPool();
  const [rows] = await dbPool.query(sql, params);
  return rows as T;
}
