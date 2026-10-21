import Link from "next/link";

// Requests that never reach a locale segment (e.g. malformed paths) fall back here.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f2f5f4", color: "#0d2421" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Page not found</h1>
          <Link href="/" style={{ color: "#12936b" }}>
            Go to Nexora
          </Link>
        </div>
      </body>
    </html>
  );
}
