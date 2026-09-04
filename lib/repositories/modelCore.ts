export class ModelRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "INVALID_STATUS"
      | "NO_ACTIVE_MODEL"
      | "CORRUPT_ARTIFACT",
  ) {
    super(message);
    this.name = "ModelRepositoryError";
  }
}
