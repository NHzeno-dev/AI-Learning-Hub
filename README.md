# AI Learning Hub — FINAL

Nền tảng học tập cho học sinh Việt Nam, hợp nhất các giai đoạn 1 → 6 trên một project: giao diện, tài khoản thật, kho tài liệu MongoDB, AI học tập, bảo mật và chuẩn bị deploy.

## Tính năng

- Đăng ký / đăng nhập / đăng xuất bằng JWT + bcrypt.
- Mỗi tài khoản chỉ truy cập tài liệu của mình.
- Upload PDF, DOCX, PPTX, JPG/JPEG, PNG, tối đa 10 MB/file.
- Kho tài liệu: tìm kiếm, lọc môn/thư mục, tag, sắp xếp, sửa, xóa, thống kê.
- File được mở qua endpoint có xác thực thay vì public `/uploads`, tránh lộ tài liệu khi biết tên file.
- AI: tóm tắt, giải thích, tạo câu hỏi, flashcard, hỏi đáp theo tài liệu và chat AI chung.
- API key chỉ ở backend `.env`.
- Rate limit cho đăng nhập, upload và AI.
- Helmet, CORS cấu hình, validation đầu vào và xử lý lỗi thống nhất.
- Pomodoro, mục tiêu và bài tập cá nhân vẫn được lưu trên thiết bị.

## Công nghệ

Frontend: HTML/CSS/JavaScript.
Backend: Node.js + Express.
Database: MongoDB + Mongoose.
Auth: JWT + bcrypt.
Upload: Multer.
AI: OpenAI Responses API.

## Chạy local

1. Cài Node.js LTS.
2. Mở terminal tại thư mục `backend`.
3. Chạy `npm install`.
4. Sao chép `.env.example` thành `.env` và điền `MONGODB_URI`, `JWT_SECRET`; nếu dùng AI thì thêm `OPENAI_API_KEY`.
5. Chạy `npm start`.
6. Mở `http://localhost:3000`.

`JWT_SECRET` phải dài ít nhất 32 ký tự. Không đưa `.env` thật lên GitHub.

## Biến môi trường

```env
PORT=3000
MONGODB_URI=...
JWT_SECRET=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-6-luna
CORS_ORIGIN=
```

Model có thể đổi bằng `OPENAI_MODEL` nếu tài khoản API của bạn hỗ trợ model khác. Responses API là hướng tích hợp hiện tại; OpenAI đã sunset Assistants API ngày 26/08/2026.

## API

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Health
- `GET /api/health`

### Kho tài liệu
- `GET /api/assignments/library`
- `GET /api/assignments/library/meta`
- `GET /api/assignments/stats`
- `GET /api/assignments/:id/file`
- `POST /api/assignments`
- `PATCH /api/assignments/:id`
- `DELETE /api/assignments/:id`

### AI
- `GET /api/ai/status`
- `POST /api/ai/chat`
- `POST /api/ai/document/:id` với `action`: `summary`, `explain`, `questions`, `flashcards`, `ask`.

## Cấu trúc

```text
AI-Learning-Hub-Final/
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rateLimit.js
│   │   └── errorHandler.js
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── uploads/
├── .env.example
├── .gitignore
├── README.md
└── START-HERE.md
```

## Deploy GitHub + MongoDB Atlas + Render

### GitHub
- Tạo repository mới.
- Upload toàn bộ project, nhưng **không upload `.env`**.
- `node_modules` và file upload local đã được `.gitignore`.

### MongoDB Atlas
- Tạo cluster/database.
- Tạo database user.
- Lấy connection string.
- Trên môi trường public, giới hạn Network Access theo mô hình triển khai phù hợp; không chia sẻ connection string.

### Render
- Tạo Web Service từ repository GitHub.
- Root Directory: `backend`.
- Build Command: `npm install`.
- Start Command: `npm start`.
- Thêm Environment Variables: `MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `CORS_ORIGIN` nếu cần.
- Sau deploy kiểm tra `/api/health`.

### Quan trọng về file upload trên Render
Bản này vẫn dùng thư mục `backend/uploads` để giữ tương thích với project hiện tại. Filesystem local của một số môi trường cloud có thể không bền qua redeploy/restart. Nếu website public cần lưu tài liệu lâu dài, bước production tiếp theo nên chuyển storage sang object storage hoặc persistent disk. Không nên coi thư mục local trên web host là bản sao lưu.

## Kiểm tra end-to-end

1. Register → Login.
2. Dashboard hiển thị đúng tài khoản.
3. Upload file hợp lệ.
4. Tìm kiếm/lọc/sắp xếp.
5. Sửa metadata.
6. Xem preview/mở file bằng tài khoản đang đăng nhập.
7. Thử AI Summary / Explain / Questions / Flashcards / Ask.
8. Xóa tài liệu và kiểm tra file biến mất.
9. Tạo tài khoản thứ hai và xác nhận không thấy tài liệu của tài khoản thứ nhất.
10. Logout → Login lại.

## Bảo mật

- Không hard-code API key.
- Không trả password từ API.
- Không expose thư mục uploads công khai.
- Validate MIME type + extension + dung lượng.
- Escape regex tìm kiếm.
- Rate limit auth/upload/AI.
- JWT xác thực mọi endpoint riêng tư.

## Chi phí AI
Các request AI dùng API có thể phát sinh chi phí theo model và token. Nên giữ rate limit và theo dõi usage trước khi public rộng rãi.


## Chạy frontend bằng HTML

Frontend hiện hỗ trợ mở trực tiếp `frontend/index.html`. Để các chức năng đăng nhập, MongoDB, upload và AI hoạt động, backend vẫn phải được triển khai ở một URL PUBLIC.

Mở `frontend/config.js` và đặt:
`API_BASE_URL: "https://LINK-BACKEND-CONG-KHAI/api"`

Không đưa `.env`, `MONGODB_URI`, `JWT_SECRET` hoặc `OPENAI_API_KEY` vào frontend/GitHub.
