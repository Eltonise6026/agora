"use server";

import { signIn } from "@/auth";

export async function loginWithGithub() {
  await signIn("github", { redirectTo: "/dashboard" });
}
