# Usage Guide
This is a fast desktop app builder with a SQL environment running in a Docker container. This can be used to train with SQL databases and language.

## Running the App
1. Install dependencies: `npm install` will install all dependencies contained in `package.json`.
2. If in WSL2 start Docker with `$sudo service docker start`
3. Start the PostgreSQL container: `docker compose up -d`
4. Run the application: `npm start`

## Example
To verify that your PostgreSQL setup works correctly, try running a simple query that retrieves the current timestamp:
1. Open `app.js` and ensure that the following snippet is included:
    ```javascript
    runQuery("SELECT NOW()");
    ```
2. Save the changes.
3. Run the application using:
    ```
    npm start
    ```
4. Check your terminal output to see the timestamp from the database.

## Viewing the Database
To inspect your PostgreSQL database:

1. Connect to the PostgreSQL container:
   ```bash
   docker exec -it $(docker ps --filter "ancestor=postgres" -q) psql -U POSTGRES_USER
   ```
2. List all tables within your current database:
   ```sql
   \dt
   ```
3. Run additional SQL commands as needed.


The connection errors occur because psql defaults to using the username as the database name. Since the database name is set to "training" in your docker-compose.yml, you need to specify it when connecting.

Try running the command:

```bash
docker exec -it $(docker ps --filter "ancestor=postgres" -q) psql -U [username] -d training
``` 

This command explicitly connects to the "training" database as user "[username]".

## Graphical database view (tables + changes)
This project now includes **pgAdmin 4** running in Docker so you can browse tables/columns/relations in a GUI.

### Start
1. Start containers:
   - `npm run docker:up` (or `docker compose up -d`)
2. Open pgAdmin in your browser:
   - http://localhost:5050
   - login: `admin@local`
   - password: `admin`

### Connect pgAdmin to Postgres
In pgAdmin:
1. **Add New Server**
2. **Host name/address**: `db` (this is the Docker Compose service name)
3. **Port**: `5432`
4. **Maintenance database**: `mydb`
5. **Username**: `myuser`
6. **Password**: `mypassword`

After connecting, expand:
`Servers > (your server) > Databases > mydb > Schemas > public > Tables`

### Viewing schema changes
Postgres is initialized with an event trigger that logs DDL changes (CREATE/ALTER/DROP, etc.) into:
- `public.schema_events`

You can query it from pgAdmin or from `app.js`:
```sql
SELECT * FROM public.schema_events ORDER BY happened_at DESC LIMIT 50;
```

Notes:
- pgAdmin refreshes the schema view when you click refresh; it does not live-stream changes.
- The `schema_events` table gives you a chronological view of changes that *is* updated immediately after each DDL statement.

## Live schema graph (Vite web app)
This repo now includes a small web UI that draws your tables and foreign-key relationships and updates when DDL happens.

### Components
- Backend: `server.js` (Express + WebSocket, polls `public.schema_events`)
- Frontend: `web/` (Vite + React + React Flow)

### Run
1. Start Postgres:
   - `docker compose up -d`
2. Install frontend deps (one-time):
   - `npm --prefix web install`
3. Install backend deps (one-time):
   - `npm install`
4. Start backend + frontend:
   - `npm run dev`
5. Open:
   - http://localhost:5173

### Notes
- The graph refreshes on each DDL event (CREATE/ALTER/DROP). If you run only DML (INSERT/UPDATE/DELETE), the schema will not change.
- If you want to visualize row-level changes too, we can add another trigger table (per table) or use logical replication/`wal2json`.

## Configuration
To configure a secure SQL db access, usually is a good idea to store environment variables in an `.env` file or in Github Secrets.