"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FlowController from "@/components/flow-controller";
import AllRecords from "@/components/all-records";
import { Loader2, List, PlusCircle } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [view, setView] = useState<'selection' | 'new' | 'all'>('selection');

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
        <div className="text-black font-bold text-xl flex items-center">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Memuat Sesi...
        </div>
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
            <p className="text-black/80 mt-2">Selamat datang, {session.user?.name}!</p>
          </header>

          {view === 'selection' && (
            <div className="bg-black/80 p-8 rounded-lg shadow-2xl text-center">
              <h2 className="text-2xl font-bold text-white mb-6">Apa yang ingin Anda lakukan?</h2>
              <div className="flex flex-col md:flex-row gap-6 justify-center">
                <button
                  onClick={() => setView('new')}
                  className="flex items-center justify-center gap-3 p-6 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-600 transition-transform transform hover:scale-105"
                >
                  <PlusCircle className="h-8 w-8" />
                  <span className="text-xl">Input Data Baru</span>
                </button>
                <button
                  onClick={() => setView('all')}
                  className="flex items-center justify-center gap-3 p-6 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-transform transform hover:scale-105"
                >
                  <List className="h-8 w-8" />
                  <span className="text-xl">Lihat Semua Data</span>
                </button>
              </div>
            </div>
          )}

          {view === 'new' && <FlowController />}

          {view === 'all' && <AllRecords accessToken={session?.accessToken} />}

          {/* Tombol untuk kembali ke menu pilihan */}
          {view !== 'selection' && (
            <div className="mt-8 text-center">
                <button onClick={() => setView('selection')} className="text-black font-semibold hover:underline">
                    &larr; Kembali ke Menu Pilihan
                </button>
            </div>
          )}

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