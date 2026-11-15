/** A clip must be replaced or trimmed; repeating an analysis request cannot fix it. */
export class ClipValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClipValidationError";
  }
}
