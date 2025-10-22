export class HttpError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    // Ensure the prototype chain is set up correctly
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
