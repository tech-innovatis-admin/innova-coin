import {
  cognitoEnabled,
  credentialsEnabled,
  getAuthMode,
} from "@/lib/authMode";
import { jsonNoStore } from "../_lib/http";

export async function GET() {
  const mode = getAuthMode();
  return jsonNoStore({
    mode,
    credentials: credentialsEnabled(mode),
    cognito: cognitoEnabled(mode),
    platformCode: process.env["PLATFORM_CODE"] || "innovacoin",
  });
}
