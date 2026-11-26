# Fastify server template

Copy this directory into a new project and update the package name. Use Node.js 24. When you're ready to run the copy, install its dependencies, copy `.env.example` to `.env`, and supply a PostgreSQL connection URL and keys from your Clerk instance.

- `npm run dev` starts the server in watch mode. `npm run build` followed by `npm start` runs the compiled server.
- `GET /health` is a public liveness check and works even when PostgreSQL is unavailable.
- `GET /api/example` accepts a Clerk user session token as `Authorization: Bearer <token>` and runs a simple PostgreSQL query. It needs no tables.
- `GET /api/user` accepts the same Clerk session token. It provisions a local profile on first access and returns `{ id, name, email }` on each successful request. Apply the database migrations before using it.

The client displays the signed-in user's profile through `/api/user`. Run the client and server with keys from the same Clerk instance. Vite proxies `/api` to `http://127.0.0.1:3000` locally. Set `API_PROXY_TARGET` in the client environment if Fastify listens elsewhere. When serving a production client build, route `/api` on the client origin to Fastify.

Keep application services and repository interfaces in `src/core`, HTTP routes and configuration in `src/api`, and database adapters in `src/infrastructure`. Add Drizzle tables in `src/infrastructure/data/schema.ts`. Use `npm run db:generate` to generate SQL in `migrations/`, then review it before applying it with `npm run db:migrate`. Configure TLS through the connection URL as required by your database provider.

## Tests

Run `npm test` from `server` for the service and Fastify injection tests in `tests/unit`. They run without PostgreSQL or a live Clerk instance. The PostgreSQL tests live in `tests/integration`. Both folders use the `.test.ts` suffix.

To run the integration tests against local PostgreSQL, create a dedicated database such as `openadvent_test` and give the test connection user permission to create schemas and tables in it. If `psql` is on your PATH, you can create it with `psql -h 127.0.0.1 -U postgres -d postgres -c "CREATE DATABASE openadvent_test"`.

From `server`, copy `.env.test.example` to `.env.test`, fill in `TEST_DATABASE_URL`, and run `npm run test:integration`. The suite applies the Drizzle migrations and removes the user records it creates. It uses `TEST_DATABASE_URL` independently of the application's `DATABASE_URL` and requires no Clerk credentials.
