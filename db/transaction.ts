import type { Pool, PoolClient } from "pg";

export async function withTransaction<T>(
  database: Pick<Pool, "connect">,
  work: (client: PoolClient) => Promise<T>,
) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
