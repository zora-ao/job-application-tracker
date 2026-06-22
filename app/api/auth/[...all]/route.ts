import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const authHandlers = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  // 💡 Accessing request properties tells Next.js this route cannot be pre-rendered statically
  const url = request.url; 
  return await authHandlers.GET(request);
}

export async function POST(request: NextRequest) {
  const url = request.url;
  return await authHandlers.POST(request);
}