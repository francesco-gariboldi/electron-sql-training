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

### Configuration
To configure a secure SQL db access, usually is a good idea to store environment variables in an `.env` file or in Github Secrets.