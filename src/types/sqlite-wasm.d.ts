/**
 * Ambient declaration for @sqlite.org/sqlite-wasm.
 * No official @types package exists — this silences the implicit-any import
 * while keeping the usage in db.ts safely typed via eslint-disable any casts.
 */
declare module "@sqlite.org/sqlite-wasm" {
  const initSqlite: (opts?: { print?: () => void; printErr?: () => void }) => Promise<unknown>
  export default initSqlite
}
