import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

const intl = createIntlMiddleware(routing);

function splitLocale(pathname: string) {
  const [, first, ...rest] = pathname.split("/");
  if (first && (routing.locales as readonly string[]).includes(first)) {
    return { locale: first, path: `/${rest.join("/")}` };
  }
  return { locale: routing.defaultLocale, path: pathname };
}

function localized(locale: string, path: string) {
  return locale === routing.defaultLocale ? path : `/${locale}${path === "/" ? "" : path}`;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { locale, path } = splitLocale(pathname);
  const isApp = path === "/app" || path.startsWith("/app/");
  const isAuthPage = path === "/login";

  if (isApp || isAuthPage) {
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (isApp && !session) {
      const url = new URL(localized(locale, "/login"), request.url);
      url.searchParams.set("next", `${path}${search}`);
      return NextResponse.redirect(url);
    }
    if (isAuthPage && session) {
      return NextResponse.redirect(new URL(localized(locale, "/app"), request.url));
    }
  }

  const response = intl(request);
  if (isApp) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Skip API routes, Next internals and any file with an extension (assets, robots.txt, sitemap.xml…).
  matcher: ["/((?!api|_next|_vercel|apple-icon|icon|manifest|sitemap|robots|.*\\..*).*)"],
};
