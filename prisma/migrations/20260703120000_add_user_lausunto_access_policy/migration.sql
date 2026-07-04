CREATE TABLE "UserLausuntoAccessPolicy" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "lausuntoToolEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserLausuntoAccessPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserLausuntoAccessPolicy_userId_key" ON "UserLausuntoAccessPolicy"("userId");
CREATE INDEX "UserLausuntoAccessPolicy_lausuntoToolEnabled_idx" ON "UserLausuntoAccessPolicy"("lausuntoToolEnabled");

ALTER TABLE "UserLausuntoAccessPolicy"
ADD CONSTRAINT "UserLausuntoAccessPolicy_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
