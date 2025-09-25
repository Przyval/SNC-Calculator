"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, ChevronLeft, ChevronRight, ZoomIn, Download, Share2, Printer, Loader2, Mail, MessageCircle, Copy, Check, FileText } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ProposalFile {
  blob: Blob;
  filename: string;
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
interface PerhitunganData {
  luasTanah: number;
  umurBangunan: number;
  lokasiRumah: string;
  materialBangunan: string;
  riwayatRayap: string;
  tingkatKelembaban: number;
  jumlahPerabotKayu: number;
  adaLahanKosongDisekitar: string;
  jenisLantai: string;
  skorRisiko: number;
  kategoriRisiko: string;
  estimasiKerugian: number;
  rekomendasiLayanan: string;
  biayaPerbaikan: number;
  biayaLayanan: number;
  penghematan: number;

  transport: 'mobil' | 'motor';
  jarakTempuh: number;
  jumlahLantai: number;
  monitoringPerBulan: number;
  preparationSet: Record<string, number>;
  additionalSet: Record<string, number>;
}
interface KecamatanData { id: string; name: string; riskLevel: "tinggi" | "sedang" | "rendah"; }
interface FullExportData {
  client: ClientData | null;
  hasilPerhitungan: PerhitunganData | null;
  // selectedKecamatan: KecamatanData | null;
  inspectionResults: InspectionResultData | null;
}

interface InspectionResultsProps {
  inspectionResults: InspectionResultData | null;
  fullExportData: FullExportData;
  accessToken?: string;
}

const laravelLoader = ({ src }: { src: string }) => {
  const laravelUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || 'http://localhost:8000';
  return `${laravelUrl}${src}`;
};

export default function InspectionResults({ inspectionResults, fullExportData, accessToken }: InspectionResultsProps) {
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

  // Print functionality
  const handlePrint = () => {
    // Create print styles
    const printStyles = `
      <style>
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-page-break {
            page-break-before: always;
          }
          .print-image-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin: 20px 0;
          }
          .print-image-item {
            break-inside: avoid;
            margin-bottom: 15px;
          }
          .print-image-item img {
            max-width: 100%;
            height: auto;
            max-height: 200px;
            object-fit: contain;
          }
          .print-header {
            text-align: center;
            border-bottom: 2px solid #000;
            margin-bottom: 20px;
            padding-bottom: 10px;
          }
          .print-section {
            margin: 15px 0;
            padding: 10px;
            border: 1px solid #ccc;
          }
          .print-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
          }
          @page {
            margin: 1in;
            size: A4;
          }
        }
      </style>
    `;

    // Create printable content
    const printContent = `
      ${printStyles}
      <div class="print-content">
        <div class="print-header">
          <h1>HASIL INSPEKSI RAYAP</h1>
          <p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
        </div>
        
           <div class="print-info-grid">
          <div class="print-section">
            <h3>Informasi Inspeksi</h3>
            <p><strong>Nama Klien:</strong> ${inspectionResults?.clientName || '-'}</p>
            <p><strong>Jam/Tanggal:</strong> ${inspectionResults?.dateTime || '-'}</p>
            <p><strong>Metode:</strong> ${inspectionResults?.treatment || '-'}</p>
            <p><strong>Diinput oleh:</strong> ${inspectionResults?.agentName || '-'}</p>
          </div>
          
          <div class="print-section">
            <h3>Informasi Properti</h3>
            <p><strong>Alamat:</strong> ${fullExportData.hasilPerhitungan?.lokasiRumah || '-'}</p>
            <p><strong>Luas Tanah:</strong> ${fullExportData.hasilPerhitungan?.luasTanah || '-'} m²</p>
            <p><strong>Jumlah Lantai:</strong> ${fullExportData.hasilPerhitungan?.jumlahLantai || '-'} lantai</p>
            <p><strong>Umur Bangunan:</strong> ${fullExportData.hasilPerhitungan?.umurBangunan || '-'} tahun</p>
          </div>
        </div>

        <div class="print-section">
          <h3>Kesimpulan & Rekomendasi</h3>
          <p><strong>Status:</strong> ${inspectionResults?.status || '-'}</p>
          <p style="white-space: pre-line;">${inspectionResults?.summary || ''}</p>
          <div style="margin-top: 15px; padding: 10px; background-color: #f5f5f5;">
            <h4>Opsi Penanganan Lanjutan:</h4>
            <p style="white-space: pre-line;">${inspectionResults?.recommendation || ''}</p>
          </div>
        </div>

        ${inspectionResults?.images && inspectionResults.images.length > 0 ? `
          <div class="print-page-break">
            <div class="print-section">
              <h3>Dokumentasi Foto Inspeksi</h3>
              <div class="print-image-grid">
                ${inspectionResults.images.map((image, index) => `
                  <div class="print-image-item">
                    <img src="${laravelLoader({ src: image.url })}" alt="Inspeksi ${index + 1}" />
                    <p><strong>Foto ${index + 1}:</strong> ${image.description || 'Tidak ada deskripsi'}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Hasil Inspeksi Rayap - ${inspectionResults?.clientName}</title>
          <meta charset="utf-8">
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `);
      printWindow.document.close();

      // Wait for images to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    }
  };

  // Share functionality
  const generateShareText = () => {
    return `🔍 *HASIL INSPEKSI RAYAP*

👤 *Klien:* ${inspectionResults?.clientName || '-'}
📅 *Tanggal:* ${inspectionResults?.dateTime || '-'}
📊 *Status:* ${inspectionResults?.status || '-'}
🔧 *Metode:* ${inspectionResults?.treatment || '-'}
👨‍💼 *Agent:* ${inspectionResults?.agentName || '-'}

📝 *Kesimpulan:*
${inspectionResults?.summary || ''}

💡 *Rekomendasi:*
${inspectionResults?.recommendation || ''}

📸 Dokumentasi: ${inspectionResults?.images?.length || 0} foto terlampir

---
Terima kasih telah mempercayakan inspeksi rayap kepada kami.`;
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareToEmail = () => {
    const subject = encodeURIComponent(`Hasil Inspeksi Rayap - ${inspectionResults?.clientName}`);
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

  const handleDownload = async () => {
    if (!fullExportData || !fullExportData.client || !fullExportData.inspectionResults) {
      console.error("Cannot download: Data is incomplete.", fullExportData);
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


  const fetchProposalFile = async (): Promise<ProposalFile> => {
    if (!inspectionResults || !fullExportData.client || !accessToken || !fullExportData.hasilPerhitungan) {
      throw new Error("Data tidak lengkap atau sesi tidak valid.");
    }

    const apiPayload = {
      service_type: inspectionResults.treatment.toLowerCase(),
      client_name: fullExportData.client.name,
      address: fullExportData.hasilPerhitungan?.lokasiRumah || "N/A",
      area_treatment: fullExportData.hasilPerhitungan?.luasTanah || 100,
      images: inspectionResults.images.map(img => ({
        description: img.description,
        paths: [img.url]
      })),
      transport: fullExportData.hasilPerhitungan.transport,
      distance_km: fullExportData.hasilPerhitungan.jarakTempuh,
      floor_count: fullExportData.hasilPerhitungan.jumlahLantai,
      monitoring_duration_months: fullExportData.hasilPerhitungan.monitoringPerBulan,
      preparation_set_items: fullExportData.hasilPerhitungan.preparationSet,
      additional_set_items: fullExportData.hasilPerhitungan.additionalSet,
    };

    const laravelApiUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || 'http://localhost:8000';
    const fullUrl = `${laravelApiUrl}/api/generate-propose`;

    // Debug logging
    console.log('Making request to:', fullUrl);
    console.log('Payload:', apiPayload);
    console.log('Access token exists:', !!accessToken);

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

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        // Get the actual response text for debugging
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        throw new Error(`Gagal membuat proposal: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      console.log('Blob size:', blob.size);
      console.log('Blob type:', blob.type);

      const filename = `Proposal_${apiPayload.client_name.replace(/ /g, '_')}.docx`;
      return { blob, filename };
      // return new Promise(resolve => setTimeout(() => resolve({ blob: new Blob(), filename: 'test.docx' }), 2000));
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const prepareProposalForSharing = async () => {
      console.log("Memulai proses pembuatan proposal di latar belakang...");
      setIsGenerating(true);
      setGenerationError(null);

      try {
        const fileData = await fetchProposalFile();
        setProposalFile(fileData);
        console.log("File proposal berhasil disiapkan dan disimpan di state.");
      } catch (error) {
        console.error("Gagal menyiapkan file proposal:", error);
        if (error instanceof Error) {
          setGenerationError(error.message);
        } else {
          setGenerationError("Terjadi kesalahan yang tidak diketahui.");
        }
      } finally {
        setIsGenerating(false);
      }
    };
    if (inspectionResults && fullExportData.client && accessToken && !fetchInitiated.current) {
      fetchInitiated.current = true;
      prepareProposalForSharing();
    }
  }, [inspectionResults, fullExportData, accessToken]);

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
          title: `Proposal Penawaran - ${fullExportData.client?.name}`,
          text: `Berikut adalah proposal penawaran untuk ${fullExportData.client?.name}.`,
        });
      } else {
        alert("Browser Anda tidak mendukung fitur berbagi file. Gunakan tombol 'Unduh Proposal' sebagai gantinya.");
      }
    } catch (error: unknown) { // Secara eksplisit menandai tipe sebagai 'unknown'
      console.error("Gagal membagikan proposal:", error);

      // --- PERBAIKAN DI SINI ---
      // Gunakan type guard untuk memeriksa apakah 'error' adalah objek Error
      if (error instanceof Error) {
        // Di dalam blok ini, TypeScript sekarang tahu bahwa 'error' memiliki properti 'name' dan 'message'
        if (error.name === 'NotAllowedError') {
          alert("Gagal membagikan: Izin ditolak. Ini biasanya terjadi jika proses berbagi tidak dipicu langsung oleh klik pengguna.");
        } else if (error.name === 'AbortError') {
          // Ini bukan error teknis, pengguna hanya membatalkan dialog
          console.log("Proses berbagi dibatalkan oleh pengguna.");
        } else {
          // Untuk error lain yang merupakan instance dari Error
          alert(`Terjadi kesalahan saat membagikan proposal: ${error.message}`);
        }
      } else {
        // Fallback jika yang di-throw bukan objek Error (misalnya, throw "some string")
        alert(`Terjadi kesalahan yang tidak diketahui: ${String(error)}`);
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
      console.error("Gagal mengunduh proposal:", error);
      alert(`Terjadi kesalahan saat mengunduh proposal: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDownloadingProposal(false);
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
          <Button
            variant="outline"
            size="sm"
            className="border-amber-600 text-amber-500 hover:bg-amber-500 hover:text-black"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-1" />
            Cetak
          </Button>
          {/* <Button
            variant="outline"
            size="sm"
            className="border-amber-600 text-amber-500 hover:bg-amber-500 hover:text-black"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Unduh
          </Button> */}

          <Button
            variant="outline"
            size="sm"
            className="border-purple-600 text-purple-500 hover:bg-purple-500 hover:text-black"
            onClick={handleDownloadProposal}
            disabled={isDownloadingProposal}
          >
            {isDownloadingProposal ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
            Unduh Proposal
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="border-amber-600 text-amber-500 hover:bg-amber-500 hover:text-black"
              onClick={() => setShowShareMenu(!showShareMenu)}
              disabled={isSharing} // NEW: Disable button while sharing
            >
              {isSharing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-1" />
              )}
              Bagikan
            </Button>

            {showShareMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-gray-700">
                    {isGenerating && (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span>Menyiapkan proposal...</span>
                      </div>
                    )}
                    {generationError && (
                      <div className="text-red-600">
                        <p>Gagal: {generationError}</p>
                      </div>
                    )}
                    {!isGenerating && !generationError && (
                      <button
                        onClick={handleShareProposal}
                        className="flex items-center w-full hover:text-black"
                        disabled={!proposalFile || isSharing}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        <span>Bagikan Proposal</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t my-1"></div>

                  <p className="px-4 pt-2 pb-1 text-xs text-gray-500">Bagikan Teks Ringkasan:</p>
                  <button
                    onClick={shareToWhatsApp}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                    WhatsApp
                  </button>
                  <button
                    onClick={shareToEmail}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Mail className="h-4 w-4 mr-2 text-blue-600" />
                    Email
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2 text-gray-600" />
                    )}
                    {copied ? 'Tersalin!' : 'Salin Teks'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close share menu */}
      {showShareMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowShareMenu(false)}
        />
      )}

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
            <Button variant="outline" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/80 border-amber-500 no-print" onClick={prevSlide}><ChevronLeft className="h-6 w-6" /></Button>
            <Button variant="outline" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/80 border-amber-500 no-print" onClick={nextSlide}><ChevronRight className="h-6 w-6" /></Button>
            <Button variant="outline" size="icon" className="absolute right-2 top-2 bg-black/80 border-amber-500 no-print" onClick={toggleZoom}><ZoomIn className="h-5 w-5" /></Button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 no-print">
              {inspectionResults.images.map((_, index) => (<button key={index} onClick={() => setActiveIndex(index)} className={`w-2 h-2 rounded-full ${index === activeIndex ? "bg-amber-500" : "bg-gray-600"}`} />))}
            </div>
          </div>
          <div className="mt-4 bg-black/50 p-4 rounded-md border border-amber-800/30">
            <h3 className="font-bold text-amber-400">Deskripsi Gambar {activeIndex + 1}</h3>
            <p className="text-white/90 whitespace-pre-line">{inspectionResults.images[activeIndex]?.description || 'Tidak ada deskripsi.'}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2 no-print">
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