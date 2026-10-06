const serverless = require('serverless-http');
const mongoose = require('mongoose');
const { app } = require('../../backend/server');

let connectionPromise = null;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    const error = new Error('Thiếu MONGODB_URI trong Environment Variables của Netlify.');
    error.code = 'MONGODB_URI_MISSING';
    throw error;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    }).catch(error => {
      connectionPromise = null;
      throw error;
    });
  }

  await connectionPromise;
}

const expressHandler = serverless(app);

exports.handler = async (event, context) => {
  try {
    await connectDatabase();
    return await expressHandler(event, context);
  } catch (error) {
    console.error('Netlify API error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        message: error?.code === 'MONGODB_URI_MISSING'
          ? error.message
          : 'Backend chưa thể kết nối cơ sở dữ liệu. Kiểm tra MONGODB_URI và MongoDB Atlas Network Access.',
        code: error?.code || 'NETLIFY_API_ERROR'
      })
    };
  }
};
