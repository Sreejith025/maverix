import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define matching routes that require authorization
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/driver(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in query params
    '/((?!_next|[^?]*\\.[^?]*$).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
