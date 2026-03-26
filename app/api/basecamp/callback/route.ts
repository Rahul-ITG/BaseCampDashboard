import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/db";

const TOKEN_URL = "https://launchpad.37signals.com/authorization/token";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/setup?error=no_code", request.url)
    );
  }

  try {
    // Exchange authorization code for tokens
    const response = await axios.post(TOKEN_URL, {
      type: "web_server",
      code,
      client_id: process.env.BASECAMP_CLIENT_ID,
      client_secret: process.env.BASECAMP_CLIENT_SECRET,
      redirect_uri: process.env.BASECAMP_REDIRECT_URI,
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // Upsert — keep only one token row
    const existing = await prisma.basecampToken.findFirst();

    if (existing) {
      await prisma.basecampToken.update({
        where: { id: existing.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
        },
      });
    } else {
      await prisma.basecampToken.create({
        data: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
        },
      });
    }

    return NextResponse.redirect(new URL("/setup?success=true", request.url));
  } catch (error) {
    console.error("Basecamp OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/setup?error=token_exchange_failed", request.url)
    );
  }
}
