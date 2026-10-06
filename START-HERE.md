# AI Learning Hub — FINAL / Giai đoạn 1 → 6

Đây là project hợp nhất. Không cần tách từng giai đoạn nữa.

## Đã hoàn thiện

### 1. Website
Giao diện học tập, dashboard, AI chat, kho tài liệu, bài tập, kế hoạch học, cá nhân và responsive.

### 2. Tài khoản thật
JWT + bcrypt, đăng ký/đăng nhập, token hết hạn, bảo vệ API và tách dữ liệu theo tài khoản.

### 3. Upload thật
PDF/DOCX/PPTX/JPG/JPEG/PNG, tối đa 10 MB, lưu metadata MongoDB và xóa file khi xóa tài liệu.

### 4. Kho tài liệu
Tìm kiếm, lọc, sắp xếp, folder, tag, sửa, preview, mở/tải, thống kê. File không còn được expose trực tiếp qua `/uploads`.

### 5. AI
Tóm tắt, giải thích, câu hỏi, flashcard, hỏi đáp theo tài liệu và chat AI chung. API key chỉ nằm backend.

### 6. Hoàn thiện production
Rate limit, Helmet, CORS, validation, error handling, `.env.example`, README, health check và cấu hình deploy.

## Chạy trên Windows

```bash
cd backend
npm install
npm start
```

Nếu PowerShell chặn `npm.ps1`, có thể mở CMD và chạy các lệnh trên.

## Tạo `.env`

```env
PORT=3000
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING
JWT_SECRET=YOUR_LONG_RANDOM_SECRET_AT_LEAST_32_CHARS
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-6-luna
CORS_ORIGIN=
```

Nếu chưa cấu hình OpenAI, đăng nhập và kho tài liệu vẫn dùng được; chỉ các tính năng AI không hoạt động.

## Kiểm tra nhanh

- `http://localhost:3000/api/health` phải trả JSON với `ok: true`.
- Register.
- Login.
- Upload PDF/ảnh.
- Thử tìm kiếm, lọc, sửa, preview và xóa.
- Chọn `Học với AI` và thử 5 tác vụ.
- Tạo tài khoản khác để kiểm tra quyền riêng tư.

## Deploy

GitHub → MongoDB Atlas → Render. Xem README.md để biết biến môi trường và lệnh.

**Lưu ý:** thư mục `backend/uploads` là storage local để giữ tương thích với project hiện tại. Trước khi public lâu dài, nên chuyển file sang object storage/persistent disk để tránh mất file khi host thay filesystem.
