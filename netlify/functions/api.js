const mongoose = require("mongoose");
const { app } = require("../../backend/server");

let dbPromise = null;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    const err = new Error("Thiếu MONGODB_URI trong Netlify Environment Variables.");
    err.statusCode = 500;
    throw err;
  }
  if (!dbPromise) {
    dbPromise = mongoose.connect(process.env.MONGODB_URI).catch(err => {
      dbPromise = null;
      throw err;
    });
  }
  await dbPromise;
}

exports.handler = async (event, context) => {
  try {
    await connectDatabase();

    const { default: serverless } = await import("serverless-http");
    const proxy = serverless(app, {
      requestId: "netlify-request"
    });
    return await proxy(event, context);
  } catch (err) {
    console.error("Netlify API error:", err);
    return {
      statusCode: Number(err.statusCode) || 500,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        message: err.message || "Lỗi máy chủ.",
        code: "NETLIFY_FUNCTION_ERROR"
      })
    };
  }
};
