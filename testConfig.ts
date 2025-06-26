import arg from "arg";
import { logger } from "@/core/logger";

const args = arg({
  '--config': String,
});

process.env.NODE_CONFIG_ENV = args['--config'];

import { config } from "@/core/config";

logger.info(config);