const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const Assignment = require('../models/Assignment');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { deleteRemoteFile } = require('../services/openai');

const allowedMime = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png'
]);
const allowedExt = new Set(['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png']);
const MAX_FILE_SIZE = 4 * 1024 * 1024;

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedMime.has(file.mimetype) || !allowedExt.has(ext)) {
      return cb(new Error('Chỉ chấp nhận PDF, DOCX, PPTX, JPG hoặc PNG.'));
    }
    cb(null, true);
  }
});

function cleanTags(value) {
  const items = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(items.map(String).map(x => x.trim().replace(/\s+/g, ' ')).filter(Boolean))].slice(0, 10).map(x => x.slice(0, 40));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeId(id) {
  return /^[a-f\d]{24}$/i.test(String(id));
}

function publicDocument(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.aiFileId;
  delete obj.filePath;
  delete obj.fileData;
  return { ...obj, fileUrl: `/api/assignments/${obj._id}/file` };
}

router.get('/library', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 100);
    const subject = String(req.query.subject || '').trim().slice(0, 50);
    const folder = String(req.query.folder || '').trim().slice(0, 80);
    const sort = String(req.query.sort || 'newest');
    const filter = { owner: req.user.id };
    if (subject) filter.subject = subject;
    if (folder) filter.folder = folder;
    if (q) {
      const safe = escapeRegex(q);
      filter.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { originalName: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
        { tags: { $regex: safe, $options: 'i' } }
      ];
    }
    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { originalName: 1, createdAt: -1 },
      size: { fileSize: -1, createdAt: -1 }
    };
    const documents = await Assignment.find(filter).sort(sortMap[sort] || sortMap.newest).lean();
    res.json({ documents: documents.map(publicDocument) });
  } catch (err) {
    console.error('Library list error:', err);
    res.status(500).json({ message: 'Không thể tải kho tài liệu.', code: 'LIBRARY_LOAD_FAILED' });
  }
});

router.get('/library/meta', auth, async (req, res) => {
  try {
    const docs = await Assignment.find({ owner: req.user.id }).select('subject folder tags').lean();
    const subjects = [...new Set(docs.map(x => x.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
    const folders = [...new Set(docs.map(x => x.folder || 'Chưa phân loại'))].sort((a, b) => a.localeCompare(b, 'vi'));
    const tags = [...new Set(docs.flatMap(x => x.tags || []))].sort((a, b) => a.localeCompare(b, 'vi'));
    res.json({ subjects, folders, tags });
  } catch (err) {
    res.status(500).json({ message: 'Không thể tải bộ lọc kho tài liệu.', code: 'LIBRARY_META_FAILED' });
  }
});

router.get('/mine', auth, async (req, res) => {
  try {
    const assignments = await Assignment.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ assignments: assignments.map(publicDocument) });
  } catch {
    res.status(500).json({ message: 'Không thể tải danh sách bài.', code: 'ASSIGNMENTS_LOAD_FAILED' });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const [result] = await Assignment.aggregate([
      { $match: { owner: require('mongoose').Types.ObjectId.createFromHexString(req.user.id) } },
      { $group: { _id: null, count: { $sum: 1 }, totalSize: { $sum: '$fileSize' }, folders: { $addToSet: '$folder' } } }
    ]);
    res.json({ count: result?.count || 0, totalSize: result?.totalSize || 0, folders: (result?.folders || []).filter(Boolean).length });
  } catch {
    res.status(500).json({ message: 'Không thể tải thống kê tài liệu.', code: 'LIBRARY_STATS_FAILED' });
  }
});

router.post('/', auth, rateLimit({ windowMs: 60_000, max: 10, message: 'Bạn upload quá nhanh. Vui lòng chờ một chút.' }), (req, res) => {
  upload.single('file')(req, res, async err => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File vượt quá giới hạn 4 MB trên phiên bản Netlify.' : err.message;
      return res.status(400).json({ message: message || 'Upload thất bại.', code: err.code || 'UPLOAD_INVALID' });
    }
    try {
      const title = String(req.body.title || '').trim().slice(0, 150);
      const subject = String(req.body.subject || '').trim().slice(0, 50);
      const description = String(req.body.description || '').trim().slice(0, 1000);
      const folder = String(req.body.folder || 'Chưa phân loại').trim().slice(0, 80) || 'Chưa phân loại';
      if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file.', code: 'FILE_REQUIRED' });
      if (!title || !subject) {
        return res.status(400).json({ message: 'Vui lòng nhập tiêu đề và môn học.', code: 'METADATA_REQUIRED' });
      }
      const assignment = await Assignment.create({
        title, subject, description, folder, tags: cleanTags(req.body.tags),
        originalName: String(req.file.originalname || 'file').slice(0, 255),
        storedName: `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${path.extname(req.file.originalname).toLowerCase()}`,
        filePath: '',
        fileData: req.file.buffer,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        owner: req.user.id
      });
      res.status(201).json({ message: 'Đã thêm tài liệu vào kho.', assignment: publicDocument(assignment) });
    } catch (err2) {
      console.error('Upload save error:', err2);
      res.status(500).json({ message: 'Không thể lưu tài liệu.', code: 'UPLOAD_SAVE_FAILED' });
    }
  });
});

router.patch('/:id', auth, async (req, res) => {
  try {
    if (!safeId(req.params.id)) return res.status(400).json({ message: 'ID tài liệu không hợp lệ.', code: 'INVALID_ID' });
    const assignment = await Assignment.findOne({ _id: req.params.id, owner: req.user.id });
    if (!assignment) return res.status(404).json({ message: 'Không tìm thấy tài liệu.', code: 'DOCUMENT_NOT_FOUND' });
    if (req.body.title !== undefined) assignment.title = String(req.body.title).trim().slice(0, 150);
    if (req.body.subject !== undefined) assignment.subject = String(req.body.subject).trim().slice(0, 50);
    if (req.body.description !== undefined) assignment.description = String(req.body.description).trim().slice(0, 1000);
    if (req.body.folder !== undefined) assignment.folder = String(req.body.folder || 'Chưa phân loại').trim().slice(0, 80) || 'Chưa phân loại';
    if (req.body.tags !== undefined) assignment.tags = cleanTags(req.body.tags);
    if (!assignment.title || !assignment.subject) return res.status(400).json({ message: 'Tiêu đề và môn học không được để trống.', code: 'METADATA_REQUIRED' });
    await assignment.save();
    res.json({ message: 'Đã cập nhật tài liệu.', document: publicDocument(assignment) });
  } catch (err) {
    res.status(500).json({ message: 'Không thể cập nhật tài liệu.', code: 'DOCUMENT_UPDATE_FAILED' });
  }
});

router.get('/:id/file', auth, async (req, res) => {
  try {
    if (!safeId(req.params.id)) return res.status(400).json({ message: 'ID tài liệu không hợp lệ.', code: 'INVALID_ID' });
    const doc = await Assignment.findOne({ _id: req.params.id, owner: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu.', code: 'DOCUMENT_NOT_FOUND' });
    if (!doc.fileData) {
      return res.status(404).json({ message: 'File gốc không còn trong cơ sở dữ liệu.', code: 'FILE_NOT_FOUND' });
    }
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Length', String(doc.fileSize));
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(doc.fileData);
  } catch {
    res.status(500).json({ message: 'Không thể mở tài liệu.', code: 'FILE_OPEN_FAILED' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!safeId(req.params.id)) return res.status(400).json({ message: 'ID tài liệu không hợp lệ.', code: 'INVALID_ID' });
    const assignment = await Assignment.findOne({ _id: req.params.id, owner: req.user.id });
    if (!assignment) return res.status(404).json({ message: 'Không tìm thấy tài liệu.', code: 'DOCUMENT_NOT_FOUND' });
    await deleteRemoteFile(assignment.aiFileId);
    await assignment.deleteOne();
    res.json({ message: 'Đã xóa tài liệu khỏi kho.' });
  } catch {
    res.status(500).json({ message: 'Không thể xóa tài liệu.', code: 'DOCUMENT_DELETE_FAILED' });
  }
});

module.exports = router;
