import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import {
  createManagedUserSession,
  revokeManagedUserSession,
  touchManagedUserSession,
  USER_SESSION_MAX_AGE_SECONDS,
  USER_SESSION_TOUCH_INTERVAL_MS,
  USER_SESSION_VALIDATE_INTERVAL_MS,
  validateManagedUserSession,
} from "./authSession";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Salasana", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.isActive) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) return null;

        const managedSession = await createManagedUserSession(user.id);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          authSessionKey: managedSession.sessionKey,
          sessionReplacementNotice: managedSession.replacedPreviousSession,
        } as any;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: USER_SESSION_MAX_AGE_SECONDS,
  },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.mustChangePassword = (user as any).mustChangePassword;
        token.authSessionKey = (user as any).authSessionKey;
        token.sessionReplacementNotice = (user as any).sessionReplacementNotice === true;
        token.authSessionCheckedAt = Date.now();
        token.authSessionTouchedAt = Date.now();
        token.sessionRevoked = false;
        return token;
      }

      const userId = Number(token.sub);
      const sessionKey = typeof token.authSessionKey === "string" ? token.authSessionKey : null;

      if (!Number.isInteger(userId) || !sessionKey) {
        token.sessionRevoked = true;
        return token;
      }

      const now = Date.now();
      const lastCheckedAt = typeof token.authSessionCheckedAt === "number" ? token.authSessionCheckedAt : 0;
      const shouldRevalidate = now - lastCheckedAt >= USER_SESSION_VALIDATE_INTERVAL_MS;

      if (!shouldRevalidate) {
        return token;
      }

      const managedSession = await validateManagedUserSession(userId, sessionKey);

      if (!managedSession) {
        token.sessionRevoked = true;
        token.authSessionCheckedAt = now;
        return token;
      }

      const lastTouchedAt = typeof token.authSessionTouchedAt === "number" ? token.authSessionTouchedAt : 0;
      if (now - lastTouchedAt >= USER_SESSION_TOUCH_INTERVAL_MS) {
        await touchManagedUserSession(sessionKey);
        token.authSessionTouchedAt = now;
      }

      token.authSessionCheckedAt = now;
      token.sessionRevoked = false;
      return token;
    },
    async session({ session, token }) {
      if ((token as any).sessionRevoked) {
        return null as any;
      }

      if (token && session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).mustChangePassword = token.mustChangePassword;
        (session.user as any).authSessionKey = token.authSessionKey;
        (session.user as any).sessionReplacementNotice = token.sessionReplacementNotice === true;
      }

      return session;
    },
  },
  events: {
    async signOut(message) {
      const sessionKey = typeof (message.token as any)?.authSessionKey === "string"
        ? (message.token as any).authSessionKey
        : null;

      if (sessionKey) {
        await revokeManagedUserSession(sessionKey, "user_sign_out");
      }
    },
  },
};
