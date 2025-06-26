import { Html, html } from "@elysiajs/html";

export function ErrorPage({ error }: { error: string }) {
  return <html>
    <body>
      <h1>Error</h1>
      <p>{error}</p>
    </body>
  </html>;
}