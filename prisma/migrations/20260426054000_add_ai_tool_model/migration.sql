-- CreateEnum
CREATE TYPE "AiToolScope" AS ENUM ('SYSTEM', 'USER');

-- CreateTable
CREATE TABLE "AiTool" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "prompt" TEXT NOT NULL,
    "scope" "AiToolScope" NOT NULL,
    "userId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiTool_key_idx" ON "AiTool"("key");

-- CreateIndex
CREATE INDEX "AiTool_userId_idx" ON "AiTool"("userId");

-- CreateIndex
CREATE INDEX "AiTool_scope_isActive_order_idx" ON "AiTool"("scope", "isActive", "order");

-- AddForeignKey
ALTER TABLE "AiTool" ADD CONSTRAINT "AiTool_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
