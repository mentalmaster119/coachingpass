import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL || "https://peaceful-wolverine-673.convex.site",
      applicationID: "coachingpass-client-id",
    },
  ],
} satisfies AuthConfig;
