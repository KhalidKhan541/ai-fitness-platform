import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./db";
import { config } from "./config";

import type { Role } from "@prisma/client";

// ─── Types ────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: Role;
      username: string | null;
      isPremium: boolean;
    };
  }

  interface User {
    role: Role;
    username: string | null;
    isPremium: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    username: string | null;
    isPremium: boolean;
  }
}

// ─── Validation Schema ────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Auth Options ─────────────────────────────────────

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
    newUser: "/onboarding",
  },
  providers: [
    // ── Credentials ──
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) {
          throw new Error("Invalid credentials format");
        }

        const { email, password } = validated.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            role: true,
            username: true,
            isPremium: true,
            isActive: true,
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error("No account found with this email");
        }

        if (!user.isActive) {
          throw new Error("Account is deactivated. Contact support.");
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        // Update last login timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          username: user.username,
          isPremium: user.isPremium,
        };
      },
    }),

    // ── GitHub ──
    GitHubProvider({
      clientId: config.auth.githubClientId,
      clientSecret: config.auth.githubClientSecret,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          role: "USER" as Role,
          username: profile.login,
          isPremium: false,
        };
      },
    }),

    // ── Google ──
    GoogleProvider({
      clientId: config.auth.googleClientId,
      clientSecret: config.auth.googleClientSecret,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: "USER" as Role,
          username: profile.email?.split("@")[0] ?? null,
          isPremium: false,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Allow OAuth sign-ins without email verification
      if (account?.provider !== "credentials") {
        return true;
      }

      // For credentials, check if user exists
      if (user?.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { isActive: true },
        });

        if (existingUser && !existingUser.isActive) {
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      // Initial sign-in: populate token with user data
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.isPremium = user.isPremium;
      }

      // Refresh user data from DB periodically
      if (token.id && account) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            role: true,
            isPremium: true,
            username: true,
            isActive: true,
          },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.isPremium = dbUser.isPremium;
          token.username = dbUser.username;

          if (!dbUser.isActive) {
            return {}; // Force re-authentication
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.username = token.username;
        session.user.isPremium = token.isPremium;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },

  events: {
    async signIn({ user, isNewUser }) {
      // Track sign-in events
      if (user?.id) {
        await prisma.usageMetric.create({
          data: {
            userId: user.id,
            metric: "sign_in",
            value: 1,
            period: new Date().toISOString().slice(0, 7),
            date: new Date(),
          },
        }).catch(() => {}); // Non-critical, don't fail sign-in
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
};

// ─── Helper Functions ─────────────────────────────────

/**
 * Get the current session server-side.
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Get the authenticated user or throw.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

/**
 * Get the authenticated user or return null.
 */
export async function getAuthUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Check if the user has a specific role.
 */
export async function hasRole(role: Role): Promise<boolean> {
  const user = await getAuthUser();
  return user?.role === role;
}

/**
 * Check if the user is an admin.
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole("ADMIN");
}

/**
 * Check if the user is a coach.
 */
export async function isCoach(): Promise<boolean> {
  const user = await getAuthUser();
  return user?.role === "COACH" || user?.role === "ADMIN";
}

/**
 * Verify a password against a hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash a password.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Generate a JWT token for API use (outside of NextAuth).
 */
export function createApiToken(payload: {
  userId: string;
  role: Role;
}): string {
  // In production, use a proper JWT library like jsonwebtoken
  // This is a simplified version for the infrastructure
  return Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    }),
  ).toString("base64");
}

export default authOptions;
