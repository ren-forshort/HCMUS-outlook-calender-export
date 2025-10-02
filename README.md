# Đồng Bộ Thời Khoá Biểu HCMUS → Outlook Calendar (UserScript)

Script `hcmus_outlook_calendar.user.js` là một UserScript dành cho Tampermonkey, giúp tự động lấy dữ liệu thời khoá biểu từ **cổng thông tin sinh viên HCMUS** và mở trang **tạo sự kiện trên Outlook Calendar** với đầy đủ thông tin đã được điền sẵn.

---

## ✨ Tính năng

- Tự động đọc thời khoá biểu từ trang Portal HCMUS  
- Tạo liên kết sự kiện Outlook Calendar cho từng môn học  

---

## 📦 Cài đặt

1. Cài tiện ích **Tampermonkey**:

   - Chrome / Edge: https://tampermonkey.net  
   - Firefox: https://addons.mozilla.org/firefox/addon/tampermonkey/

2. Mở hoặc kéo thả file `hcmus_outlook_calendar.user.js` vào trình duyệt → Chọn **Install**.

---

## 🚀 Cách sử dụng

1. Vào trang **Thời khoá biểu / Lịch học** trên Portal HCMUS và nhấn "Thêm vào Outlook"
![](images/Screenshot%202025-10-02%20165816.png) 
2. Outlook Calendar mở ra ở **tab mới**, nhấn Make recurring nếu muốn tkb lặp lại hàng tuần (script sẽ ko tự động cập nhập thông tin nếu có thay đổi phòng)
![](images/Screenshot%202025-10-02%20165850.png)
3. Nhấn "Save" (nếu không có Make recurring thì chỉ save ở muỗi tên thứ 2)
![](images/Screenshot%202025-10-02%20165905.png)
4. Để xem lịch vào phần "calender" của outlook và chọn xem theo tuần
![](images/Screenshot%2025-10-02%20165943.png)

---

## ⚠️ Lưu ý

- Hãy **đăng nhập Outlook trước khi bấm nút**  
- Nếu Outlook mở **2 tab** hoặc **thay thế trang hiện tại**, hãy kiểm tra phần cài đặt chặn pop-up của trình duyệt  

---

## 🛠️ Chỉnh sửa Script

1. Mở **Tampermonkey → Installed Scripts**  
2. Chọn **Edit** script `hcmus_outlook_calendar.user.js`  
3. Các phần có thể chỉnh:
   - Logic lấy thời khoá biểu
   - Hàm tạo URL (dùng `encodeURIComponent`)
   - Hành vi `window.open(...)`

---

## 📄 License

Tự do sử dụng & chỉnh sửa cho mục đích cá nhân hoặc học tập.

---

## ✅ Đóng góp

Nếu bạn chỉnh sửa hoặc cải tiến script, hãy ghi chú lại trong phần header để chia sẻ cùng cộng đồng!
