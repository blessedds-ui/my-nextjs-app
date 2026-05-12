import { withAuth } from "next-auth/middleware";
import { getAuthSecret } from "@/lib/auth-secret";

export default withAuth({
  secret: getAuthSecret(),
});

export const config = {
  matcher: ["/dashboard"],
};
