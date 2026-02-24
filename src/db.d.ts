import type * as BetterSqlite3 from "better-sqlite3";
declare const db: BetterSqlite3.Database;
export interface RequestRecord {
    id: string;
    app_slug: string;
    method: string;
    url: string;
    headers: string;
    query_params: string;
    body: string | null;
    ip: string | null;
    created_at?: string;
}
export declare const insertRequest: BetterSqlite3.Statement;
export declare const getRequestsByApp: BetterSqlite3.Statement;
export declare const clearRequestsByApp: BetterSqlite3.Statement;
export declare const deleteRequestById: BetterSqlite3.Statement;
export default db;
//# sourceMappingURL=db.d.ts.map