import { HttpError } from '../HttpError';

describe('HttpError', () => {
  it('should create an error with the correct message, statusCode, and status', () => {
    const errorMessage = 'Not Found';
    const statusCode = 404;
    const error = new HttpError(errorMessage, statusCode);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(errorMessage);
    expect(error.statusCode).toBe(statusCode);
    expect(error.status).toBe('fail');
    expect(error.isOperational).toBe(true);
  });

  it('should set the status to "error" for 5xx status codes', () => {
    const errorMessage = 'Internal Server Error';
    const statusCode = 500;
    const error = new HttpError(errorMessage, statusCode);

    expect(error.status).toBe('error');
  });
});
