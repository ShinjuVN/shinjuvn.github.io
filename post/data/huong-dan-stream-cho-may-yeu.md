---
title: "Hướng dẫn cách Stream Youtube cho máy yếu!"
photo: ""
date: "06/10/2026"
---
# &l&6[Bách Khoa Stream Youtube Cho Máy Cấu Hình Yếu]&r

&7Tài liệu này hướng dẫn cách "vắt kiệt" hiệu năng để vừa chơi game vừa livestream mượt mà nhất có thể trên những cỗ máy không sinh ra để dành cho việc làm streamer.&r

---

### &l&e⚙️ CẤU HÌNH THIẾT BỊ LÀM MỐC TEST&r
&fTài liệu này được tinh chỉnh và thử nghiệm dựa trên cấu hình &c"giới hạn đỏ"&f sau đây. Nếu máy bạn mạnh hơn, bạn hoàn toàn có thể áp dụng và từ từ tăng chất lượng stream lên.&r

* &fThiết bị: &7Laptop văn phòng cơ bản&r
* &fCPU: &bIntel Core i3 8135U &7(hoặc tương đương, dòng chip U tiết kiệm điện, 2 nhân)&r
* &fGPU: &bIntel UHD Graphics &7(Card đồ họa tích hợp)&r
* &fRAM: &a12GB&r
* &fLưu trữ: &aSSD &7(Khuyến nghị trống tối thiểu 50GB)&r
* &fMạng: &e4G/5G &7(Tốc độ trung bình 25Mbps)&r

---

## &l&aPHẦN 1: TỐI ƯU HÓA GAME (Dành cho Minecraft)&r
&7Vì máy tính cần dư tài nguyên cho phần mềm livestream (OBS), game buộc phải chạy ở mức nhẹ nhất.&r

&a1.&r &fSử dụng Nền tảng Fabric:&r Cài đặt các modpack tối ưu hóa cực mạnh (&eFabulously Optimized&r). Nó bao gồm &bSodium&r, &bLithium&r, &bFerriteCore&r, &bEntity Culling&r,... giúp giảm tải CPU và RAM.
&a2.&r &fThiết lập In-game:&r
   * &eRender Distance (Tầm nhìn):&r &a6 - 8 chunks&r.
   * &eSimulation Distance:&r &a5 chunks&r.
   * &eGraphics:&r &aFast&r.
   * &eMax Framerate:&r &cGiới hạn ở 40 - 45 FPS&r &7(Tuyệt đối không để Unlimited. Việc khóa FPS giúp dư tài nguyên GPU để phần mềm stream dựng hình).&r
   * Tắt hết các hiệu ứng animations không cần thiết, mây, đổ bóng (shaders).

---

## &l&aPHẦN 2: THIẾT LẬP OBS STUDIO "SIÊU NHẸ"&r
&7Cấu hình máy yếu không thể stream 1080p. Mục tiêu lý tưởng là &b&l720p ở 30 FPS&r.&r

&a1.&r &fVideo Settings:&r
   * &eBase (Canvas):&r &71920x1080 (hoặc 1280x720)&r.
   * &eOutput (Scaled):&r &b1280x720&r.
   * &eDownscale Filter:&r &aBicubic&r hoặc &aBilinear&r &7(để giảm tải CPU)&r.
   * &eFPS:&r &a30&r.
&a2.&r &fEncoder (&cQUAN TRỌNG&r):&r 
   * Tuyệt đối &c&lKHÔNG&r dùng &c264&r &7(vì nó ngốn rất nhiều CPU)&r.
   * Hãy chọn &a&lQuickSync H.264 (QSV)&r &7(Intel)&r hoặc &a&lAMD HW H.264&r &7(AMD)&r. Đây là phần cứng mã hóa tích hợp giúp OBS chạy không ăn vào % xử lý game.
&a3.&r &fBitrate & Mạng:&r 
   * Set Bitrate ở mức &e3000 - 4000 Kbps&r.
   * &cLưu ý:&r 1 giờ stream sẽ tiêu tốn khoảng &c1.7 GB - 2 GB&r dung lượng 4G/5G. Nên cắm cáp USB Tethering trực tiếp thay vì bắt Wi-Fi.
&a4.&r &fKhởi chạy OBS:&r Luôn mở OBS dưới quyền &cAdministrator&r để Windows ưu tiên tài nguyên GPU cho OBS.

---

## &l&aPHẦN 3: TỐI ƯU GIAO DIỆN STREAM (PNGTUBER, CHAT, DONATE)&r
&7Máy yếu cần hạn chế tối đa các hiệu ứng chuyển động, ảnh GIF hay chữ chạy.&r

&a1.&r &fNhân vật PNGTuber:&r 
   * Dùng ảnh PNG tĩnh. 
   * Sử dụng &bReactive PNG&r qua &bDiscord StreamKit&r và add vào OBS dưới dạng &eBrowser Source&r thay vì mở phần mềm chạy ngầm thứ 3.
&a2.&r &fThông báo Donate & Chat (Browser Source):&r
   * Dùng link Widget của các nền tảng (&bStreamElements&r cho Chat, &bGankNow/PlayerDuo&r cho Donate).
   * &cMẹo phần cứng:&r Trong OBS, vào &eSettings > Advanced&r > Bật &aEnable Browser Source Hardware Acceleration&r để mượn sức mạnh GPU xử lý các trình duyệt nhúng.
&a3.&r &fThêm Chữ & Logo:&r 
   * Chỉ dùng công cụ &eText (GDI+)&r có sẵn của OBS và bật &fOutline (Viền màu đen)&r.
   * Logo nên xuất file PNG trong suốt, add vào OBS qua công cụ &eImage&r.

&c&l⚠️ CẢNH BÁO:&r &7Tránh sử dụng plugin "Source Record" (plugin ghi hình một luồng sạch riêng biệt) trên cấu hình máy yếu vì nó đòi hỏi encode 2 luồng video cùng lúc, dễ gây treo máy.&r

---

## &l&aPHẦN 4: SETUP ÂM THANH "CHUẨN STUDIO"&r 
&7Sử dụng các bộ lọc (Filters) có sẵn của OBS cho Micro. Chuột phải vào Micro > Filters và thêm lần lượt theo đúng thứ tự:&r

&a1.&r &eNoise Gate (Cổng chống ồn):&r Tắt mic khi im lặng, tránh tạp âm từ quạt tản nhiệt laptop.
   * &fClose Threshold:&r &c-42dB&r &7(Chỉnh cao hơn mức âm lượng tiếng quạt)&r.
   * &fOpen Threshold:&r &a-37dB&r &7(Cao hơn Close Threshold ~5dB)&r.
&a2.&r &eNoise Suppression (Khử ồn):&r Lọc ồn khi đang nói.
   * &fMethod:&r &aSpeex (Low CPU usage)&r. Kéo mức &c-25dB đến -30dB&r.
&a3.&r &e3-Band Equalizer (Làm ấm giọng):&r
   * &fLow (Trầm):&r &a+2.00 dB đến +4.00 dB&r &7(tăng độ ấm)&r.
   * &fMid (Trung):&r &70.00 dB hoặc -1.00 dB&r.
   * &fHigh (Cao):&r &a+1.00 dB đến +2.00 dB&r &7(tăng độ rõ chữ)&r.
&a4.&r &eCompressor (Nén tiếng):&r Cân bằng âm lượng, gánh những lúc bạn thì thầm hay lỡ hét to.
   * &fRatio:&r &a3:1&r hoặc &a4:1&r.
   * &fThreshold:&r &c-18dB&r.
   * &fOutput Gain:&r &a+2dB đến +4dB&r.
&a5.&r &eLimiter (Giới hạn âm lượng tối đa):&r
   * &fThreshold:&r &c-3.00 dB&r &7(Chống vỡ tiếng, bảo vệ tai người xem)&r.

---

## &l&aPHẦN 5: TỐI ƯU SEO & BẢN THẢO YOUTUBE&r
&7Vào &eYouTube Studio > Settings > Upload defaults&r &7để dán sẵn các thiết lập nhằm tiết kiệm thời gian trước mỗi buổi live.&r

&a1.&r &fTừ khóa kênh (Keywords) & Video Tags:&r
* Sắp xếp theo quy tắc: &bTừ khóa ngách (chủ đề stream)&r -> &bTừ khóa tên kênh&r -> &bTừ khóa rộng (Tên game)&r.
* &eVí dụ:&r &7[tên chủ đề hôm nay], [tên server smp], [tên kênh], minecraft sinh tồn, pngtuber việt nam, minecraft fabric&r.

&a2.&r &fTiêu đề chuẩn SEO:&r
* Cấu trúc khuyên dùng: &e[Sự kiện/Tương tác chính] - [Tên game/Server] | [Tên kênh]&r
* &eVí dụ:&r &fCầm cúp gỗ đi đào kim cương - Minecraft SMP [Tên Server] | [Tên Kênh]&r

&a3.&r &fMẫu Mô Tả (Description) Tham Khảo:&r
```text
&a[Nhập 1-2 câu tóm tắt nội dung buổi live hôm nay]&r

💖 &dDonate cấp cứu tiền ăn sáng tại đây:&r &b[Link Donate]&r

🌸 &eVề [Tên Kênh]:&r
&fMình là một PNGTuber thích sinh tồn và tấu hài. Đừng ngại ngùng gõ chat tương tác cùng mình nhé!&r

📌 &eThông tin Server & Game:&r
- &fServer:&r &a[Tên Server]&r
- &fNền tảng:&r &a[Java/Bedrock]&r
- &fVoice Chat:&r &a[Tên mod nếu có]&r

🌐 &eKết nối với mình:&r
- &fFanpage/Facebook/Discord:&r &b[Link]&r

⚙️ &eCấu hình "Cỗ máy chiến game":&r
- &fCPU:&r &bIntel Core i3 8135U&r | &fGPU:&r &bIntel UHD&r | &fRAM:&r &a12GB&r
```

# &l&c💡 LỜI KHUYÊN QUAN TRỌNG VỀ NHIỆT ĐỘ:&r
&fKhi stream trên laptop, máy sẽ phải chạy &c100% công suất&f liên tục. Khi nhiệt độ lên trên &c90°C&f, máy sẽ tự động giảm xung nhịp làm tụt FPS thê thảm. &a&lBẮT BUỘC&f phải kê cao đáy laptop để quạt hút gió thoáng, hoặc trang bị thêm đế tản nhiệt rời. Luôn test thử luồng live 15-30 phút ở chế độ &eUnlisted (Không công khai)&f trước khi lên sóng chính thức!&r
