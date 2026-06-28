"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function SessionValidityGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const hadAuthenticatedSessionRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated") {
      hadAuthenticatedSessionRef.current = true;
      return;
    }

    if (status !== "unauthenticated") return;
    if (!hadAuthenticatedSessionRef.current) return;
    if (pathname === "/login") return;

    router.replace("/login?reason=session-ended");
  }, [pathname, router, status]);

  return null;
}
