# Fastify server template

Copy this directory into a new project and update the package name. Use Node.js 24. When you're ready to run the copy, install its dependencies, copy `.env.example` to `.env`, and supply a PostgreSQL connection URL and keys from your Clerk instance.

- `npm run dev` starts the server in watch mode. `npm run build` followed by `npm start` runs the compiled server.
- `GET /health` is a public liveness check and works even when PostgreSQL is unavailable.
- `GET /api/example` accepts a Clerk user session token as `Authorization: Bearer <token>` and runs a simple PostgreSQL query. It needs no tables.

Keep application services and repository interfaces in `src/core`, HTTP routes and configuration in `src/api`, and database adapters in `src/infrastructure`. Add Drizzle tables in `src/infrastructure/data/schema.ts`. Use `npm run db:generate` to generate SQL in `migrations/`, then review it before applying it with `npm run db:migrate`. Configure TLS through the connection URL as required by your database provider.
