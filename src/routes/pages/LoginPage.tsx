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
        <label for="email">Email</label>
        <input id="email" type="email" name="email" />
        <br />
        <label for="password">Password</label>
        <input id="password" type="password" name="password" />
        <br />
        <button type="submit">Login</button>
      </form>
      {props.error && <p>{props.error}</p>}
    </body>
  </html>;
}