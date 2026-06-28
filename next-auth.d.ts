import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      role?: string;
      mustChangePassword?: boolean;
      authSessionKey?: string;
      sessionReplacementNotice?: boolean;
    } & Session["user"];
  }

  interface User {
    role?: string;
    mustChangePassword?: boolean;
    authSessionKey?: string;
    sessionReplacementNotice?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    mustChangePassword?: boolean;
    authSessionKey?: string;
    sessionReplacementNotice?: boolean;
    authSessionCheckedAt?: number;
    authSessionTouchedAt?: number;
    sessionRevoked?: boolean;
  }
}
