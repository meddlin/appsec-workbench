import { prisma } from "@appsec-workbench/db";

export const dynamic = "force-dynamic";

type DatabaseCheck = () => Promise<unknown>;

async function checkDatabase() {
  await prisma.$queryRaw`SELECT 1`;
}

export async function createHealthResponse(
  databaseCheck: DatabaseCheck = checkDatabase,
): Promise<Response> {
  try {
    await databaseCheck();
    return Response.json(
      { status: "healthy" },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return Response.json(
      { status: "unhealthy" },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export async function GET() {
  return createHealthResponse();
}
