CREATE TABLE `TimelineItem` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `eventId` INTEGER NOT NULL,
  `timeLabel` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `TimelineItem_eventId_idx`(`eventId`),
  INDEX `TimelineItem_eventId_sortOrder_idx`(`eventId`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TimelineItem`
  ADD CONSTRAINT `TimelineItem_eventId_fkey`
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
