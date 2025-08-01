"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, ChevronLeft, ChevronRight, ZoomIn, Download, Share2, Printer, Loader2 } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface InspectionImage {
  url: string
  description: string
}

interface InspectionResultData {
  id?: number;
  clientName?: string;
  dateTime: string;
  images: { url: string; description: string }[];
  summary: string;
  recommendation: string;
  treatment: string;
  status: string;
  agentName?: string;
}

interface ClientData { id: number | null; name: string; }
interface PerhitunganData {   // Property fields
  luasTanah: number;
  umurBangunan: number;
  // lokasiRumah: string;
  materialBangunan: string;
  riwayatRayap: string;
  tingkatKelembaban: number;
  jumlahPerabotKayu: number;
  // adaDanauSebelumnya: string;
  adaLahanKosongDisekitar: string;
  // jenisTanah: string;
  jenisLantai: string;
  // Calculated fields from API
  skorRisiko: number;
  kategoriRisiko: string;
  estimasiKerugian: number;
  rekomendasiLayanan: string;
  // Cost fields
  biayaPerbaikan: number;
  biayaLayanan: number;
  penghematan: number;
}
interface KecamatanData { id: string; name: string; riskLevel: "tinggi" | "sedang" | "rendah"; }
interface FullExportData {
  client: ClientData | null;
  hasilPerhitungan: PerhitunganData | null;
  selectedKecamatan: KecamatanData | null;
  inspectionResults: InspectionResultData | null;
}

interface InspectionResultsProps {
  inspectionResults: InspectionResultData | null;
  // Add the new prop here
  fullExportData: FullExportData;
}

const laravelLoader = ({ src }: { src: string }) => {
  // return `https://kalkulatorsnc.my.id${src}`;
  return `http://localhost:8000${src}`;
};

export default function InspectionResults({ inspectionResults, fullExportData }: InspectionResultsProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false);

  // THIS IS THE CORRECTED DOWNLOAD HANDLER
  const handleDownload = async () => {
    // Check if the full data object is available
    if (!fullExportData || !fullExportData.client || !fullExportData.inspectionResults) {
      console.error("Cannot download: Data is incomplete.", fullExportData);
      // Optionally, show an error to the user
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch('api/export-inspection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullExportData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hasil_Inspeksi_${fullExportData.client.name.replace(/ /g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const nextSlide = () => {
    if (!inspectionResults || inspectionResults.images.length === 0) return;
    setActiveIndex((current) => (current === inspectionResults.images.length - 1 ? 0 : current + 1))
  }

  const prevSlide = () => {
    if (!inspectionResults || inspectionResults.images.length === 0) return;
    setActiveIndex((current) => (current === 0 ? inspectionResults.images.length - 1 : current - 1))
  }

  const toggleZoom = () => setIsZoomed(!isZoomed)

  if (!inspectionResults) {
    return <Card className="p-6 bg-black/90 text-white"><p>Memuat data inspeksi...</p></Card>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Terdeteksi Rayap": return "bg-red-500/80";
      case "Butuh Pencegahan": return "bg-yellow-500/80";
      case "Aman": return "bg-green-500/80";
      default: return "bg-gray-500/80";
    }
  }

  const getRecommendationSummary = (status: string) => {
    switch (status) {
      case "Terdeteksi Rayap": return "Penanganan Segera";
      case "Butuh Pencegahan": return "Perlu Investigasi";
      case "Aman": return "Tidak Perlu";
      default: return "-";
    }
  }
  return (
    <Card className="p-6 bg-black/90 border-l-4 border-yellow-500 text-white shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-amber-500" />
          <h2 className="text-xl md:text-2xl font-bold headline">HASIL INSPEKSI RAYAP</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-amber-600 text-amber-500"><Printer className="h-4 w-4 mr-1" />Cetak</Button>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-600 text-amber-500"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Unduh
          </Button>
          <Button variant="outline" size="sm" className="border-amber-600 text-amber-500"><Share2 className="h-4 w-4 mr-1" />Bagikan</Button>
        </div>
      </div>

      <div className="bg-amber-900/20 p-4 rounded-md border border-amber-800/30 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-bold text-amber-400 headline mb-2">Informasi Inspeksi</h3>
            <div className="space-y-2">
              <div className="flex"><span className="text-white/70 w-28">Nama Klien:</span><span className="font-medium">{inspectionResults.clientName}</span></div>
              <div className="flex"><span className="text-white/70 w-28">Jam/Tanggal:</span><span className="font-medium">{inspectionResults.dateTime}</span></div>
              <div className="flex"><span className="text-white/70 w-28">Metode:</span><span className="font-medium">{inspectionResults.treatment}</span></div>
              <div className="flex"><span className="text-white/70 w-28">Diinput oleh:</span><span className="font-medium">{inspectionResults.agentName}</span></div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-400 headline mb-2">Ringkasan Temuan</h3>
            <div className="space-y-2">
              <div className="flex"><span className="text-white/70 w-28">Jumlah Foto:</span><span className="font-medium">{inspectionResults.images.length}</span></div>
              <div className="flex items-center"><span className="text-white/70 w-28">Status:</span><span className={cn("text-white text-xs px-2 py-1 rounded-full", getStatusColor(inspectionResults.status))}>{inspectionResults.status}</span></div>
              <div className="flex"><span className="text-white/70 w-28">Rekomendasi:</span><span className="font-medium">{getRecommendationSummary(inspectionResults.status)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {inspectionResults.images.length > 0 ? (
        <div className="relative">
          <div className={cn("relative overflow-hidden rounded-md transition-all duration-300 bg-black", isZoomed ? "h-[500px]" : "h-[300px]")}>
            <AnimatePresence mode="wait">
              <motion.div key={activeIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                <div className="relative w-full h-full">
                  <Image loader={laravelLoader} src={inspectionResults.images[activeIndex].url || "/placeholder.svg"} alt={`Inspeksi rayap ${activeIndex + 1}`} fill sizes="(max-width: 768px) 100vw, 50vw" className={cn("object-contain transition-all duration-300", isZoomed ? "cursor-zoom-out" : "cursor-zoom-in")} onClick={toggleZoom} />
                </div>
              </motion.div>
            </AnimatePresence>
            <Button variant="outline" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/80 border-amber-500" onClick={prevSlide}><ChevronLeft className="h-6 w-6" /></Button>
            <Button variant="outline" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/80 border-amber-500" onClick={nextSlide}><ChevronRight className="h-6 w-6" /></Button>
            <Button variant="outline" size="icon" className="absolute right-2 top-2 bg-black/80 border-amber-500" onClick={toggleZoom}><ZoomIn className="h-5 w-5" /></Button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {inspectionResults.images.map((_, index) => (<button key={index} onClick={() => setActiveIndex(index)} className={`w-2 h-2 rounded-full ${index === activeIndex ? "bg-amber-500" : "bg-gray-600"}`} />))}
            </div>
          </div>
          <div className="mt-4 bg-black/50 p-4 rounded-md border border-amber-800/30">
            <h3 className="font-bold text-amber-400">Deskripsi Gambar {activeIndex + 1}</h3>
            <p className="text-white/90 whitespace-pre-line">{inspectionResults.images[activeIndex]?.description || 'Tidak ada deskripsi.'}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
            {inspectionResults.images.map((image, index) => (
              <div key={image.url + index} className={cn("relative h-16 rounded-md overflow-hidden cursor-pointer border-2", activeIndex === index ? "border-amber-500" : "border-transparent hover:border-amber-500/50")} onClick={() => setActiveIndex(index)}>
                <Image loader={laravelLoader} src={image.url || "/placeholder.svg"} alt={`Thumbnail ${index + 1}`} fill sizes="10vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-amber-800/50 rounded-lg">
          <Camera className="h-16 w-16 text-amber-500/50 mb-4" />
          <h3 className="text-xl font-bold text-amber-400 mb-2">Tidak Ada Foto Inspeksi</h3>
          <p className="text-white/70">Data inspeksi tidak menyertakan foto apa pun.</p>
        </div>
      )}

      <div className="mt-6 bg-amber-900/20 p-4 rounded-md border border-amber-800/30">
        <h3 className="font-bold text-amber-400 headline mb-2">Kesimpulan & Rekomendasi</h3>
        <p className="text-white/90 whitespace-pre-line mb-4">{inspectionResults.summary}</p>
        <div className="mt-4 p-3 bg-black/30 rounded-md">
          <h4 className="font-bold text-amber-400 mb-1">Opsi Penanganan Lanjutan:</h4>
          <p className="text-white/90 whitespace-pre-line">{inspectionResults.recommendation}</p>
        </div>
      </div>
    </Card>
  );
}