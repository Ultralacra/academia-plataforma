"use client";

import CoachDetailPage from "../page";

export default function CoachChatStandalonePage({
  params,
}: {
  params: { code: string };
}) {
  return <CoachDetailPage params={params} />;
}
