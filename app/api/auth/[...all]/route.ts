import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// 1. Get the methods object from Better-Auth
const authHandlers = toNextJsHandler(auth);

// 2. Call the specific properties on the object inside clean, standard functions
export async function GET(request: NextRequest) {
  return await authHandlers.GET(request);
}

export async function POST(request: NextRequest) {
  return await authHandlers.POST(request);
}