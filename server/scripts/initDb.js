import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'sakhiguide';

async function initDb() {
  console.log('🔄 Initializing Evara AI MySQL Database...');
  console.log(`📡 Connecting to MySQL server at ${DB_HOST} as ${DB_USER}...`);

  let connection;
  try {
    // Connect without database to ensure database can be created
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
    });

    console.log('✅ Connected to MySQL server.');

    const schemaPath = path.resolve(__dirname, '../sql/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log(`📄 Executing schema from ${schemaPath}...`);
    await connection.query(sql);

    // Migration Check: If sessions exists from earlier version without user_id column
    await connection.query(`USE \`${DB_NAME}\``);
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sessions' AND COLUMN_NAME = 'user_id'
    `, [DB_NAME]);

    if (columns.length === 0) {
      console.log('🔄 Applying migration: Adding user_id column and foreign key to sessions table...');
      await connection.query(`
        ALTER TABLE sessions 
        ADD COLUMN user_id INT NULL AFTER id,
        ADD INDEX idx_sessions_user (user_id),
        ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
      console.log('✅ Migration complete: sessions.user_id added.');
    }

    console.log(`✨ Database '${DB_NAME}' and tables created / verified successfully!`);
    console.log('   - users');
    console.log('   - sessions (with optional user_id for logged-in accounts)');
    console.log('   - messages');
    console.log('   - symptom_reports');
    console.log('   - red_flag_events');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDb();
