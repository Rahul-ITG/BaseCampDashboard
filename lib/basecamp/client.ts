import axios, { AxiosInstance } from "axios";
import { rateLimiter } from "./rate-limiter";

const ACCOUNT_ID = process.env.BASECAMP_ACCOUNT_ID || "5402506";
const BASE_URL = `https://3.basecampapi.com/${ACCOUNT_ID}`;
const USER_AGENT = "BasecampDashboard (admin@company.com)";

export class BasecampClient {
  private http: AxiosInstance;

  constructor(accessToken: string) {
    this.http = axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * GET a single resource, respecting rate limits.
   */
  async get<T>(path: string): Promise<T> {
    await rateLimiter.acquire();
    const response = await this.http.get<T>(path);
    return response.data;
  }

  /**
   * GET a paginated resource, following Link headers (rel="next").
   * Returns the concatenated array of all pages.
   * Accepts both relative paths and absolute URLs.
   */
  async getAll<T>(path: string): Promise<T[]> {
    const results: T[] = [];
    let url: string | null = path;

    while (url) {
      await rateLimiter.acquire();
      // Strip baseURL prefix if the URL is absolute to avoid double-prefixing
      const requestUrl = url.startsWith("http")
        ? url.replace(BASE_URL, "")
        : url;
      const response = await this.http.get<T[]>(requestUrl);

      // Handle case where response is not an array (single object endpoint)
      if (Array.isArray(response.data)) {
        results.push(...response.data);
      }

      // Parse Link header for next page
      const linkHeader = response.headers["link"] as string | undefined;
      url = this.parseNextLink(linkHeader);
    }

    return results;
  }

  private parseNextLink(linkHeader: string | undefined): string | null {
    if (!linkHeader) return null;

    const matches = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (!matches) return null;

    // Return the full URL — axios will use it directly
    return matches[1];
  }
}
