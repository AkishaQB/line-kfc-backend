/*
  Warnings:

  - You are about to drop the column `qr_token` on the `coupon_assignments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[coupon_code]` on the table `coupon_assignments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `coupon_code` to the `coupon_assignments` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "coupon_assignments_qr_token_idx";

-- DropIndex
DROP INDEX "coupon_assignments_qr_token_key";

-- AlterTable
ALTER TABLE "coupon_assignments" DROP COLUMN "qr_token",
ADD COLUMN     "coupon_code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "coupon_assignments_coupon_code_key" ON "coupon_assignments"("coupon_code");

-- CreateIndex
CREATE INDEX "coupon_assignments_coupon_code_idx" ON "coupon_assignments"("coupon_code");
