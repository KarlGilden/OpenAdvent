function requireValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export function loadConfig() {
  const port = Number(process.env.PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return {
    port,
    host: process.env.HOST?.trim() || "127.0.0.1",
    databaseUrl: requireValue("DATABASE_URL"),
    clerk: {
      publishableKey: requireValue("CLERK_PUBLISHABLE_KEY"),
      secretKey: requireValue("CLERK_SECRET_KEY"),
    },
  };
}
