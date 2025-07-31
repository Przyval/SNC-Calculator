"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

interface Props {
    children: ReactNode;
}

export function Providers({ children }: Props) {
    return <SessionProvider basePath="/dashboard/api/auth">{children}</SessionProvider>
}