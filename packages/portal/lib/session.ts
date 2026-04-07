import { auth } from "@/auth";
import { db, users } from "@agora/db";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const session = await auth();
  if (!(session as any)?.userId) return null;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, (session as any).userId))
    .limit(1);
  return result[0] ?? null;
}
