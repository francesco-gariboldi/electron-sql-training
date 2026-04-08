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
    // Log the success of client connection
    console.log("Connected to PostgreSQL database successfully.\n");
    // Log a tutorial for using SQL
    console.log("TUTORIAL:");
    console.log("Creating a new table: runQuery('CREATE TABLE your_table (id SERIAL PRIMARY KEY, name VARCHAR(100));');");
    console.log("Adding data into a table: runQuery('INSERT INTO your_table (name) VALUES (\'Alice\');');");
    console.log("Removing a table: runQuery('DROP TABLE your_table;');");
    console.log("Removing some data: runQuery('DELETE FROM your_table WHERE name = \'Alice\';');");
    console.log("Selecting all data from a table: runQuery('SELECT * FROM your_table;');");
    console.log("Seeing all tables in the database: runQuery('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';');");
    console.log("Getting help on SQL syntax: https://www.postgresql.org/docs/current/sql.html");
    console.log("For more complex queries, you can use JOINs, WHERE clauses, and aggregate functions. For example:");
    console.log('runQuery("SELECT users.name, orders.amount FROM users JOIN orders ON users.id = orders.user_id WHERE orders.amount > 100;");\n');
    console.log("To enter in SQL interactive mode inside the docker container, you can use the following command:");
    console.log("docker exec -it your_container_name psql -U myuser -d mydb");
    console.log("In this case: docker compose exec -it db psql -U myuser -d mydb");
    console.log("Once in psql, you can run SQL commands directly. Type \\q to exit.\n");
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

// Example usage for practice:
runQuery("SELECT NOW()");