import { Elysia } from "elysia";
import { authRouter } from "@/routes/authorize";
import { v1LoginRouter } from "@/routes/login";
import swagger from "@elysiajs/swagger";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { v1RedirectRouter } from "@/routes/redirect";
import { tokenRouter } from "@/routes/token";

const app = new Elysia()
  .use(swagger()) // http://localhost:3000/swagger
  .use
  (
    opentelemetry({
      spanProcessors: [
        new BatchSpanProcessor(
          new OTLPTraceExporter()
        )
      ]
    })
  )
  .use(authRouter)
  .use(v1LoginRouter)
  .use(v1RedirectRouter)
  .use(tokenRouter)

export default app;