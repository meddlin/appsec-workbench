export interface GitHubClientConfig {
  token: string;
  owner?: string;
  org?: string;
  ownerType?: GitHubOwnerType;
  baseUrl?: string;
  fetch?: FetchLike;
}

export type GitHubOwnerType = "auto" | "org" | "user";

export interface GitHubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  archived: boolean;
  owner: {
    id: number;
    login: string;
    type?: string;
  };
  language: string | null;
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
  visibility?: string;
}

export interface GitHubAuthenticatedUser {
  id: number;
  login: string;
}

export interface GitHubBranchProtection {
  url?: string;
  enabled?: boolean;
  required_status_checks?: unknown;
  enforce_admins?: unknown;
  required_pull_request_reviews?: unknown;
  restrictions?: unknown;
}

export interface GitHubDependabotAlert {
  number: number;
  state: string;
  dependency?: {
    package?: {
      ecosystem?: string;
      name?: string;
    };
    manifest_path?: string;
    scope?: string;
  };
  security_advisory?: {
    ghsa_id?: string;
    cve_id?: string | null;
    summary?: string;
    severity?: string;
  };
  security_vulnerability?: {
    package?: {
      ecosystem?: string;
      name?: string;
    };
    vulnerable_version_range?: string;
    patched_versions?: string;
  };
  html_url?: string;
  created_at?: string;
  updated_at?: string;
  fixed_at?: string | null;
  dismissed_at?: string | null;
}

export interface GitHubEnvironment {
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_ORG?: string;
  GITHUB_OWNER_TYPE?: string;
}

export interface FetchRequestInit {
  headers?: Record<string, string>;
  method?: string;
}

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText: string;
  headers: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type FetchLike = (
  url: string,
  init?: FetchRequestInit,
) => Promise<FetchResponseLike>;

interface GitHubClientOptions {
  token: string;
  owner: string;
  ownerType: GitHubOwnerType;
  baseUrl: string;
  fetch: FetchLike;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export function readGitHubConfigFromEnv(
  env: GitHubEnvironment = process.env,
): GitHubClientConfig {
  const token = env.GITHUB_TOKEN?.trim();
  const owner = env.GITHUB_OWNER?.trim() || env.GITHUB_ORG?.trim();
  const ownerType = parseGitHubOwnerType(env.GITHUB_OWNER_TYPE);

  if (!token) {
    throw new Error("GITHUB_TOKEN is required.");
  }

  if (!owner) {
    throw new Error("GITHUB_OWNER or GITHUB_ORG is required.");
  }

  return {
    token,
    owner,
    ownerType,
  };
}

export function parseGitHubOwnerType(value: string | undefined): GitHubOwnerType {
  if (!value) {
    return "auto";
  }

  const normalizedValue = value.trim().toLowerCase();

  if (
    normalizedValue === "auto" ||
    normalizedValue === "org" ||
    normalizedValue === "user"
  ) {
    return normalizedValue;
  }

  throw new Error("GITHUB_OWNER_TYPE must be one of: auto, org, user.");
}

export function createGitHubApiUrl(
  baseUrl: string,
  path: string,
  query: Record<string, string | number | boolean | undefined> = {},
): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBaseUrl);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export function parseNextLink(linkHeader: string | null): string | undefined {
  if (!linkHeader) {
    return undefined;
  }

  for (const link of linkHeader.split(",")) {
    const [rawUrl, rawRel] = link.split(";").map((part) => part.trim());
    if (rawRel === 'rel="next"' && rawUrl?.startsWith("<") && rawUrl.endsWith(">")) {
      return rawUrl.slice(1, -1);
    }
  }

  return undefined;
}

export function createGitHubHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-inventory",
  };
}

export function createGitHubClient(config: GitHubClientConfig): GitHubClient {
  const token = config.token.trim();
  const owner = (config.owner ?? config.org)?.trim();

  if (!token) {
    throw new Error("GitHub token is required.");
  }

  if (!owner) {
    throw new Error("GitHub owner is required.");
  }

  return new GitHubClient({
    token,
    owner,
    ownerType: config.ownerType ?? "auto",
    baseUrl: config.baseUrl ?? "https://api.github.com",
    fetch: config.fetch ?? fetch,
  });
}

export function createGitHubClientFromEnv(
  env: GitHubEnvironment = process.env,
): GitHubClient {
  return createGitHubClient(readGitHubConfigFromEnv(env));
}

export class GitHubClient {
  private readonly headers: Record<string, string>;

  constructor(private readonly options: GitHubClientOptions) {
    this.headers = createGitHubHeaders(options.token);
  }

  async listRepositories(): Promise<GitHubRepository[]> {
    if (this.options.ownerType === "org") {
      return this.listOrganizationRepositories();
    }

    if (this.options.ownerType === "user") {
      return this.listUserRepositories();
    }

    try {
      return await this.listOrganizationRepositories();
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404) {
        return this.listUserRepositories();
      }

      throw error;
    }
  }

  async getBranchProtection(
    owner: string,
    repo: string,
  ): Promise<GitHubBranchProtection | null> {
    const repository = await this.request<GitHubRepository>(
      createGitHubApiUrl(this.options.baseUrl, `/repos/${owner}/${repo}`),
    );

    try {
      return await this.request<GitHubBranchProtection>(
        createGitHubApiUrl(
          this.options.baseUrl,
          `/repos/${owner}/${repo}/branches/${repository.default_branch}/protection`,
        ),
      );
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404) {
        return null;
      }

      throw error;
    }
  }

  async listDependabotAlerts(
    owner: string,
    repo: string,
  ): Promise<GitHubDependabotAlert[]> {
    return this.paginate<GitHubDependabotAlert>(
      createGitHubApiUrl(
        this.options.baseUrl,
        `/repos/${owner}/${repo}/dependabot/alerts`,
        {
          per_page: 100,
          state: "open,dismissed,fixed,auto_dismissed",
        },
      ),
    );
  }

  private async listOrganizationRepositories(): Promise<GitHubRepository[]> {
    return this.paginate<GitHubRepository>(
      createGitHubApiUrl(this.options.baseUrl, `/orgs/${this.options.owner}/repos`, {
        per_page: 100,
        type: "all",
      }),
    );
  }

  private async listUserRepositories(): Promise<GitHubRepository[]> {
    const authenticatedUser = await this.getAuthenticatedUser();

    if (authenticatedUser.login.toLowerCase() === this.options.owner.toLowerCase()) {
      return this.paginate<GitHubRepository>(
        createGitHubApiUrl(this.options.baseUrl, "/user/repos", {
          affiliation: "owner",
          per_page: 100,
          visibility: "all",
        }),
      );
    }

    return this.paginate<GitHubRepository>(
      createGitHubApiUrl(this.options.baseUrl, `/users/${this.options.owner}/repos`, {
        per_page: 100,
        type: "owner",
      }),
    );
  }

  private async getAuthenticatedUser(): Promise<GitHubAuthenticatedUser> {
    return this.request<GitHubAuthenticatedUser>(
      createGitHubApiUrl(this.options.baseUrl, "/user"),
    );
  }

  private async paginate<T>(firstUrl: string): Promise<T[]> {
    const items: T[] = [];
    let nextUrl: string | undefined = firstUrl;

    while (nextUrl) {
      const response = await this.fetchJson(nextUrl);

      if (!Array.isArray(response.body)) {
        throw new GitHubApiError(
          "Expected paginated GitHub response to be an array.",
          response.status,
          nextUrl,
          response.body,
        );
      }

      items.push(...(response.body as T[]));
      nextUrl = parseNextLink(response.nextLink);
    }

    return items;
  }

  private async request<T>(url: string): Promise<T> {
    const response = await this.fetchJson(url);
    return response.body as T;
  }

  private async fetchJson(url: string): Promise<{
    body: unknown;
    nextLink: string | null;
    status: number;
  }> {
    const response = await this.options.fetch(url, {
      headers: this.headers,
    });

    const body = await readResponseBody(response);

    if (!response.ok) {
      throw new GitHubApiError(
        `GitHub API request failed with ${response.status} ${response.statusText}.`,
        response.status,
        url,
        body,
      );
    }

    return {
      body,
      nextLink: response.headers.get("link"),
      status: response.status,
    };
  }
}

export async function readResponseBody(response: FetchResponseLike): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
