"use client"
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedResultData, ClientData } from "./flow-controller"; // Impor tipe yang sama
import { Session } from "next-auth";

interface RatControlFormProps {
  client: ClientData | null;
  session: Session | null;
  onFormSubmit: (hasil: UnifiedResultData) => void;
}

export default function RatControlForm({ client, session, onFormSubmit }: RatControlFormProps) {
  // --- STATE SPESIFIK UNTUK RAT CONTROL ---
  const [tingkatInfestasi, setTingkatInfestasi] = useState<'Rendah' | 'Sedang' | 'Tinggi'>('Sedang');
  const [jumlahBaitStation, setJumlahBaitStation] = useState(10);
  const [jumlahPerangkap, setJumlahPerangkap] = useState(5);
  // --- STATE UMUM UNTUK INSPEKSI ---
  const [summary, setSummary] = useState("Ditemukan jejak tikus di area dapur dan plafon.");
  const [recommendation, setRecommendation] = useState("Pemasangan bait station di perimeter luar dan perangkap di dalam.");

  const handleSubmit = () => {
    // Di dunia nyata, Anda mungkin juga punya API call di sini.
    // Untuk contoh ini, kita langsung rakit datanya.

    const finalResult: UnifiedResultData = {
      serviceType: 'RC',
      client: client,
      agentName: session?.user?.name ?? 'N/A',
      inspection: {
        dateTime: new Date().toLocaleString('id-ID'),
        images: [], // TODO: Implementasikan upload gambar untuk RC
        summary: summary,
        recommendation: recommendation,
        treatment: "Baiting & Trapping",
        status: "Terdeteksi Hama",
      },
      details: {
        // Masukkan data spesifik RC ke sini
        tingkatInfestasi: tingkatInfestasi,
        jumlahBaitStation: jumlahBaitStation,
        jumlahPerangkap: jumlahPerangkap,
        rekomendasiSanitasi: "Tutup semua sumber makanan dan perbaiki lubang di dinding."
      }
    };
    
    onFormSubmit(finalResult);
  }

  return (
    <Card className="p-6 bg-black/90 border-l-4 border-blue-500 text-white space-y-6">
      <h2 className="text-xl font-bold headline">Formulir Rat Control (RC)</h2>
      {/* --- UI SPESIFIK UNTUK FORM RC --- */}
      <div>
        <Label>Tingkat Infestasi</Label>
        {/* Anda akan menggunakan Select di sini */}
      </div>
      <div>
        <Label>Jumlah Bait Station</Label>
        <Input type="number" value={jumlahBaitStation} onChange={e => setJumlahBaitStation(Number(e.target.value))} />
      </div>
       <div>
        <Label>Kesimpulan</Label>
        <Textarea value={summary} onChange={e => setSummary(e.target.value)} />
      </div>
      <Button onClick={handleSubmit} className="w-full bg-blue-500 hover:bg-blue-600">Lanjutkan</Button>
    </Card>
  )
}