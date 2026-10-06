const OpenAI = require('openai');

let client = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error('Chưa cấu hình OPENAI_API_KEY trong file .env.');
    err.status = 503;
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 1 });
  }
  return client;
}

function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-6-luna';
}

async function deleteRemoteFile(fileId) {
  if (!fileId || !process.env.OPENAI_API_KEY) return;
  try {
    await getClient().files.delete(fileId);
  } catch (err) {
    console.warn('Không thể xóa file AI:', err?.message || err);
  }
}

module.exports = { getClient, getModel, deleteRemoteFile };
