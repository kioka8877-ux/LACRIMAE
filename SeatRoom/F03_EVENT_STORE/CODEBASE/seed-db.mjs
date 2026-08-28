import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const connection = await mysql.createConnection(databaseUrl);
const db = drizzle(connection);

const guestsData = [
  { uuid: '8f2b41c2', firstName: 'Amélie', lastName: 'Laurent', phone: '+33 6 18 42 90 31', table: 'Table 03', status: 'present', checkInTime: new Date(Date.now() - 1000 * 60 * 5) },
  { uuid: '91c73d18', firstName: 'Thomas', lastName: 'Delorme', phone: '+33 6 52 11 08 72', table: 'Table 07', status: 'present', checkInTime: new Date(Date.now() - 1000 * 60 * 10) },
  { uuid: 'b41e73f2', firstName: 'Sofia', lastName: 'Bernard', phone: '+33 6 77 03 56 18', table: 'VIP A', status: 'present', checkInTime: new Date(Date.now() - 1000 * 60 * 15) },
  { uuid: 'c228f2b4', firstName: 'Nicolas', lastName: 'Morel', phone: '+33 6 09 27 44 63', table: 'Table 12', status: 'pending' },
  { uuid: 'd1891c73', firstName: 'Clara', lastName: 'Rousseau', phone: '+33 6 40 81 77 05', table: 'Table 04', status: 'pending' },
  { uuid: 'e73b41e7', firstName: 'Julien', lastName: 'Armand', phone: '+33 6 13 60 24 88', table: 'Table 09', status: 'flagged' },
];

console.log('Seeding guests...');
for (const guest of guestsData) {
  await connection.execute(
    'INSERT INTO guests (uuid, firstName, lastName, phone, `table`, status, checkInTime, eventId) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)',
    [guest.uuid, guest.firstName, guest.lastName, guest.phone, guest.table, guest.status, guest.checkInTime || null, 'event-grand-bal']
  );
}

console.log('Seed complete');
await connection.end();
