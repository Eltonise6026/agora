import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe } from "@/lib/stripe";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await auth();
  if (!(session as any)?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session as any).userId as string;
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let customerId = user[0].stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user[0].email || undefined,
      metadata: { userId, githubUsername: user[0].githubUsername },
    });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3002";
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    mode: "subscription",
    success_url: `${origin}/dashboard/billing?success=true`,
    cancel_url: `${origin}/dashboard/billing?canceled=true`,
    metadata: { userId },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
