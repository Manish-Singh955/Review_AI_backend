const notFound = (req, res, next) => {
  res.status(404);
  next(new Error('Route not found'));
};

const errorHandler = (error, req, res, next) => {
  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  let message = statusCode === 500 ? 'Server error' : error.message;

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body must contain valid JSON' });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid resource ID' });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: 'Please check the submitted fields' });
  }

  if (error.code === 11000) {
    return res.status(400).json({ success: false, message: 'A record with this value already exists' });
  }

  if (statusCode !== 500 && error.message) message = error.message;
  return res.status(statusCode).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
