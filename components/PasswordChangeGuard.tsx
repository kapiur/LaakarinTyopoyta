"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function PasswordChangeGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (pathname === "/login") return;
    if (pathname === "/profile/security") return;

    const mustChangePassword = (session?.user as any)?.mustChangePassword === true;
    if (mustChangePassword) {
      router.replace("/profile/security");
    }
  }, [pathname, router, session, status]);

  return null;
}
