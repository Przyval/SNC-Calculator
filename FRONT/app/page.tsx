"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import FlowController from "@/components/flow-controller";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === "loading") {
    return (
        <main className="min-h-screen bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <div className="text-black font-bold text-xl">Memuat Sesi...</div>
        </main>
    );
  }
  
  if (status === "authenticated") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-500 to-amber-600">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8 border-l-4 border-black pl-4 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 -ml-1.5"></div>
            <h1 className="text-3xl md:text-4xl font-bold text-black headline">Kalkulator Risiko Rayap</h1>
            <p className="text-black/80 mt-2">Selamat datang, {session.user?.name}! Hitung potensi kerugian akibat tidak menggunakan layanan anti-rayap.</p>
          </header>

          <FlowController />

          <footer className="mt-12 text-center text-black/70 text-sm">
            <p>© 2024 SNC SAFE & CARE PEST CONTROL</p>
            <p className="text-xs mt-1">*Data berdasarkan penelitian internal SNC 2024</p>
          </footer>
        </div>
      </main>
    )
  }

  return null;
}