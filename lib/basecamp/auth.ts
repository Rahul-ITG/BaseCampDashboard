import axios from "axios";
import { prisma } from "@/lib/db";

const TOKEN_URL = "https://launchpad.37signals.com/authorization/token";

/**
 * Get a valid Basecamp access token.
 * Automatically refreshes if the token is expired or about to expire (within 5 minutes).
 */
export async function getValidToken(): Promise<string> {
  const token = await prisma.basecampToken.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!token) {
    throw new Error(
      "No Basecamp token found. Please connect Basecamp at /setup."
    );
  }

  // Refresh if expired or expiring within 5 minutes
  const fiveMinutes = 5 * 60 * 1000;
  if (token.expiresAt.getTime() - Date.now() < fiveMinutes) {
    return refreshToken(token.id, token.refreshToken);
  }

  return token.accessToken;
}

async function refreshToken(
  tokenId: string,
  refreshToken: string
): Promise<string> {
  const response = await axios.post(TOKEN_URL, {
    type: "refresh",
    refresh_token: refreshToken,
    client_id: process.env.BASECAMP_CLIENT_ID,
    client_secret: process.env.BASECAMP_CLIENT_SECRET,
  });

  const { access_token, expires_in } = response.data;

  await prisma.basecampToken.update({
    where: { id: tokenId },
    data: {
      accessToken: access_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    },
  });

  return access_token;
}
