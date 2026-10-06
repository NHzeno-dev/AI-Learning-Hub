const buckets = new Map();

function rateLimit({ windowMs = 60_000, max = 30, message = 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip || 'unknown'}:${req.user?.id || 'anonymous'}`;
    const current = buckets.get(key);
    if (!current || now - current.start >= windowMs) {
      buckets.set(key, { start: now, count: 1 });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - current.start)) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ message, code: 'RATE_LIMITED' });
    }
    next();
  };
}

setInterval(() => {
  const cutoff = Date.now() - 15 * 60_000;
  for (const [key, value] of buckets) {
    if (value.start < cutoff) buckets.delete(key);
  }
}, 5 * 60_000).unref();

module.exports = rateLimit;
