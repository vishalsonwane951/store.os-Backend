export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'CastError') { statusCode = 400; message = 'Invalid ID format'; }
  if (err.code === 11000) { statusCode = 400; message = 'Duplicate field value'; }
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  res.status(statusCode).json({ success: false, message });
};

