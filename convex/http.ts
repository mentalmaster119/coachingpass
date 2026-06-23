import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { JWK_PUBLIC } from "./authUtils";

const http = httpRouter();

// JWKS Endpoint for Convex to fetch the verification public key
http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        keys: [JWK_PUBLIC]
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      }
    );
  })
});

// OpenID Connect Configuration
http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const issuer = `${url.protocol}//${url.host}`;

    return new Response(
      JSON.stringify({
        issuer: issuer,
        jwks_uri: `${issuer}/.well-known/jwks.json`,
        authorization_endpoint: `${issuer}/oauth/authorize`,
        token_endpoint: `${issuer}/oauth/token`,
        userinfo_endpoint: `${issuer}/oauth/userinfo`,
        response_types_supported: ["id_token"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"]
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      }
    );
  })
});

export default http;
