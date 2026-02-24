import { execSync } from "child_process";

export default function globalSetup() {
  const env = {
    ...process.env,
    DATABASE_URL: "file:./prisma/e2e-test.db",
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes",
  };
  execSync("npx prisma db push --force-reset --accept-data-loss", {
    env,
    stdio: "inherit",
  });
  execSync("npx prisma db seed", { env, stdio: "inherit" });
  execSync("npx tsx e2e/seed-e2e-data.ts", { env, stdio: "inherit" });
}
