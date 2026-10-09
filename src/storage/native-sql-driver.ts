import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import type { SqlConnection, SqlDriver, SqlValue } from "./sql-driver";

function connection(database: SQLiteDatabase): SqlConnection {
  return {
    exec: sql => database.execAsync(sql),
    run: async (sql, params: readonly SqlValue[] = []) => { await database.runAsync(sql, [...params]); },
    all: <T>(sql: string, params: readonly SqlValue[] = []) => database.getAllAsync<T>(sql, [...params]),
  };
}
export async function openNativeSqlDriver(): Promise<SqlDriver> {
  const database = await openDatabaseAsync("alalaybyahe.db");
  const sql = connection(database);
  return {
    ...sql,
    // SqlTransitRepository serializes every call on this private connection.
    // Keeping the same connection also preserves PRAGMA foreign_keys during writes.
    async transaction<T>(work: (transaction: SqlConnection) => Promise<T>): Promise<T> {
      let result!: T;
      await database.withTransactionAsync(async () => { result = await work(sql); });
      return result;
    },
    close: () => database.closeAsync(),
  };
}

