export const dynamic = "force-dynamic";

// Your existing Better-Auth handler code follows below...
import { auth } from "@/lib/auth/auth"; // or your auth path
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export { handler as GET, handler as POST };