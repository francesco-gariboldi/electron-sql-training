const { Client } = require('pg');

async function runQuery(query) {
  const client = new Client({
    user: "myuser",
    host: "localhost",
    database: "mydb",
    password: "mypassword",
    port: 5432,
  });
  await client.connect();
  
  try {
    const res = await client.query(query);
    console.log("Query result:", res.rows);
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

// Example usage for practice:
runQuery("SELECT NOW()");
