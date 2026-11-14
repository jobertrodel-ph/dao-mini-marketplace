"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OrderStatusRefresher({
  isConfirmed,
}: {
  isConfirmed: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (isConfirmed) {
      return;
    }

    const timer = setTimeout(() => {
      router.refresh();
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [isConfirmed, router]);

  return null;
}
