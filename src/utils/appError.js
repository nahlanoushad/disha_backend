/**
 * AppError class to standardize operational errors across the application.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    // Status is 'fail' for 4xx errors, 'error' for 5xx errors
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Flag to distinguish operational errors from programming errors

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
