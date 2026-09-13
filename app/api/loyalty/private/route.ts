import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

type PrivateMembership = {
  id: string;
  partner: string;
  program: string;
  alliance: string;
  points: number;
  redeemed: number | null;
  expiry: "Soft" | "Hard" | "NA";
  memberId: string | null;
  balanceStatus: "positive" | "zero";
};

type DirectoryOnlyHotelAccount = {
  id: string;
  partner: string;
  program: string;
  alliance: "Hotels";
  memberId: string;
};

type PrivateSnapshot = {
  memberships: PrivateMembership[];
  directoryOnlyHotelAccounts: DirectoryOnlyHotelAccount[];
};

function runtimeEnv() {
  return env as unknown as Record<string, string | undefined>;
}

function ownerAllowlist(values: Record<string, string | undefined>) {
  return {
    userIds: (values.LOYALTY_OWNER_USER_ID ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    emails: (values.LOYALTY_OWNER_EMAIL ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  };
}

function readPrivateSnapshot(value: string | undefined): PrivateSnapshot | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PrivateSnapshot>;
    if (
      !Array.isArray(parsed.memberships) ||
      !Array.isArray(parsed.directoryOnlyHotelAccounts)
    )
      return null;
    return parsed as PrivateSnapshot;
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json(
      {
        error: "authentication_required",
        message: "Sign in with ChatGPT to view restricted account details.",
        signInPath: "/signin-with-chatgpt?return_to=%2F",
      },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const values = runtimeEnv();
  const allowlist = ownerAllowlist(values);
  if (!allowlist.emails.length && !allowlist.userIds.length) {
    return Response.json(
      {
        error: "owner_not_configured",
        message:
          "The site owner must configure an explicit identity before private details are enabled.",
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const ownerMatch =
    allowlist.userIds.includes(user.userId) ||
    allowlist.emails.includes(user.email.toLowerCase());
  if (!ownerMatch) {
    return Response.json(
      {
        error: "owner_access_required",
        message:
          "This signed-in account is not authorized for private account details.",
      },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const snapshot = readPrivateSnapshot(values.LOYALTY_PRIVATE_SNAPSHOT_JSON);
  if (!snapshot) {
    return Response.json(
      {
        error: "private_snapshot_unavailable",
        message: "Private account details have not been configured yet.",
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return Response.json(
    {
      ...snapshot,
      viewer: {
        userId: user.userId,
        displayName: user.displayName,
        email: user.email,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
