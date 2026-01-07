"use client";

import React from "react";
import { useParams } from "next/navigation";

import { BookingForm } from "@/app/admin/crm/components/BookingForm";

export default function BookingPublicCampaignPage() {
  const params = useParams<{ codigo: string }>();
  const eventCodigo = String(params?.codigo ?? "");

  return <BookingForm campaignEventCodigo={eventCodigo} />;
}
