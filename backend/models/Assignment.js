const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  subject: { type: String, required: true, trim: true, maxlength: 50 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  tags: { type: [String], default: [] },
  folder: { type: String, trim: true, maxlength: 80, default: 'Chưa phân loại' },
  originalName: { type: String, required: true },
  storedName: { type: String, required: true, unique: true },
  filePath: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileData: { type: Buffer },
  aiFileId: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true, versionKey: false });

assignmentSchema.index({ owner: 1, subject: 1, createdAt: -1 });
assignmentSchema.index({ owner: 1, folder: 1, createdAt: -1 });
assignmentSchema.index({ owner: 1, title: 'text', originalName: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Assignment', assignmentSchema);
