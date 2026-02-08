const { Client } = require('pg');

const client = new Client({
  user: 'anjum',
  host: 'localhost',
  database: 'rideshare_db',
  port: 5432,
});

async function getData() {
  try {
    await client.connect();
    console.log("connected");

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log("tables : ");
    console.table(res.rows); 

    const res2 = await client.query(`
      SELECT * FROM rides;
    `);

    console.table(res2.rows);

    await client.end();
  } catch (err) {
    console.error("error : ", err.stack);
  }
}

getData();