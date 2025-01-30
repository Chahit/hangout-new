'use client';

import { PropsWithChildren, useEffect } from 'react';
import { configureAbly } from "@ably-labs/react-hooks";

export function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    configureAbly({
      key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
      clientId: `collegeconnect_${Math.random().toString(36).substring(2, 15)}`
    });
  }, []);

  return children;
} 