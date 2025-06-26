import { Html, html } from "@elysiajs/html";
import { AuthStateV1 } from "@/middlewares/session/sessionStates";

type LoginPageProps = {
  state: AuthStateV1;
  error?: string;
}

export function LoginPage(props: LoginPageProps) {
  return <html>
    <body>
      <h1>Login</h1>
      <form action="/flow/v1/login" method="post">
        <input type="email" name="email" />
        <input type="password" name="password" />
        <button type="submit">Login</button>
      </form>
      {props.error && <p>{props.error}</p>}
    </body>
  </html>;
}