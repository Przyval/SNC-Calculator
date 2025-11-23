"use client"

import { useEffect, useRef, useState, FC } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Camera, ChevronLeft, ChevronRight, Download, Share2, Printer,
  Loader2, Mail, MessageCircle, Copy, Check, FileText
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { UnifiedResultData, ServiceType, InspectionImage } from "./types";


interface ProposalFile {
  blob: Blob;
  filename: string;
}

const useProposalGenerator = (results: UnifiedResultData, accessToken?: string) => {
  const [proposalFile, setProposalFile] = useState<ProposalFile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const fetchInitiated = useRef(false);

  useEffect(() => {
    const generateInitialProposal = async () => {
      if (!results?.client || !accessToken || fetchInitiated.current) return;
      fetchInitiated.current = true;
      setIsGenerating(true);
      setGenerationError(null);
      try {
        const file = await fetchProposalFile();
        setProposalFile(file);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui.";
        setGenerationError(errorMessage);
        console.error("Gagal menyiapkan file proposal:", error);
      } finally {
        setIsGenerating(false);
      }
    };
    generateInitialProposal();
  }, [results, accessToken]);

  const fetchProposalFile = async (): Promise<ProposalFile> => {
    const { serviceTypes, client, inspection, details } = results;

    // Preparation items come from common.preparationSet (already merged from all services)
    const allPrepItems = details.common?.preparationSet || {};
    
    // Additional items are in common.additionalSet (shared across all services)
    const additionalItems = details.common?.additionalSet || {};

    // Build service details object
    const serviceDetails: Record<string, any> = {};
    
    if (serviceTypes.includes('TC') && details.TC) {
      serviceDetails.TC = {
        treatment: details.TC.treatment,
        status: details.TC.status,
      };
    }
    
    if (serviceTypes.includes('GPC') && details.GPC) {
      serviceDetails.GPC = {
        targetHama: details.GPC.targetHama || [],
        areaAplikasi: details.GPC.areaAplikasi,
        bahanAktifKimia: details.GPC.bahanAktifKimia,
        treatment: details.GPC.treatment || [],
        status: details.GPC.status,
      };
    }
    
    if (serviceTypes.includes('RC') && details.RC) {
      serviceDetails.RC = {
        tingkatInfestasi: details.RC.tingkatInfestasi,
        treatment: details.RC.treatment || [],
        rekomendasiSanitasi: details.RC.rekomendasiSanitasi,
      };
    }
    
    if (serviceTypes.includes('GPRC') && details.GPRC) {
      serviceDetails.GPRC = {
        // Combine GPC and RC details
        targetHama: details.GPRC.targetHama || details.GPC?.targetHama || [],
        tingkatInfestasi: details.GPRC.tingkatInfestasi || details.RC?.tingkatInfestasi,
        treatment: details.GPRC.treatment || [],
      };
    }

    const apiPayload = {
      service_types: serviceTypes,
      service_details: serviceDetails,
      client_name: client!.name,
      client_type: client!.client_type?.name || null,
      client_email: client!.email || null,
      client_phone: client!.phone_number || null,
      address: details.common.lokasiRumah || "N/A",
      area_treatment: details.common.luasTanah || 100,
      images: inspection.images.map(img => ({ 
        description: img.description, 
        paths: [img.url] 
      })),
      transport: details.common.transport || 'mobil',
      distance_km: details.common.jarakTempuh || 0,
      floor_count: details.common.jumlahLantai || 1,
      monitoring_duration_months: details.common.monitoringPerBulan || 1,
      preparation_set_items: allPrepItems,
      additional_set_items: additionalItems,
    };

    console.log('Sending proposal request:', apiPayload);

    const laravelApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const response = await fetch(`${laravelApiUrl}/generate-propose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `Proposal_${apiPayload.client_name.replace(/ /g, '_')}.docx`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch?.[1]) filename = filenameMatch[1];
    }
    return { blob, filename };
  };

  return { proposalFile, isGenerating, generationError };
};

const laravelLoader = ({ src }: { src: string }) => {
  const laravelUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || 'http://localhost:8000';
  return `${laravelUrl}${src}`;
};

const ResultImageGallery: FC<{ images: InspectionImage[] }> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-amber-800/50 rounded-lg">
        <Camera className="h-16 w-16 text-amber-500/50 mb-4" />
        <h3 className="text-xl font-bold text-amber-400 mb-2">Tidak Ada Foto Inspeksi</h3>
        <p className="text-white/70">Data inspeksi tidak menyertakan foto apa pun.</p>
      </div>
    );
  }

  const nextSlide = () => setActiveIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  const prevSlide = () => setActiveIndex((current) => (current === 0 ? images.length - 1 : current - 1));

  return (
    <div className="relative">
      <div className={cn("relative overflow-hidden rounded-md transition-all duration-300 bg-black", isZoomed ? "h-[500px]" : "h-[300px]")}>
        <AnimatePresence mode="wait">
          <motion.div key={activeIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0">
            <Image loader={laravelLoader} src={images[activeIndex].url} alt={`Inspeksi ${activeIndex + 1}`} fill sizes="(max-width: 768px) 100vw, 50vw" className={cn("object-contain", isZoomed ? "cursor-zoom-out" : "cursor-zoom-in")} onClick={() => setIsZoomed(!isZoomed)} />
          </motion.div>
        </AnimatePresence>
        <Button variant="outline" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/80 border-amber-500" onClick={prevSlide}><ChevronLeft /></Button>
        <Button variant="outline" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/80 border-amber-500" onClick={nextSlide}><ChevronRight /></Button>
      </div>
      <div className="mt-4 bg-black/50 p-4 rounded-md border border-amber-800/30">
        <h3 className="font-bold text-amber-400">Deskripsi Gambar {activeIndex + 1}</h3>
        <p className="text-white/90 whitespace-pre-line min-h-[40px]">{images[activeIndex]?.description || 'Tidak ada deskripsi.'}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
        {images.map((image, index) => (
          <div key={image.url + index} className={cn("relative h-16 rounded-md overflow-hidden cursor-pointer border-2", activeIndex === index ? "border-amber-500" : "border-transparent hover:border-amber-500/50")} onClick={() => setActiveIndex(index)}>
            <Image loader={laravelLoader} src={image.url} alt={`Thumbnail ${index + 1}`} fill sizes="10vw" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
};

const ResultActions: FC<{ results: UnifiedResultData, proposalFile: ProposalFile | null, isGenerating: boolean, generationError: string | null }> = ({ results, proposalFile, isGenerating, generationError }) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareText = () => `📋 HASIL LAYANAN (${results.serviceTypes.join(', ')})\n\n👤 Klien: ${results.client?.name || '-'}\n📅 Tanggal: ${results.inspection.dateTime || '-'}\n\n📝 Kesimpulan:\n${results.inspection.summary || ''}\n\n💡 Rekomendasi:\n${results.inspection.recommendation || ''}`;

  const handleShare = async (type: 'whatsapp' | 'email' | 'copy') => {
    const text = generateShareText();
    if (type === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    if (type === 'email') window.open(`mailto:?subject=${encodeURIComponent(`Hasil Layanan - ${results.client?.name}`)}&body=${encodeURIComponent(text)}`, '_blank');
    if (type === 'copy') {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!proposalFile) return;
    const url = window.URL.createObjectURL(proposalFile.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = proposalFile.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="border-amber-600 text-amber-500 hover:bg-amber-500 hover:text-black" onClick={() => window.print()}>
        <Printer className="h-4 w-4 mr-1" /> Cetak
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="border-purple-600 text-purple-500 hover:bg-purple-500 hover:text-black disabled:opacity-50" 
        onClick={handleDownload} 
        disabled={isGenerating || !proposalFile}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-1" /> Unduh Dokumen
          </>
        )}
      </Button>
      {generationError && (
        <span className="text-red-500 text-xs">{generationError}</span>
      )}
      <div className="relative">
        <Button variant="outline" size="sm" className="border-green-600 text-green-500 hover:bg-green-500 hover:text-black" onClick={() => setShowShareMenu(p => !p)}>
          <Share2 className="h-4 w-4 mr-1" /> Bagikan
        </Button>
        <AnimatePresence>
          {showShareMenu && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 top-full mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
              <div className="p-2 space-y-1">
                <button onClick={() => handleShare('whatsapp')} className="flex items-center w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-md"><MessageCircle className="h-4 w-4 mr-2 text-green-500" /> WhatsApp</button>
                <button onClick={() => handleShare('email')} className="flex items-center w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-md"><Mail className="h-4 w-4 mr-2 text-blue-500" /> Email</button>
                <button onClick={() => handleShare('copy')} className="flex items-center w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-md">
                  {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? 'Tersalin!' : 'Salin Teks'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {showShareMenu && (<div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />)}
    </div>
  );
};

interface InspectionResultsProps {
  results: UnifiedResultData;
  accessToken?: string;
}

export default function InspectionResults({ results, accessToken }: InspectionResultsProps) {
  const { proposalFile, isGenerating, generationError } = useProposalGenerator(results, accessToken);

  if (!results) {
    return <Card className="p-6 bg-black/90 text-white"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memuat data hasil...</Card>;
  }

  const { serviceTypes, client, agentName, inspection, details } = results;

  const getPrimaryStatus = () => {
    if (details.TC?.status) return { status: details.TC.status, type: 'TC' };
    if (details.GPC?.status) return { status: details.GPC.status, type: 'GPC' };
    if (details.RC?.tingkatInfestasi) {
      return { status: `Infestasi ${details.RC.tingkatInfestasi}`, type: 'RC' };
    }
    return { status: "Aman", type: 'common' };
  };

  const getStatusColor = (status: string) => {
    if (status.includes("Terdeteksi") || status.includes("Tinggi") || status.includes("Sedang")) return "bg-red-500";
    if (status.includes("Pencegahan") || status.includes("Rendah")) return "bg-yellow-500 text-black";
    if (status.includes("Aman")) return "bg-green-500";
    return "bg-gray-500";
  };

  const primaryStatus = getPrimaryStatus();

  return (
    <Card className="p-6 bg-black/90 border-l-4 border-yellow-500 text-white shadow-lg">
      <header className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-amber-500" />
          <h2 className="text-xl md:text-2xl font-bold headline">HASIL LAYANAN ({serviceTypes.join(' & ')})</h2>
        </div>
        <ResultActions results={results} proposalFile={proposalFile} isGenerating={isGenerating} generationError={generationError} />
      </header>

      <section className="bg-amber-900/20 p-4 rounded-md border border-amber-800/30 mb-6 grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-bold text-amber-400 mb-2">Informasi Umum</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-white/70 w-28 inline-block">Klien:</span><span className="font-medium">{client?.name}</span></p>
            <p><span className="text-white/70 w-28 inline-block">Tanggal:</span><span className="font-medium">{inspection.dateTime}</span></p>
            <p><span className="text-white/70 w-28 inline-block">Agent:</span><span className="font-medium">{agentName}</span></p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-amber-400 mb-2">Ringkasan Temuan</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-white/70 w-28 inline-block">Foto:</span><span className="font-medium">{inspection.images.length}</span></p>
            <div className="flex items-center"><span className="text-white/70 w-28">Status:</span><span className={cn("text-xs px-2 py-1 rounded-full font-semibold", getStatusColor(primaryStatus.status))}>{primaryStatus.status}</span></div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <ResultImageGallery images={inspection.images} />
      </section>

      <section className="mt-6 bg-amber-900/20 p-4 rounded-md border border-amber-800/30">
        <h3 className="font-bold text-amber-400 headline mb-2">Kesimpulan & Rekomendasi</h3>
        <p className="text-white/90 whitespace-pre-line mb-4">{inspection.summary}</p>
        <div className="mt-4 p-3 bg-black/30 rounded-md">
          <h4 className="font-bold text-amber-400 mb-1">Opsi Penanganan Lanjutan:</h4>
          <p className="text-white/90 whitespace-pre-line">{inspection.recommendation}</p>
        </div>
      </section>
    </Card>
  );
}