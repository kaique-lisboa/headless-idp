import { Elysia } from "elysia";
import { v1AuthRouter } from "@/routes/authorize";
import { v1LoginRouter } from "@/routes/login";
import swagger from "@elysiajs/swagger";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { v1TokenRouter } from "@/routes/token";
import { v1ErrorRouter } from "./routes/error";

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
  .use(v1AuthRouter)
  .use(v1LoginRouter)
  .use(v1TokenRouter)
  .use(v1ErrorRouter)

export default app;