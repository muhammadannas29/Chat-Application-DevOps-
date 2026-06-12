-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "file_key" TEXT,
ADD COLUMN     "file_name" TEXT,
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "file_type" TEXT,
ADD COLUMN     "file_url" TEXT,
ALTER COLUMN "content" DROP NOT NULL;
