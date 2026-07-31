import { spawn } from "node:child_process";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDirectory, "..");
const localDatabaseUrl = "postgresql://appsec:appsec@localhost:5432/appsec_local";
const postgresWaitTimeoutMs = 60_000;
const postgresPollIntervalMs = 2_000;

loadEnv({ path: resolve(repoRoot, ".env"), quiet: true });

const childEnvironment = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || localDatabaseUrl,
};

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: childEnvironment,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });

    child.on("error", (error) => {
      rejectRun(error);
    });

    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      const detail = signal ? `signal ${signal}` : `exit code ${code}`;
      rejectRun(new Error(`${command} ${args.join(" ")} failed with ${detail}.`));
    });
  });
}

function check(command, args) {
  return new Promise((resolveCheck) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: childEnvironment,
      stdio: "ignore",
      shell: process.platform === "win32",
    });

    child.on("error", () => {
      resolveCheck(false);
    });

    child.on("exit", (code) => {
      resolveCheck(code === 0);
    });
  });
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function waitForPostgres() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < postgresWaitTimeoutMs) {
    const isReady = await check("docker", [
      "compose",
      "exec",
      "-T",
      "postgres",
      "pg_isready",
      "-U",
      "appsec",
      "-d",
      "appsec_local",
    ]);

    if (isReady) {
      return;
    }

    await sleep(postgresPollIntervalMs);
  }

  throw new Error("Postgres did not become ready within 60 seconds.");
}

function startWebServer() {
  console.log("Starting web dev server at http://localhost:3000...");

  const child = spawn("pnpm", ["dev:web"], {
    cwd: repoRoot,
    env: childEnvironment,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.once("SIGINT", forwardSignal);
  process.once("SIGTERM", forwardSignal);

  child.on("error", (error) => {
    console.error(`Failed to start the web dev server: ${error.message}`);
    process.exitCode = 1;
  });

  child.on("exit", (code, signal) => {
    process.removeListener("SIGINT", forwardSignal);
    process.removeListener("SIGTERM", forwardSignal);

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exitCode = code ?? 1;
  });
}

async function main() {
  console.log("Starting Postgres...");
  await run("docker", ["compose", "up", "-d", "postgres"]);

  console.log("Waiting for Postgres...");
  await waitForPostgres();

  console.log("Generating Prisma client...");
  await run("pnpm", ["db:generate"]);

  console.log("Applying database migrations...");
  await run("pnpm", ["db:migrate:deploy"]);

  startWebServer();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
