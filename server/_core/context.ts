import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getOrCreateSupabaseUser } from "../db";
import { getSupabaseUserFromAccessToken } from "../supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authorization = opts.req.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;
    if (token) {
      const supabaseUser = await getSupabaseUserFromAccessToken(token);
      if (supabaseUser) {
        user = await getOrCreateSupabaseUser({
          id: supabaseUser.id,
          email: supabaseUser.email,
          name:
            typeof supabaseUser.user_metadata.full_name === "string"
              ? supabaseUser.user_metadata.full_name
              : typeof supabaseUser.user_metadata.name === "string"
                ? supabaseUser.user_metadata.name
                : null,
        });
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
