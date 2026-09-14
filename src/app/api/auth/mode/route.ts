import { NextResponse } from "next/server";

import {
  brokerEnabled,
  centralOidcConfigured,
  credentialsEnabled,
  getAuthMode,
  INNOVACOIN_PLATFORM_TAG,
  ssoEnabled,
} from "@/lib/auth/authMode";

export async function GET() {
  const mode = getAuthMode();
  return NextResponse.json({
    mode,
    credentials: credentialsEnabled(mode),
    broker: brokerEnabled(mode),
    sso: ssoEnabled(mode),
    centralConfigured: centralOidcConfigured(),
    platformCode: INNOVACOIN_PLATFORM_TAG,
  });
}
