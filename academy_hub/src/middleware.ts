export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/admin/:path*", "/coach/:path*", "/player/:path*"],
};
