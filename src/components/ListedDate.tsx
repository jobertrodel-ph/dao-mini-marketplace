"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

function formatUtcDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return "Ancient Era";
  }
  return (
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(parsed) + " UTC"
  );
}

function formatLocalDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently listed";
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export default function ListedDate({ isoDate }: { isoDate: string }) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return (
    <time dateTime={isoDate}>
      {isClient ? formatLocalDate(isoDate) : formatUtcDate(isoDate)}
    </time>
  );
}
