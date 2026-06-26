import { NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserFromAccessToken, isAdminEmail } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ success: true, isAdmin: false });
    }

    const user = await getUserFromAccessToken(accessToken);
    if (!user) {
      return NextResponse.json({ success: true, isAdmin: false });
    }

    return NextResponse.json({
      success: true,
      isAdmin: isAdminEmail(user.email ?? ""),
    });
  } catch (error) {
    console.error("admin check error:", error);
    return NextResponse.json(
      {
        success: false,
        isAdmin: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
