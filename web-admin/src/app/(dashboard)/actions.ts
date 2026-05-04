"use server";

import { redirect } from "next/navigation";
import { logoutRequest } from "@/lib/auth";

export async function logoutAction() {
  await logoutRequest();
  redirect("/login");
}
