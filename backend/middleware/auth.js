const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return res.status(401).json({ message: 'Chưa đăng nhập.', code: 'AUTH_REQUIRED' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload?.id) throw new Error('Invalid token payload');
    req.user = payload;
    next();
  } catch (err) {
    const code = err?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    return res.status(401).json({ message: code === 'TOKEN_EXPIRED' ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : 'Token không hợp lệ.', code });
  }
};
