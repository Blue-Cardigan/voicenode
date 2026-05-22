import { initBotId } from "botid/client/core";

// Register routes that should carry the BotID challenge. The matching
// server-side `checkBotId()` call lives in `app/api/agent/token/route.ts`.
initBotId({
  protect: [
    {
      path: "/api/agent/token",
      method: "GET",
    },
  ],
});
