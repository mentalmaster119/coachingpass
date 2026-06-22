import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.HERCULES_OIDC_AUTHORITY || "https://dummy-auth-provider.com",
      applicationID: process.env.HERCULES_OIDC_CLIENT_ID || "dummy-client-id",
    },
  ],
} satisfies AuthConfig;
