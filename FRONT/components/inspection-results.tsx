"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, ChevronLeft, ChevronRight, ZoomIn, Download, Share2, Printer, Loader2, Mail, MessageCircle, Copy, Check, FileText } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { UnifiedResultData } from "./flow-controller"; 

interface ProposalFile {
  blob: Blob;
  filename: string;
}

interface InspectionResultsProps {
  results: UnifiedResultData;
  accessToken?: string;
}

const laravelLoader = ({ src }: { src: string }) => {
  const laravelUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || 'http://localhost:8000';
  return `${laravelUrl}${src}`;
};

export default function InspectionResults({ results, accessToken }: InspectionResultsProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloadingProposal, setIsDownloadingProposal] = useState(false);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [proposalFile, setProposalFile] = useState<ProposalFile | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const fetchInitiated = useRef(false);

  const { serviceType, client, agentName, inspection, details } = results;

  const handlePrint = () => {
    alert("Fungsi print belum di-update sepenuhnya untuk semua jenis layanan.");
  };

  const generateShareText = () => {
    let detailsText = '';
    if (serviceType === 'TC' && details.kategoriRisiko) {
      detailsText = `📊 *Kategori Risiko:* ${details.kategoriRisiko}`;
    } else if (serviceType === 'RC' && details.tingkatInfestasi) {
      detailsText = `📊 *Tingkat Infestasi:* ${details.tingkatInfestasi}`;
    }

    return `🔍 *HASIL LAYANAN ${serviceType}*

👤 *Klien:* ${client?.name || '-'}
📅 *Tanggal:* ${inspection.dateTime || '-'}
${detailsText}
🔧 *Metode:* ${inspection.treatment || '-'}
👨‍💼 *Agent:* ${agentName || '-'}

📝 *Kesimpulan:*
${inspection.summary || ''}

💡 *Rekomendasi:*
${inspection.recommendation || ''}

📸 Dokumentasi: ${inspection.images?.length || 0} foto terlampir

---
Terima kasih telah mempercayakan layanan pengendalian hama kepada kami.`;
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareToEmail = () => {
    const subject = encodeURIComponent(`Hasil Layanan ${serviceType} - ${client?.name}`);
    const body = encodeURIComponent(generateShareText());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const fetchProposalFile = async (): Promise<ProposalFile> => {
    if (!results || !client || !accessToken) {
      throw new Error("Data tidak lengkap atau sesi tidak valid.");
    }
    
    const specificTreatmentForTemplate = inspection.treatment.toLowerCase().replace(/ /g, '_');
    
    const apiPayload = {
      service_type: specificTreatmentForTemplate,
      general_service_type: serviceType, 
      
      client_name: client.name,
      address: details.lokasiRumah || "N/A",
      area_treatment: details.luasTanah || 100,
      images: inspection.images.map(img => ({ description: img.description, paths: [img.url] })),
      transport: details.transport || 'mobil',
      distance_km: details.jarakTempuh || 0,
      floor_count: details.jumlahLantai || 1,
      monitoring_duration_months: details.monitoringPerBulan || 1,
      preparation_set_items: details.preparationSet || {},
      additional_set_items: details.additionalSet || {},
    };

    const laravelApiUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || 'http://localhost:8000';
    const fullUrl = `${laravelApiUrl}/api/generate-propose`;

    try {
      const response = await fetch(fullUrl, {
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
        throw new Error(`Gagal membuat proposal: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      const filename = `Proposal_${apiPayload.client_name.replace(/ /g, '_')}_${serviceType}.docx`;
      return { blob, filename };
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const prepareProposalForSharing = async () => {
      setIsGenerating(true);
      setGenerationError(null);
      try {
        const fileData = await fetchProposalFile();
        setProposalFile(fileData);
      } catch (error) {
        console.error("Gagal menyiapkan file proposal:", error);
        setGenerationError(error instanceof Error ? error.message : "Terjadi kesalahan.");
      } finally {
        setIsGenerating(false);
      }
    };
    if (results && client && accessToken && !fetchInitiated.current) {
      fetchInitiated.current = true;
      prepareProposalForSharing();
    }
  }, [results, accessToken]);

  const handleShareProposal = async () => {
    if (!proposalFile) {
      alert("File proposal belum siap atau gagal dibuat. Silakan coba lagi.");
      return;
    }
    setIsSharing(true);
    setShowShareMenu(false);

    try {
      const { blob, filename } = proposalFile;
      const file = new File([blob], filename, { type: blob.type });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Proposal Penawaran - ${client?.name}`,
          text: `Berikut adalah proposal penawaran untuk ${client?.name}.`,
        });
      } else {
        alert("Browser Anda tidak mendukung fitur berbagi file. Gunakan tombol 'Unduh Proposal' sebagai gantinya.");
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        alert(`Terjadi kesalahan saat membagikan proposal: ${error.message}`);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadProposal = async () => {
    if (!proposalFile) {
      alert("File proposal belum siap atau gagal dibuat. Silakan coba lagi.");
      return;
    }
    setIsDownloadingProposal(true);
    try {
      const { blob, filename } = proposalFile;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Terjadi kesalahan saat mengunduh: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDownloadingProposal(false);
    }
  };

  const nextSlide = () => {
    if (inspection.images.length === 0) return;
    setActiveIndex((current) => (current === inspection.images.length - 1 ? 0 : current + 1))
  }

  const prevSlide = () => {
    if (inspection.images.length === 0) return;
    setActiveIndex((current) => (current === 0 ? inspection.images.length - 1 : current - 1))
  }

  const toggleZoom = () => setIsZoomed(!isZoomed)

  if (!results) {
    return <Card className="p-6 bg-black/90 text-white"><p>Memuat data hasil...</p></Card>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Terdeteksi Rayap":
      case "Terdeteksi Hama":
         return "bg-red-500/80";
      case "Butuh Pencegahan": return "bg-yellow-500/80";
      case "Aman": return "bg-green-500/80";
      default: return "bg-gray-500/80";
    }
  }

  const renderSpecificDetails = () => {
    switch (serviceType) {
      case 'TC':
        return (
          <div className="space-y-2">
            <h4 className="font-bold text-amber-400 mb-1">Detail Risiko Rayap</h4>
            <div className="flex"><span className="text-white/70 w-40">Skor Risiko:</span><span className="font-bold">{details.skorRisiko}</span></div>
            <div className="flex"><span className="text-white/70 w-40">Kategori Risiko:</span><span className="font-bold text-red-400">{details.kategoriRisiko}</span></div>
            <div className="flex"><span className="text-white/70 w-40">Estimasi Kerugian:</span><span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(details.estimasiKerugian || 0)}</span></div>
            <div className="flex"><span className="text-white/70 w-40">Biaya Layanan:</span><span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(details.biayaLayanan || 0)}</span></div>
          </div>
        );
      case 'RC':
        return (
          <div className="space-y-2">
            <h4 className="font-bold text-blue-400 mb-1">Detail Pengendalian Tikus</h4>
            <div className="flex"><span className="text-white/70 w-40">Tingkat Infestasi:</span><span className="font-bold">{details.tingkatInfestasi}</span></div>
            <div className="flex"><span className="text-white/70 w-40">Jml. Bait Station:</span><span>{details.jumlahBaitStation} unit</span></div>
            <div className="flex"><span className="text-white/70 w-40">Jml. Perangkap:</span><span>{details.jumlahPerangkap} unit</span></div>
            <div className="flex"><span className="text-white/70 w-40">Rekom. Sanitasi:</span><p className="flex-1">{details.rekomendasiSanitasi}</p></div>
          </div>
        );
      case 'GPC':
        return (
          <div className="space-y-2">
            <h4 className="font-bold text-green-400 mb-1">Detail Hama Umum</h4>
            <div className="flex"><span className="text-white/70 w-40">Target Hama:</span><span className="font-bold">{details.targetHama?.join(', ')}</span></div>
            <div className="flex"><span className="text-white/70 w-40">Area Aplikasi:</span><span>{details.areaAplikasi}</span></div>
            <div className="flex"><span className="text-white/70 w-40">Bahan Aktif:</span><span>{details.bahanAktifKimia}</span></div>
          </div>
        );
      default:
        return <p>Tidak ada detail spesifik untuk layanan ini.</p>;
    }
  }


  return (
    <Card className="p-6 bg-black/90 border-l-4 border-yellow-500 text-white shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-amber-500" />
          <h2 className="text-xl md:text-2xl font-bold headline">HASIL LAYANAN {serviceType}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-amber-600 text-amber-500 hover:bg-amber-500 hover:text-black" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Cetak
          </Button>
          <Button variant="outline" size="sm" className="border-purple-600 text-purple-500 hover:bg-purple-500 hover:text-black" onClick={handleDownloadProposal} disabled={isDownloadingProposal || isGenerating || !!generationError}>
            {isDownloadingProposal ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />} Unduh Proposal
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" className="border-amber-600 text-amber-500 hover:bg-amber-500 hover:text-black" onClick={() => setShowShareMenu(!showShareMenu)} disabled={isSharing}>
              {isSharing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Share2 className="h-4 w-4 mr-1" />} Bagikan
            </Button>
            {showShareMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-gray-700">
                    {isGenerating && <div className="flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin" /><span>Menyiapkan proposal...</span></div>}
                    {generationError && <div className="text-red-600"><p>Gagal: {generationError}</p></div>}
                    {!isGenerating && !generationError && (
                      <button onClick={handleShareProposal} className="flex items-center w-full hover:text-black disabled:opacity-50" disabled={!proposalFile || isSharing}>
                        <FileText className="h-4 w-4 mr-2" /> <span>Bagikan Proposal</span>
                      </button>
                    )}
                  </div>
                  <div className="border-t my-1"></div>
                  <p className="px-4 pt-2 pb-1 text-xs text-gray-500">Bagikan Teks Ringkasan:</p>
                  <button onClick={shareToWhatsApp} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <MessageCircle className="h-4 w-4 mr-2 text-green-600" /> WhatsApp
                  </button>
                  <button onClick={shareToEmail} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Mail className="h-4 w-4 mr-2 text-blue-600" /> Email
                  </button>
                  <button onClick={copyToClipboard} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    {copied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2 text-gray-600" />}
                    {copied ? 'Tersalin!' : 'Salin Teks'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showShareMenu && (<div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />)}

      <div className="bg-amber-900/20 p-4 rounded-md border border-amber-800/30 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-bold text-amber-400 headline mb-2">Informasi Umum</h3>
            <div className="space-y-2">
              <div className="flex"><span className="text-white/70 w-28">Nama Klien:</span><span className="font-medium">{client?.name}</span></div>
              <div className="flex"><span className="text-white/70 w-28">Jam/Tanggal:</span><span className="font-medium">{inspection.dateTime}</span></div>
              <div className="flex"><span className="text-white/70 w-28">Metode:</span><span className="font-medium">{inspection.treatment}</span></div>
              <div className="flex"><span className="text-white/70 w-28">Diinput oleh:</span><span className="font-medium">{agentName}</span></div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-400 headline mb-2">Ringkasan Temuan</h3>
            <div className="space-y-2">
              <div className="flex"><span className="text-white/70 w-28">Jumlah Foto:</span><span className="font-medium">{inspection.images.length}</span></div>
              <div className="flex items-center"><span className="text-white/70 w-28">Status:</span><span className={cn("text-white text-xs px-2 py-1 rounded-full", getStatusColor(inspection.status))}>{inspection.status}</span></div>
            </div>
          </div>
        </div>
      </div>

      {inspection.images.length > 0 ? (
        <div className="relative">
          <div className={cn("relative overflow-hidden rounded-md transition-all duration-300 bg-black", isZoomed ? "h-[500px]" : "h-[300px]")}>
            <AnimatePresence mode="wait">
              <motion.div key={activeIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                <div className="relative w-full h-full">
                  <Image loader={laravelLoader} src={inspection.images[activeIndex].url || "/placeholder.svg"} alt={`Inspeksi ${activeIndex + 1}`} fill sizes="(max-width: 768px) 100vw, 50vw" className={cn("object-contain transition-all duration-300", isZoomed ? "cursor-zoom-out" : "cursor-zoom-in")} onClick={toggleZoom} />
                </div>
              </motion.div>
            </AnimatePresence>
            <Button variant="outline" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/80 border-amber-500 no-print" onClick={prevSlide}><ChevronLeft className="h-6 w-6" /></Button>
            <Button variant="outline" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/80 border-amber-500 no-print" onClick={nextSlide}><ChevronRight className="h-6 w-6" /></Button>
            <Button variant="outline" size="icon" className="absolute right-2 top-2 bg-black/80 border-amber-500 no-print" onClick={toggleZoom}><ZoomIn className="h-5 w-5" /></Button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 no-print">
              {inspection.images.map((_, index) => (<button key={index} onClick={() => setActiveIndex(index)} className={`w-2 h-2 rounded-full ${index === activeIndex ? "bg-amber-500" : "bg-gray-600"}`} />))}
            </div>
          </div>
          <div className="mt-4 bg-black/50 p-4 rounded-md border border-amber-800/30">
            <h3 className="font-bold text-amber-400">Deskripsi Gambar {activeIndex + 1}</h3>
            <p className="text-white/90 whitespace-pre-line">{inspection.images[activeIndex]?.description || 'Tidak ada deskripsi.'}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2 no-print">
            {inspection.images.map((image, index) => (
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
        <p className="text-white/90 whitespace-pre-line mb-4">{inspection.summary}</p>
        <div className="mt-4 p-3 bg-black/30 rounded-md">
          <h4 className="font-bold text-amber-400 mb-1">Opsi Penanganan Lanjutan:</h4>
          <p className="text-white/90 whitespace-pre-line">{inspection.recommendation}</p>
        </div>
      </div>

      <div className="mt-6 bg-gray-900/30 p-4 rounded-md border border-gray-700">
        {renderSpecificDetails()}
      </div>
    </Card>
  );
}