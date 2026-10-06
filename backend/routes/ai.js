const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const Assignment = require('../models/Assignment');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { getClient, getModel } = require('../services/openai');

const MAX_PROMPT = 5000;
const aiLimit = rateLimit({ windowMs: 60_000, max: 12, message: 'Bạn đã dùng AI quá nhiều trong thời gian ngắn. Vui lòng thử lại sau một phút.' });

function getError(err) {
  if (err?.status === 503) return { status: 503, message: err.message, code: 'AI_NOT_CONFIGURED' };
  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = err?.error?.message || err?.message || 'Không thể gọi AI.';
  return { status, message: status >= 500 ? 'AI đang gặp sự cố hoặc quá thời gian chờ. Vui lòng thử lại.' : message, code: status === 429 ? 'AI_RATE_LIMITED' : 'AI_REQUEST_FAILED' };
}

async function getOwnedDocument(id, userId) {
  if (!/^[a-f\d]{24}$/i.test(String(id))) {
    const err = new Error('ID tài liệu không hợp lệ.'); err.status = 400; err.code = 'INVALID_ID'; throw err;
  }
  const doc = await Assignment.findOne({ _id: id, owner: userId });
  if (!doc) {
    const err = new Error('Không tìm thấy tài liệu hoặc bạn không có quyền truy cập.');
    err.status = 404; err.code = 'DOCUMENT_NOT_FOUND'; throw err;
  }
  return doc;
}

async function ensureAiFile(doc) {
  const ai = getClient();
  if (doc.aiFileId) return doc.aiFileId;
  const fullPath = path.join(__dirname, '..', 'uploads', doc.storedName);
  if (!fs.existsSync(fullPath)) {
    const err = new Error('File gốc không còn trên máy chủ.'); err.status = 404; err.code = 'FILE_NOT_FOUND'; throw err;
  }
  const uploaded = await ai.files.create({ file: fs.createReadStream(fullPath), purpose: 'user_data' });
  doc.aiFileId = uploaded.id;
  await doc.save();
  return uploaded.id;
}

const actionPrompts = {
  summary: 'Tóm tắt tài liệu học tập này bằng tiếng Việt. Ưu tiên ý chính, khái niệm, công thức và kết luận quan trọng. Trình bày theo tiêu đề và bullet, ngắn gọn nhưng đủ để ôn bài. Không bịa thông tin ngoài tài liệu.',
  explain: 'Giải thích tài liệu này như một gia sư cho học sinh phổ thông Việt Nam. Đi từ khái niệm cơ bản đến phần khó, dùng ví dụ đơn giản nếu phù hợp. Nếu có công thức, giải thích ý nghĩa các đại lượng. Chỉ dựa vào nội dung tài liệu khi nói về tài liệu.',
  questions: 'Tạo 10 câu hỏi ôn tập dựa trên tài liệu. Trộn câu trắc nghiệm và tự luận. Với trắc nghiệm có 4 lựa chọn A-D và ghi đáp án ở cuối. Câu hỏi phải bám sát tài liệu, phù hợp học sinh phổ thông.',
  flashcards: 'Tạo 12 flashcard ôn tập dựa trên tài liệu. Mỗi flashcard gồm "Mặt trước" và "Mặt sau". Tập trung vào định nghĩa, công thức, sự kiện, quy tắc và ý chính. Không bịa nội dung.'
};

router.get('/status', auth, (_req, res) => res.json({ configured: Boolean(process.env.OPENAI_API_KEY), model: getModel() }));

router.post('/document/:id', auth, aiLimit, async (req, res) => {
  try {
    const action = String(req.body?.action || '').trim();
    const customPrompt = String(req.body?.prompt || '').trim().slice(0, MAX_PROMPT);
    if (!['summary', 'explain', 'questions', 'flashcards', 'ask'].includes(action)) {
      return res.status(400).json({ message: 'Tác vụ AI không hợp lệ.', code: 'INVALID_AI_ACTION' });
    }
    if (action === 'ask' && !customPrompt) return res.status(400).json({ message: 'Hãy nhập câu hỏi cho tài liệu.', code: 'PROMPT_REQUIRED' });

    const doc = await getOwnedDocument(req.params.id, req.user.id);
    const ai = getClient();
    const fileId = await ensureAiFile(doc);
    const instruction = action === 'ask'
      ? `Trả lời câu hỏi của học sinh dựa trên tài liệu được cung cấp. Nếu tài liệu không đủ thông tin, nói rõ điều đó thay vì bịa. Trả lời bằng tiếng Việt, dễ hiểu.\n\nCâu hỏi: ${customPrompt}`
      : actionPrompts[action];

    const response = await ai.responses.create({
      model: getModel(),
      max_output_tokens: action === 'questions' || action === 'flashcards' ? 3000 : 2200,
      input: [{ role: 'user', content: [
        { type: 'input_text', text: instruction },
        { type: 'input_file', file_id: fileId }
      ] }]
    });

    res.json({ action, document: { id: doc._id, title: doc.title, originalName: doc.originalName }, reply: response.output_text || 'AI không trả về nội dung.' });
  } catch (err) {
    console.error('AI document error:', err);
    const e = getError(err);
    res.status(e.status).json({ message: e.message, code: e.code });
  }
});

router.post('/chat', auth, aiLimit, async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim().slice(0, 4000);
    if (!message) return res.status(400).json({ message: 'Vui lòng nhập câu hỏi.', code: 'MESSAGE_REQUIRED' });
    const response = await getClient().responses.create({
      model: getModel(),
      max_output_tokens: 1800,
      input: [{ role: 'user', content: [{ type: 'input_text', text: `Bạn là trợ lý học tập của AI Learning Hub. Trả lời bằng tiếng Việt, rõ ràng, phù hợp học sinh phổ thông. Không bịa dữ kiện. Nếu câu hỏi là bài tập, hướng dẫn từng bước thay vì chỉ nêu đáp án khi phù hợp.\n\n${message}` }] }]
    });
    res.json({ reply: response.output_text || 'AI không trả về nội dung.' });
  } catch (err) {
    console.error('AI chat error:', err);
    const e = getError(err);
    res.status(e.status).json({ message: e.message, code: e.code });
  }
});

module.exports = router;
