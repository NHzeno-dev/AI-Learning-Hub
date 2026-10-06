function errorHandler(err, _req, res, _next) {
  console.error('Unhandled error:', err);
  const status = Number.isInteger(err.status) ? err.status : 500;
  res.status(status).json({
    message: status >= 500 ? 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.' : (err.message || 'Yêu cầu không hợp lệ.'),
    code: err.code || 'SERVER_ERROR'
  });
}

module.exports = errorHandler;
