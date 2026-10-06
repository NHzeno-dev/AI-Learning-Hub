const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const authLimit = rateLimit({ windowMs: 15 * 60_000, max: 30, message: 'Có quá nhiều lần đăng nhập/đăng ký. Vui lòng thử lại sau.' });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tokenFor(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}
function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}

router.post('/register', authLimit, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!name || !email || !password) return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.', code: 'FIELDS_REQUIRED' });
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Họ tên phải từ 2 đến 80 ký tự.', code: 'INVALID_NAME' });
    if (!emailPattern.test(email) || email.length > 160) return res.status(400).json({ message: 'Email không hợp lệ.', code: 'INVALID_EMAIL' });
    if (password.length < 6 || password.length > 128) return res.status(400).json({ message: 'Mật khẩu phải từ 6 đến 128 ký tự.', code: 'INVALID_PASSWORD' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email này đã được đăng ký.', code: 'EMAIL_EXISTS' });
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash });
    res.status(201).json({ message: 'Đăng ký thành công.', token: tokenFor(user), user: publicUser(user) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Email này đã được đăng ký.', code: 'EMAIL_EXISTS' });
    console.error('Register error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký.', code: 'REGISTER_FAILED' });
  }
});

router.post('/login', authLimit, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.', code: 'FIELDS_REQUIRED' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.', code: 'INVALID_CREDENTIALS' });
    res.json({ message: 'Đăng nhập thành công.', token: tokenFor(user), user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập.', code: 'LOGIN_FAILED' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.', code: 'USER_NOT_FOUND' });
    res.json({ user: publicUser(user) });
  } catch {
    res.status(500).json({ message: 'Không thể tải tài khoản.', code: 'USER_LOAD_FAILED' });
  }
});

module.exports = router;
