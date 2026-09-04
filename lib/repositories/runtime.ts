export function isPostgresPersistenceEnabled() {
  return process.env.AGRI_PERSISTENCE?.trim().toLowerCase() === "postgres";
}
