-- CreateTable
CREATE TABLE "UserAuthSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "UserAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAuthSession_sessionKey_key" ON "UserAuthSession"("sessionKey");

-- CreateIndex
CREATE INDEX "UserAuthSession_userId_revokedAt_expiresAt_idx" ON "UserAuthSession"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "UserAuthSession_sessionKey_idx" ON "UserAuthSession"("sessionKey");

-- AddForeignKey
ALTER TABLE "UserAuthSession" ADD CONSTRAINT "UserAuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
