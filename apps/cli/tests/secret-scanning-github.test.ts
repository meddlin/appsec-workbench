import { describe, expect, it, vi } from "vitest";
import {
  createGitHubClient,
  type FetchLike,
  type FetchResponseLike,
} from "../../../packages/github/src/index";

function response(
  body: unknown,
  link: string | null = null,
): FetchResponseLike {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: {
      get: (name) => (name.toLowerCase() === "link" ? link : null),
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe("GitHubClient.listSecretScanningAlerts", () => {
  it("paginates, requests hidden values, and strips the secret property", async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        response(
          [
            {
              number: 1,
              state: "open",
              secret_type: "github_personal_access_token",
              secret: "github_pat_live_value",
            },
          ],
          '<https://api.github.test/repositories/alerts?page=2>; rel="next"',
        ),
      )
      .mockResolvedValueOnce(
        response([
          {
            number: 2,
            state: "resolved",
            resolution: "revoked",
            secret: "masked-or-live-value",
          },
        ]),
      );
    const client = createGitHubClient({
      token: "token",
      owner: "octo-org",
      baseUrl: "https://api.github.test",
      fetch: fetchMock,
    });

    const alerts = await client.listSecretScanningAlerts("octo-org", "repo");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.github.test/repos/octo-org/repo/secret-scanning/alerts?per_page=100&hide_secret=true",
    );
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).not.toHaveProperty("secret");
    expect(alerts[1]).not.toHaveProperty("secret");
  });
});
