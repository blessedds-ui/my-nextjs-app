import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { getAuthSecret } from "@/lib/auth-secret";

const scopes = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Tasks.Read",
].join(" ");

const azureConfigured =
  Boolean(process.env.AZURE_AD_CLIENT_ID) &&
  Boolean(process.env.AZURE_AD_CLIENT_SECRET) &&
  Boolean(process.env.AZURE_AD_TENANT_ID);

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  providers: [
    CredentialsProvider({
      id: "demo",
      name: "Demo",
      credentials: {
        password: { label: "Password", type: "password", placeholder: "demo" },
      },
      async authorize(credentials) {
        if (credentials?.password !== "demo") {
          return null;
        }
        return {
          id: "demo-user",
          name: "Morgan Chen",
          email: "morgan.chen@fabrikam.com",
        };
      },
    }),
    ...(azureConfigured
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID!,
            authorization: {
              params: { scope: scopes },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.provider === "demo" && user) {
        token.isDemo = true;
        delete token.accessToken;
        delete token.refreshToken;
        delete token.expiresAt;
        return token;
      }

      if (account?.access_token) {
        token.isDemo = false;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      if (token.isDemo) {
        return token;
      }

      const expiresAt = token.expiresAt as number | undefined;
      const refreshToken = token.refreshToken as string | undefined;
      if (
        azureConfigured &&
        expiresAt &&
        Date.now() / 1000 > expiresAt - 120 &&
        refreshToken
      ) {
        const tenant = process.env.AZURE_AD_TENANT_ID!;
        const body = new URLSearchParams({
          client_id: process.env.AZURE_AD_CLIENT_ID!,
          client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          scope: scopes,
        });
        const res = await fetch(
          `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
          { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }
        );
        if (res.ok) {
          const json = (await res.json()) as {
            access_token: string;
            refresh_token?: string;
            expires_in: number;
          };
          token.accessToken = json.access_token;
          if (json.refresh_token) token.refreshToken = json.refresh_token;
          token.expiresAt = Math.floor(Date.now() / 1000) + json.expires_in;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.isDemo = Boolean(token.isDemo);
      if (session.user && !token.isDemo && token.accessToken) {
        session.accessToken = token.accessToken as string;
      } else {
        delete session.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
