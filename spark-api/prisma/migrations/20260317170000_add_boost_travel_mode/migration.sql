-- AlterTable
ALTER TABLE "users" ADD COLUMN "boosted_until" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "travel_latitude" DOUBLE PRECISION;
ALTER TABLE "users" ADD COLUMN "travel_longitude" DOUBLE PRECISION;
ALTER TABLE "users" ADD COLUMN "travel_city" TEXT;
ALTER TABLE "users" ADD COLUMN "is_travel_mode" BOOLEAN NOT NULL DEFAULT false;
