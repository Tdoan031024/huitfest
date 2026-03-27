-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th3 27, 2026 lúc 07:19 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `huitfest`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `adminuser`
--

CREATE TABLE `adminuser` (
  `id` int(11) NOT NULL,
  `username` varchar(191) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `lastLoginAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `adminuser`
--

INSERT INTO `adminuser` (`id`, `username`, `passwordHash`, `isActive`, `createdAt`, `updatedAt`, `lastLoginAt`) VALUES
(1, 'admin', '$2b$12$BH3oMWx.CcBPtckQmOn5nOf7aQSU5KUKC8QzD/AjEUNLx4pSNy3gi', 1, '2026-03-27 08:10:11.665', '2026-03-27 16:14:14.524', '2026-03-27 16:14:14.524');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `agendaitem`
--

CREATE TABLE `agendaitem` (
  `id` int(11) NOT NULL,
  `eventId` int(11) NOT NULL,
  `title` varchar(191) NOT NULL,
  `startTime` datetime(3) NOT NULL,
  `endTime` datetime(3) NOT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `artist`
--

CREATE TABLE `artist` (
  `id` int(11) NOT NULL,
  `eventId` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `imageUrl` varchar(191) DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `event`
--

CREATE TABLE `event` (
  `id` int(11) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `subtitle` varchar(191) DEFAULT NULL,
  `description` text NOT NULL,
  `heroImage` varchar(191) DEFAULT NULL,
  `startAt` datetime(3) NOT NULL,
  `endAt` datetime(3) NOT NULL,
  `registrationOpen` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `pageConfig` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`pageConfig`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `event`
--

INSERT INTO `event` (`id`, `slug`, `title`, `subtitle`, `description`, `heroImage`, `startAt`, `endAt`, `registrationOpen`, `createdAt`, `updatedAt`, `pageConfig`) VALUES
(1, 'huit-fest-2026', 'Huit Fest 2026', 'Demo', 'Initial config row', '', '2026-03-27 09:13:35.000', '2026-03-28 09:13:35.000', 1, '2026-03-27 09:13:35.000', '2026-03-27 09:13:35.000', '{\"about\":{\"heading\":\"VỀ HUIT FEST \",\"logoImage\":\"/assets/images/banner/chu.png\",\"description\":\"HUIT Fest là sự kiện âm nhạc - công nghệ dành cho học sinh, sinh viên yêu thích trải nghiệm mới.\\nKhông gian lễ hội được thiết kế với sân khấu hiện đại, nghệ sĩ trẻ nổi bật và chuỗi hoạt động tương tác xuyên suốt chương trình.\"},\"rules\":{\"content\":\"Vé và check-in: Ban Tổ chức (BTC) sẽ kiểm duyệt thông tin đăng ký vé hợp lệ và gửi vé qua email cho bạn trong vòng 48h sau khi đăng ký.\",\"sectionTitle\":\"QUY ĐỊNH CHUNG\"},\"video\":{\"videoUrl\":\"https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F813022351807590%2F&show_text=false&width=560&t=0\",\"sectionTitle\":\"VIDEO SỰ KIỆN\"},\"footer\":{\"cards\":[{\"id\":103,\"name\":\"HUIT MEDIA\",\"image\":\"/assets/images/logo/logomedia.jpg\"},{\"id\":104,\"name\":\"Đối tác\",\"image\":\"/assets/images/logo/avt.jpg\"},{\"id\":105,\"name\":\"Lyhan\",\"image\":\"/assets/images/sponsors/1774629845487-352481538.webp\"}],\"items\":[{\"id\":103,\"name\":\"HUIT MEDIA\",\"image\":\"/assets/images/logo/logomedia.jpg\"},{\"id\":104,\"name\":\"Đối tác\",\"image\":\"/assets/images/logo/avt.jpg\"},{\"id\":105,\"name\":\"Lyhan\",\"image\":\"/assets/images/sponsors/1774629845487-352481538.webp\"}],\"logos\":[{\"id\":103,\"name\":\"HUIT MEDIA\",\"image\":\"/assets/images/logo/logomedia.jpg\"},{\"id\":104,\"name\":\"Đối tác\",\"image\":\"/assets/images/logo/avt.jpg\"},{\"id\":105,\"name\":\"Lyhan\",\"image\":\"/assets/images/sponsors/1774629845487-352481538.webp\"}],\"title\":\"ĐƠN VỊ BẢO TRỢ TRUYỀN THÔNG\"},\"ticket\":{\"note\":\"Sau khi hoàn thành đầy đủ các bước, bạn sẽ nhận được vé điện tử từ Ban Tổ Chức qua email.\\nVé tham gia hoàn toàn miễn phí.\",\"steps\":[{\"id\":\"s1\",\"icon\":\"🔗\",\"title\":\"Bước 1\",\"description\":\"Chia sẻ bài viết trên Facebook cá nhân ở chế độ công khai (Public).\"},{\"id\":\"s2\",\"icon\":\"💬\",\"title\":\"Bước 2\",\"description\":\"Tag 03 người bạn tại phần bình luận của bài viết.\"},{\"id\":\"s3\",\"icon\":\"📝\",\"title\":\"Bước 3\",\"description\":\"Điền form đăng ký bên dưới để nhận vé.\"}],\"sectionTitle\":\"CÁCH THỨC NHẬN VÉ\"},\"artists\":{\"artists\":[{\"id\":\"a5\",\"name\":\"LyHan\",\"hints\":[],\"image\":\"/uploads/1774629441418-557171689.webp\",\"status\":\"revealed\",\"description\":\"Lyhan (Trần Hạnh Lý) là nữ ca sĩ Gen Z đại diện cho làn sóng âm nhạc hiện đại, ngọt ngào và đầy cá tính. Cô sở hữu chất giọng trong trẻo, bay bổng cùng tư duy âm nhạc hợp thời, dễ dàng chinh phục khán giả qua các bản phối Synth-pop và City Pop bắt tai. Không chỉ gây ấn tượng bởi những bản hit viral như \\\"Yêu anh nhất đời\\\", Lyhan còn thu hút lượng fan đông đảo nhờ ngoại hình cuốn hút và phong cách thời trang mang đậm hơi thở thời đại.\"},{\"id\":\"mn8m95ns\",\"name\":\"Mason Nguyễn\",\"hints\":[],\"image\":\"/uploads/1774629613855-442985758.webp\",\"status\":\"revealed\",\"description\":\"Mason Nguyễn (tên thật là Nguyễn Xuân Bách) là một nam rapper, ca sĩ đầy tài năng bước ra từ cộng đồng Underground và bùng nổ mạnh mẽ tại Rap Việt mùa 4 cùng chương trình Anh Trai \\\"Say Hi\\\". Anh chinh phục khán giả bằng lối rap thông minh, flow mượt mà và khả năng trình diễn sân khấu cực kỳ lôi cuốn. Với ngoại hình điển trai và tư duy âm nhạc hiện đại, Mason Nguyễn hiện là một trong những nghệ sĩ Gen Z đa năng, sở hữu nhiều bản hit viral như \\\"Siren\\\" hay \\\"Yêu anh nhất đời\\\".\"}],\"sectionTitle\":\"Sự Xuất Hiện Của Các Ngôi Sao\"},\"banners\":[{\"id\":\"b1\",\"image\":\"/assets/images/banner/1774629388225-128694838.webp\",\"title\":\"HUIT FEST 2026\",\"subtitle\":\"CITY HEART\",\"buttonLink\":\"#register\",\"buttonText\":\"Đăng ký ngay\"}],\"journey\":{\"cards\":[{\"id\":135,\"title\":\"KHÔNG GIAN ÂM NHẠC HOÀNH TRÁNG\",\"description\":\"Không gian âm nhạc ngoài trời với sức nóng mùa hè\",\"image\":\"/assets/images/hanhtrinh/1774629802372-344322998.webp\"},{\"id\":136,\"title\":\"GẶP GỠ LOẠT IDOLS ĐÌNH ĐÁM\",\"description\":\"Cháy hết mình cùng dàn line-up xịn sò\",\"image\":\"/assets/images/hanhtrinh/1774597032713-460379480.webp\"}],\"items\":[{\"id\":135,\"title\":\"KHÔNG GIAN ÂM NHẠC HOÀNH TRÁNG\",\"description\":\"Không gian âm nhạc ngoài trời với sức nóng mùa hè\",\"image\":\"/assets/images/hanhtrinh/1774629802372-344322998.webp\"},{\"id\":136,\"title\":\"GẶP GỠ LOẠT IDOLS ĐÌNH ĐÁM\",\"description\":\"Cháy hết mình cùng dàn line-up xịn sò\",\"image\":\"/assets/images/hanhtrinh/1774597032713-460379480.webp\"}],\"sectionTitle\":\"Hành Trình HUIT FEST \"},\"timeline\":{\"items\":[{\"id\":192,\"time\":\"15:30 - 17:00\",\"title\":\"Đón khách và check-in\",\"description\":\"Cổng check-in sẽ đóng vào lúc 17:30\"},{\"id\":193,\"time\":\"17:00 - 17:30\",\"title\":\"Khuấy động\",\"description\":\"Giao lưu và khuấy động không khí cùng khán giả\"},{\"id\":194,\"time\":\"17:30 - 18:10\",\"title\":\"Văn nghệ\",\"description\":\"Tiết mục văn nghệ đặc sắc từ sinh viên\"}],\"sideImage\":\"\",\"sectionTitle\":\"Time-line chương trình\"},\"countdown\":{\"targetDate\":\"2026-04-11T14:00\",\"sectionTitle\":\"SỰ KIỆN BẮT ĐẦU SAU\"}}');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `journeyitem`
--

CREATE TABLE `journeyitem` (
  `id` int(11) NOT NULL,
  `eventId` int(11) NOT NULL,
  `title` varchar(191) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `imageUrl` text DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `journeyitem`
--

INSERT INTO `journeyitem` (`id`, `eventId`, `title`, `description`, `imageUrl`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
(143, 1, 'KHÔNG GIAN ÂM NHẠC HOÀNH TRÁNG', 'Không gian âm nhạc ngoài trời với sức nóng mùa hè', '/assets/images/hanhtrinh/1774629802372-344322998.webp', 1, '2026-03-27 18:11:04.689', '2026-03-27 18:11:04.678'),
(144, 1, 'GẶP GỠ LOẠT IDOLS ĐÌNH ĐÁM', 'Cháy hết mình cùng dàn line-up xịn sò', '/assets/images/hanhtrinh/1774597032713-460379480.webp', 2, '2026-03-27 18:11:04.689', '2026-03-27 18:11:04.678');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `registration`
--

CREATE TABLE `registration` (
  `id` int(11) NOT NULL,
  `eventId` int(11) NOT NULL,
  `fullName` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `phone` varchar(191) NOT NULL,
  `school` varchar(191) DEFAULT NULL,
  `province` varchar(191) DEFAULT NULL,
  `role` varchar(191) DEFAULT NULL,
  `major` varchar(191) DEFAULT NULL,
  `campus` varchar(191) DEFAULT NULL,
  `checkedIn` tinyint(1) NOT NULL DEFAULT 0,
  `note` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ruleitem`
--

CREATE TABLE `ruleitem` (
  `id` int(11) NOT NULL,
  `eventId` int(11) NOT NULL,
  `title` varchar(191) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `ruleitem`
--

INSERT INTO `ruleitem` (`id`, `eventId`, `title`, `content`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
(47, 1, 'QUY ĐỊNH CHUNG', 'Vé và check-in: Ban Tổ chức (BTC) sẽ kiểm duyệt thông tin đăng ký vé hợp lệ và gửi vé qua email cho bạn trong vòng 48h sau khi đăng ký.', 1, '2026-03-27 18:11:04.694', '2026-03-27 18:11:04.678');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `sponsor`
--

CREATE TABLE `sponsor` (
  `id` int(11) NOT NULL,
  `eventId` int(11) NOT NULL,
  `name` varchar(191) DEFAULT NULL,
  `imageUrl` text DEFAULT NULL,
  `linkUrl` text DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `sponsor`
--

INSERT INTO `sponsor` (`id`, `eventId`, `name`, `imageUrl`, `linkUrl`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
(115, 1, 'HUIT MEDIA', '/assets/images/logo/logomedia.jpg', NULL, 1, '2026-03-27 18:11:04.691', '2026-03-27 18:11:04.678'),
(116, 1, 'Đối tác', '/assets/images/logo/avt.jpg', NULL, 2, '2026-03-27 18:11:04.691', '2026-03-27 18:11:04.678'),
(117, 1, 'Lyhan', '/assets/images/sponsors/1774629845487-352481538.webp', NULL, 3, '2026-03-27 18:11:04.691', '2026-03-27 18:11:04.678');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `timelineitem`
--

CREATE TABLE `timelineitem` (
  `id` int(11) NOT NULL,
  `eventId` int(11) NOT NULL,
  `timeLabel` varchar(191) DEFAULT NULL,
  `title` varchar(191) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `timelineitem`
--

INSERT INTO `timelineitem` (`id`, `eventId`, `timeLabel`, `title`, `description`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
(204, 1, '15:30 - 17:00', 'Đón khách và check-in', 'Cổng check-in sẽ đóng vào lúc 17:30', 1, '2026-03-27 18:11:04.684', '2026-03-27 18:11:04.678'),
(205, 1, '17:00 - 17:30', 'Khuấy động', 'Giao lưu và khuấy động không khí cùng khán giả', 2, '2026-03-27 18:11:04.684', '2026-03-27 18:11:04.678'),
(206, 1, '17:30 - 18:10', 'Văn nghệ', 'Tiết mục văn nghệ đặc sắc từ sinh viên', 3, '2026-03-27 18:11:04.684', '2026-03-27 18:11:04.678');

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `adminuser`
--
ALTER TABLE `adminuser`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `AdminUser_username_key` (`username`);

--
-- Chỉ mục cho bảng `agendaitem`
--
ALTER TABLE `agendaitem`
  ADD PRIMARY KEY (`id`),
  ADD KEY `AgendaItem_eventId_idx` (`eventId`);

--
-- Chỉ mục cho bảng `artist`
--
ALTER TABLE `artist`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Artist_eventId_idx` (`eventId`);

--
-- Chỉ mục cho bảng `event`
--
ALTER TABLE `event`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Event_slug_key` (`slug`);

--
-- Chỉ mục cho bảng `journeyitem`
--
ALTER TABLE `journeyitem`
  ADD PRIMARY KEY (`id`),
  ADD KEY `JourneyItem_eventId_idx` (`eventId`),
  ADD KEY `JourneyItem_eventId_sortOrder_idx` (`eventId`,`sortOrder`);

--
-- Chỉ mục cho bảng `registration`
--
ALTER TABLE `registration`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Registration_email_idx` (`email`),
  ADD KEY `Registration_eventId_idx` (`eventId`),
  ADD KEY `Registration_phone_idx` (`phone`);

--
-- Chỉ mục cho bảng `ruleitem`
--
ALTER TABLE `ruleitem`
  ADD PRIMARY KEY (`id`),
  ADD KEY `RuleItem_eventId_idx` (`eventId`),
  ADD KEY `RuleItem_eventId_sortOrder_idx` (`eventId`,`sortOrder`);

--
-- Chỉ mục cho bảng `sponsor`
--
ALTER TABLE `sponsor`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Sponsor_eventId_idx` (`eventId`),
  ADD KEY `Sponsor_eventId_sortOrder_idx` (`eventId`,`sortOrder`);

--
-- Chỉ mục cho bảng `timelineitem`
--
ALTER TABLE `timelineitem`
  ADD PRIMARY KEY (`id`),
  ADD KEY `TimelineItem_eventId_idx` (`eventId`),
  ADD KEY `TimelineItem_eventId_sortOrder_idx` (`eventId`,`sortOrder`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `adminuser`
--
ALTER TABLE `adminuser`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `agendaitem`
--
ALTER TABLE `agendaitem`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `artist`
--
ALTER TABLE `artist`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `event`
--
ALTER TABLE `event`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `journeyitem`
--
ALTER TABLE `journeyitem`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=145;

--
-- AUTO_INCREMENT cho bảng `registration`
--
ALTER TABLE `registration`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ruleitem`
--
ALTER TABLE `ruleitem`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT cho bảng `sponsor`
--
ALTER TABLE `sponsor`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=118;

--
-- AUTO_INCREMENT cho bảng `timelineitem`
--
ALTER TABLE `timelineitem`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=207;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `agendaitem`
--
ALTER TABLE `agendaitem`
  ADD CONSTRAINT `AgendaItem_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `artist`
--
ALTER TABLE `artist`
  ADD CONSTRAINT `Artist_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `journeyitem`
--
ALTER TABLE `journeyitem`
  ADD CONSTRAINT `JourneyItem_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `registration`
--
ALTER TABLE `registration`
  ADD CONSTRAINT `Registration_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `ruleitem`
--
ALTER TABLE `ruleitem`
  ADD CONSTRAINT `RuleItem_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `sponsor`
--
ALTER TABLE `sponsor`
  ADD CONSTRAINT `Sponsor_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `timelineitem`
--
ALTER TABLE `timelineitem`
  ADD CONSTRAINT `TimelineItem_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
