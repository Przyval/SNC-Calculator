"use client"

import { useState, useRef, ChangeEvent, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Bug, Calculator, Camera, Upload, Trash2, Calendar, XCircle, ScanSearch, AlertTriangle } from "lucide-react"
import Image from "next/image"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { createPortal } from "react-dom"
import { Checkbox } from "@/components/ui/checkbox"
import { UnifiedResultData, ClientData } from "./flow-controller"
import { Session } from "next-auth"
import { motion } from "framer-motion"

interface InspectionImage {
  url: string;
  description: string;
  detectedObjects?: {
    box_2d: [number, number, number, number];
    label: string;
  }[];
}

interface TermiteControlFormProps {
  client: ClientData | null;
  session: Session | null;
  onFormSubmit: (hasil: UnifiedResultData) => void;
}

const laravelLoader = ({ src }: { src: string }) => {
  const laravelUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || 'http://localhost:8000';
  return `${laravelUrl}${src}`;
};

const preparationSetItems = [
  "Expose Soil Treatent per Liter Larutan",
  "Premise Soil Treatent per Liter Larutan",
  "Agenda Soil Treatent per Liter Larutan",
  "Xterm AG Station",
  "Xterm IG Station",
  "Expose Wood Treatent per Liter Larutan",
  "Queen Killer",
  "Mata Bor kayu 2mm",
  "Mata Bor kayu 3mm",
  "Mata bor Hilti 6mm",
  "Mata Bor Hilti 8mm",
  "Mata Bor Hilti 10mm",
  "Semen Warna",
  "Premium",
  "Oli Fastron 10W-40SL",
  "Jarum B&G",
];

const additionalSetItems = [
  "Masker untuk Klien",
  "Company Profile",
  "Laporan/SPK/Surat/Kontrak",
  "BAP",
  "LOG BOOK",
];

const autoCalcChemicals = [
  "Expose Soil Treatent per Liter Larutan",
  "Premise Soil Treatent per Liter Larutan",
  "Agenda Soil Treatent per Liter Larutan",
];

const autoCalcTreatments = ['Inject_Spraying', 'Spraying', 'Pipanasi', 'Refill_Pipanasi'];

export default function TCControl({ client, session, onFormSubmit }: TermiteControlFormProps) {
  const accessToken = session?.accessToken;
  const [luasTanah, setLuasTanah] = useState<number>(100)
  const [umurBangunan, setUmurBangunan] = useState<number>(5)
  const [lokasiRumah, setLokasiRumah] = useState<string>("")
  const [materialBangunan, setMaterialBangunan] = useState<string>("Sebagian Kayu")
  const [riwayatRayap, setRiwayatRayap] = useState<string>("tidak")
  const [tingkatKelembaban, setTingkatKelembaban] = useState<number>(50)
  const [jumlahPerabotKayu, setJumlahPerabotKayu] = useState<number>(5)
  const [adaLahanKosongDisekitar, setAdaLahanKosongDisekitar] = useState<string>("tidak")
  const [jenisLantai, setJenisLantai] = useState<string>("SPC")
  const [transport, setTransport] = useState<'mobil' | 'motor'>('mobil');
  const [jarakTempuh, setJarakTempuh] = useState<number>(0);
  const [jumlahLantai, setJumlahLantai] = useState<number>(1);
  const [monitoringPerBulan, setMonitoringPerBulan] = useState<number>(1);
  const [selectedPreparation, setSelectedPreparation] = useState<Record<string, number>>({});
  const [selectedAdditional, setSelectedAdditional] = useState<Record<string, number>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSetCheckChange = (
    item: string,
    checked: boolean | 'indeterminate',
    setter: React.Dispatch<React.SetStateAction<Record<string, number>>>
  ) => {
    setter(prev => {
      const newSet = { ...prev };
      if (checked) {
        newSet[item] = 1;
      } else {
        delete newSet[item];
      }
      return newSet;
    });
  };

  const handleSetQuantityChange = (
    item: string,
    quantity: string,
    setter: React.Dispatch<React.SetStateAction<Record<string, number>>>
  ) => {
    const numQuantity = parseInt(quantity, 10);
    if (!isNaN(numQuantity) && numQuantity >= 0) {
      setter(prev => ({
        ...prev,
        [item]: numQuantity,
      }));
    }
  };

  const [inspectionDate, setInspectionDate] = useState<Date | undefined>(new Date());
  const [images, setImages] = useState<InspectionImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [treatment, setTreatment] = useState('Inject_Spraying');
  const [status, setStatus] = useState('Aman');
  const [summary, setSummary] = useState('Berdasarkan hasil inspeksi, tidak ditemukan aktivitas rayap yang signifikan.');
  const [recommendationDetail, setRecommendationDetail] = useState('Tidak ada tindakan lanjutan yang diperlukan saat ini. Disarankan melakukan pengecekan rutin tahunan.');

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [uploadMode, setUploadMode] = useState<'manual' | 'termatrax'>('manual');

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;

    if (isCameraOpen || validationError) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalStyle;
    }
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isCameraOpen, validationError]);

  const uploadAndAnalyzeImage = async (file: File) => {
    if (!accessToken) {
      alert("Sesi berakhir, silakan login kembali.");
      return;
    }
    setIsUploading(true);
    setImages(prev => [...prev, { url: URL.createObjectURL(file), description: "Menganalisis...", detectedObjects: [] }]);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/locate-pest`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 422) {
          const errorData = await response.json();
          const errorMessages = Object.values(errorData.errors).flat().join('\n');
          throw new Error(`Kesalahan Validasi:\n${errorMessages}`);
        }
        throw new Error(`Analisis gagal: ${response.statusText}`);
      }

      const result = await response.json();
      let autoDescription = "Tidak ada hama yang terdeteksi secara visual.";
      if (result.summary && result.summary.length > 0) {
        autoDescription = "Terdeteksi: " + result.summary.map((s: any) => `${s.count}x ${s.label}`).join(', ') + ".";
      }

      const newImage: InspectionImage = {
        url: result.imageUrl,
        description: autoDescription,
        detectedObjects: result.detectedObjects || [],
      };

      setImages(prev => prev.map(img => img.url.startsWith('blob:') ? newImage : img));

    } catch (error: any) {
      console.error("Pest location analysis error:", error);
      alert(error.message);
      setImages(prev => prev.filter(img => !img.url.startsWith('blob:')));
    } finally {
      setIsUploading(false);
    }
  };

  const uploadManualImage = async (file: File) => {
    if (!accessToken) {
      alert("Sesi berakhir, silakan login kembali.");
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/upload-inspection-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
        body: formData,
      });
      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
      const result = await response.json();

      const newImage: InspectionImage = {
        url: result.url,
        description: "",
        detectedObjects: [],
      };
      setImages(prev => [...prev, newImage]);

    } catch (error) {
      console.error("Image upload error:", error);
      alert("Gagal mengunggah gambar.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (uploadMode === 'termatrax') {
      await uploadAndAnalyzeImage(file);
    } else {
      await uploadManualImage(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateImageDescription = (index: number, description: string) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, description } : img));
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const openCamera = async () => {
    setIsCameraOpen(true);
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { exact: "environment" }
      }
    };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
    } catch (err) {
      console.log("Could not get environment camera, trying user camera...", err);
      try {
        const fallbackConstraints: MediaStreamConstraints = { video: { facingMode: "user" } };
        const mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        setStream(mediaStream);
      } catch (fallbackErr) {
        console.error("Could not access any camera.", fallbackErr);
        alert("Tidak dapat mengakses kamera. Pastikan Anda memberikan izin.");
        setIsCameraOpen(false);
      }
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsCameraOpen(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    canvas.toBlob(async (blob) => {
      if (blob) {
        const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        if (uploadMode === 'termatrax') {
          await uploadAndAnalyzeImage(capturedFile);
        } else {
          await uploadManualImage(capturedFile);
        }
      }
    }, 'image/jpeg');
    closeCamera();
  };

  const handleSubmit = () => {
    if (!lokasiRumah.trim()) {
      setValidationError("Alamat properti tidak boleh kosong. Mohon lengkapi terlebih dahulu.");
      return;
    }

    const finalResult: UnifiedResultData = {
      serviceType: 'TC',
      client: client,
      agentName: session?.user?.name ?? 'N/A',
      inspection: {
        dateTime: format(inspectionDate || new Date(), "EEEE, dd MMMM yyyy 'pukul' HH.mm", { locale: id }),
        images: images,
        summary: summary,
        recommendation: recommendationDetail,
        treatment: treatment,
        status: status,
      },
      details: {
        lokasiRumah: lokasiRumah,
        luasTanah: luasTanah,
        umurBangunan: umurBangunan,
        materialBangunan: materialBangunan,
        riwayatRayap: riwayatRayap,
        tingkatKelembaban: tingkatKelembaban,
        jumlahPerabotKayu: jumlahPerabotKayu,
        adaLahanKosongDisekitar: adaLahanKosongDisekitar,
        jenisLantai: jenisLantai,
        transport: transport,
        jarakTempuh: jarakTempuh,
        jumlahLantai: jumlahLantai,
        monitoringPerBulan: monitoringPerBulan,
        preparationSet: selectedPreparation,
        additionalSet: selectedAdditional,
      }
    };

    onFormSubmit(finalResult);
  };

  return (
    <>
      {isClient && validationError && createPortal(
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ y: -30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.9 }}
            className="bg-black/90 border-l-4 border-red-500 p-6 rounded-lg shadow-2xl max-w-md mx-auto"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 bg-red-500/20 p-4 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-white text-lg font-bold mb-4">{validationError}</p>
              <Button onClick={() => setValidationError(null)} className="bg-red-500 hover:bg-red-600 text-white font-bold">
                Mengerti
              </Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {isClient && isCameraOpen && createPortal(
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          <video ref={videoRef} autoPlay playsInline className="max-w-full max-h-[70vh] rounded-lg" />
          <div className="flex items-center gap-4 mt-4">
            <Button onClick={handleCapture} className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-full p-4 h-16 w-16">
              <Camera className="h-8 w-8" />
            </Button>
            <Button variant="ghost" onClick={closeCamera} className="text-white rounded-full p-2 absolute top-4 right-4">
              <XCircle className="h-8 w-8" />
            </Button>
          </div>
          <canvas ref={canvasRef} className="hidden"></canvas>
        </div>,
        document.body
      )}
      <Card className="p-6 bg-black/90 border-l-4 border-yellow-500 text-white shadow-lg space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Bug className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-bold headline">Input Data Properti (Termite Control)</h2>
          </div>
          <div className="space-y-6">
            <div>
              <Label htmlFor="luas-tanah" className="text-white">Luas Tanah (m²)</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider id="luas-tanah" min={30} max={500} step={10} value={[luasTanah]} onValueChange={(v) => setLuasTanah(v[0])} />
                <Input type="number" value={luasTanah} onChange={(e) => setLuasTanah(Number(e.target.value))} className="w-20 bg-black/50 border-amber-600" />
              </div>
            </div>
            <div>
              <Label htmlFor="umur-bangunan" className="text-white">
                Umur Bangunan (tahun)
              </Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  id="umur-bangunan"
                  min={0}
                  max={50}
                  step={1}
                  value={[umurBangunan]}
                  onValueChange={(value) => setUmurBangunan(value[0])}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={umurBangunan}
                  onChange={(e) => setUmurBangunan(Number(e.target.value))}
                  className="w-20 bg-black/50 border-amber-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="lokasi-rumah" className="text-white">
                Alamat
              </Label>
              <div className="flex items-center mt-2">
                <Input
                  id="lokasi-rumah"
                  value={lokasiRumah}
                  onChange={(e) => setLokasiRumah(e.target.value)}
                  className="w-full bg-black/50 border-amber-600 text-white"
                  placeholder="Contoh: Jl. Merdeka No. 10, Jakarta"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="material-bangunan" className="text-white">
                Material Bangunan
              </Label>
              <Select value={materialBangunan} onValueChange={setMaterialBangunan}>
                <SelectTrigger id="material-bangunan" className="mt-2 bg-black/50 border-amber-600 text-white">
                  <SelectValue placeholder="Pilih material bangunan" />
                </SelectTrigger>
                <SelectContent className="bg-black text-white border-amber-600">
                  <SelectItem value="Dominan Kayu">Dominan Kayu</SelectItem>
                  <SelectItem value="Sebagian Kayu">Sebagian Kayu</SelectItem>
                  <SelectItem value="Dominan Beton/Bata">Dominan Beton/Bata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="riwayat-rayap" className="text-white">
                Pernah Ada Rayap Sebelumnya?
              </Label>
              <Select value={riwayatRayap} onValueChange={setRiwayatRayap}>
                <SelectTrigger id="riwayat-rayap" className="mt-2 bg-black/50 border-amber-600 text-white">
                  <SelectValue placeholder="Pilih riwayat rayap" />
                </SelectTrigger>
                <SelectContent className="bg-black text-white border-amber-600">
                  <SelectItem value="ya">Ya</SelectItem>
                  <SelectItem value="tidak">Tidak</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="jumlah-perabot" className="text-white">
                Jumlah Perabot Kayu
              </Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  id="jumlah-perabot"
                  min={0}
                  max={30}
                  step={1}
                  value={[jumlahPerabotKayu]}
                  onValueChange={(value) => setJumlahPerabotKayu(value[0])}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={jumlahPerabotKayu}
                  onChange={(e) => setJumlahPerabotKayu(Number(e.target.value))}
                  className="w-20 bg-black/50 border-amber-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ada-lahan" className="text-white">
                Ada Lahan Kosong di sekeliling bangunan?
              </Label>
              <Select value={adaLahanKosongDisekitar} onValueChange={setAdaLahanKosongDisekitar}>
                <SelectTrigger id="ada-lahan" className="mt-2 bg-black/50 border-amber-600 text-white">
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent className="bg-black text-white border-amber-600">
                  <SelectItem value="ya">Ya</SelectItem>
                  <SelectItem value="tidak">Tidak</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="jenis-lantai" className="text-white">
                Jenis Lantai
              </Label>
              <Select value={jenisLantai} onValueChange={setJenisLantai}>
                <SelectTrigger id="jenis-lantai" className="mt-2 bg-black/50 border-amber-600 text-white">
                  <SelectValue placeholder="Pilih jenis lantai" />
                </SelectTrigger>
                <SelectContent className="bg-black text-white border-amber-600">
                  <SelectItem value="SPC">SPC</SelectItem>
                  <SelectItem value="Granitile">Granitile</SelectItem>
                  <SelectItem value="Marmer">Marmer</SelectItem>
                  <SelectItem value="Keramik">Keramik</SelectItem>
                  <SelectItem value="Vinyl">Vinyl</SelectItem>
                  <SelectItem value="Real Kayu">Real Kayu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex justify-between">
                <Label htmlFor="tingkat-kelembaban" className="text-white">
                  Tingkat Kelembaban Area (%)
                </Label>
                <span className="text-xs text-amber-400 italic">*Wajib diisi untuk hasil akurat</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  id="tingkat-kelembaban"
                  min={20}
                  max={100}
                  step={5}
                  value={[tingkatKelembaban]}
                  onValueChange={(value) => setTingkatKelembaban(value[0])}
                  className="flex-1"
                />
                <span className="w-12 text-center">{tingkatKelembaban}%</span>
              </div>
              <p className="text-xs text-white/60 mt-1">
                Kelembaban tinggi ({">"}70%) sangat meningkatkan risiko serangan rayap
              </p>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-amber-800/50 my-8"></div>
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-bold headline">Detail Operasional & Biaya</h2>
          </div>
          <div className="space-y-6">
            <div>
              <Label htmlFor="transport" className="text-white">Transportasi</Label>
              <Select
                value={transport}
                onValueChange={(value) => setTransport(value as 'mobil' | 'motor')}
              >
                <SelectTrigger id="transport" className="mt-2 bg-black/50 border-amber-600 text-white">
                  <SelectValue placeholder="Pilih transportasi" />
                </SelectTrigger>
                <SelectContent className="bg-black text-white border-amber-600">
                  <SelectItem value="mobil">Mobil</SelectItem>
                  <SelectItem value="motor">Motor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="jarak-tempuh" className="text-white">Jarak Tempuh (km)</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider min={0} max={500} step={5} value={[jarakTempuh]} onValueChange={(v) => setJarakTempuh(v[0])} />
                <Input type="number" value={jarakTempuh} onChange={(e) => setJarakTempuh(Number(e.target.value))} className="w-20 bg-black/50 border-amber-600" />
              </div>
            </div>

            <div>
              <Label htmlFor="jumlah-lantai" className="text-white">Jumlah Lantai</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider min={1} max={10} step={1} value={[jumlahLantai]} onValueChange={(v) => setJumlahLantai(v[0])} />
                <Input type="number" value={jumlahLantai} onChange={(e) => setJumlahLantai(Number(e.target.value))} className="w-20 bg-black/50 border-amber-600" />
              </div>
            </div>

            <div>
              <Label htmlFor="monitoring-per-bulan" className="text-white">Monitoring (Bulan)</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider min={1} max={12} step={1} value={[monitoringPerBulan]} onValueChange={(v) => setMonitoringPerBulan(v[0])} />
                <Input type="number" value={monitoringPerBulan} onChange={(e) => setMonitoringPerBulan(Number(e.target.value))} className="w-20 bg-black/50 border-amber-600" />
              </div>
            </div>
          </div>
        </div>


        <div className="border-t-2 border-dashed border-amber-800/50 my-8"></div>

        <div>
          <div className="flex items-center gap-2 mb-6">
            <Camera className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-bold headline">Input Data Inspeksi</h2>
          </div>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="inspection-treatment">Saran Treatment</Label>
                <Select value={treatment} onValueChange={setTreatment}>
                  <SelectTrigger id="inspection-treatment" className="mt-2 bg-black/50 border-amber-600"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-black text-white border-amber-600">
                    <SelectItem value="Inject_Spraying">Inject Spraying</SelectItem>
                    <SelectItem value="Baiting">Baiting</SelectItem>
                    <SelectItem value="Spraying">Spraying</SelectItem>
                    <SelectItem value="Pipanasi">Pipanasi</SelectItem>
                    <SelectItem value="Refill_Pipanasi">Refill Pipanasi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="inspection-status">Status Temuan</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="inspection-status" className="mt-2 bg-black/50 border-amber-600"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-black text-white border-amber-600">
                    <SelectItem value="Aman">Aman</SelectItem>
                    <SelectItem value="Terdeteksi Rayap">Terdeteksi Rayap</SelectItem>
                    <SelectItem value="Butuh Pencegahan">Butuh Pencegahan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="hidden">
              <Label>Tanggal & Waktu Inspeksi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-full justify-start text-left font-normal mt-2 bg-black/50 border-amber-600 text-white">
                    <Calendar className="mr-2 h-4 w-4" />
                    {inspectionDate ? format(inspectionDate, "PPP p", { locale: id }) : <span>Pilih tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-black text-white border-amber-600" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={inspectionDate}
                    onSelect={setInspectionDate}
                    initialFocus
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-white text-lg font-semibold">Preparation Set</Label>
              <p className="text-sm text-white/70 mb-3">Pilih item yang dibutuhkan. Kuantitas untuk chemical akan dihitung otomatis berdasarkan treatment.</p>
              <div className="space-y-4 max-h-60 overflow-y-auto p-3 bg-black/40 rounded-md">
                {preparationSetItems.map((item) => {
                  const isAutoCalcItem = autoCalcChemicals.includes(item);
                  const isAutoCalcTriggered = autoCalcTreatments.includes(treatment);
                  const showQuantityInput = !isAutoCalcItem || !isAutoCalcTriggered;

                  return (
                    <div key={item} className="flex items-center justify-between">
                      <div className="flex items-center flex-1 pr-4">
                        <Checkbox
                          id={`prep-${item}`}
                          checked={item in selectedPreparation}
                          onCheckedChange={(checked) => handleSetCheckChange(item, checked, setSelectedPreparation)}
                          className="border-amber-400"
                        />
                        <label
                          htmlFor={`prep-${item}`}
                          className="ml-3 text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {item}
                        </label>
                      </div>
                      {showQuantityInput && (
                        <Input
                          type="number"
                          min="1"
                          value={selectedPreparation[item] || ''}
                          onChange={(e) => handleSetQuantityChange(item, e.target.value, setSelectedPreparation)}
                          disabled={!(item in selectedPreparation)}
                          className="w-20 bg-black/50 border-amber-600 h-8 text-white disabled:opacity-50"
                          placeholder="Qty"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-white text-lg font-semibold">Additional Set</Label>
              <p className="text-sm text-white/70 mb-3">Pilih item tambahan dan tentukan jumlah.</p>
              <div className="space-y-4 p-3 bg-black/40 rounded-md">
                {additionalSetItems.map((item) => (
                  <div key={item} className="flex items-center justify-between">
                    <div className="flex items-center flex-1 pr-4">
                      <Checkbox
                        id={`add-${item}`}
                        checked={item in selectedAdditional}
                        onCheckedChange={(checked) => handleSetCheckChange(item, checked, setSelectedAdditional)}
                        className="border-amber-400"
                      />
                      <label
                        htmlFor={`add-${item}`}
                        className="ml-3 text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {item}
                      </label>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={selectedAdditional[item] || ''}
                      onChange={(e) => handleSetQuantityChange(item, e.target.value, setSelectedAdditional)}
                      disabled={!(item in selectedAdditional)}
                      className="w-20 bg-black/50 border-amber-600 h-8 text-white disabled:opacity-50"
                      placeholder="Qty"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Foto Temuan (Opsional)</Label>
              <div className="mt-2 p-4 border-2 border-dashed border-amber-800/50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {images.map((image, index) => (
                    <div key={index} className="space-y-2">
                      <div className="relative group w-full h-32">
                        <Image
                          loader={image.url.startsWith('blob:') ? undefined : laravelLoader}
                          src={image.url}
                          alt={`Inspection image ${index + 1}`}
                          fill
                          className="object-cover rounded-md"
                        />
                        {image.detectedObjects?.map((obj, objIndex) => {
                          const [ymin, xmin, ymax, xmax] = obj.box_2d;
                          const boxStyle = {
                            top: `${ymin / 10}%`,
                            left: `${xmin / 10}%`,
                            width: `${(xmax - xmin) / 10}%`,
                            height: `${(ymax - ymin) / 10}%`,
                          };
                          return (
                            <div
                              key={objIndex}
                              className="absolute border-2 border-red-500 group-hover:bg-red-500/20 transition-colors"
                              style={boxStyle}
                            >
                              <span className="absolute -top-5 left-0 text-xs bg-black/70 text-white px-1 rounded-sm whitespace-rap">
                                {obj.label}
                              </span>
                            </div>
                          );
                        })}
                        <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-600/80 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <Textarea
                        placeholder="Deskripsi singkat..."
                        value={image.description}
                        onChange={(e) => updateImageDescription(index, e.target.value)}
                        className="mt-1 bg-gray-900 border-gray-700 text-xs"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
                <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" disabled={isUploading} />
                <div className="grid sm:grid-cols-3 gap-4">
                  <Button
                    onClick={() => { setUploadMode('manual'); fileInputRef.current?.click(); }}
                    disabled={isUploading}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-black font-bold"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading && uploadMode === 'manual' ? "..." : "Unggah Foto"}
                  </Button>
                  <Button
                    onClick={() => { setUploadMode('manual'); openCamera(); }}
                    disabled={isUploading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Ambil Foto
                  </Button>
                  <Button
                    onClick={() => { setUploadMode('termatrax'); fileInputRef.current?.click(); }}
                    disabled={isUploading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    <ScanSearch className="h-4 w-4 mr-2" />
                    {isUploading && uploadMode === 'termatrax' ? "..." : "Termatrax"}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="summary">Kesimpulan</Label>
              <Textarea id="summary" placeholder="Tuliskan kesimpulan umum dari inspeksi di sini..." value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-2 bg-black/50 border-amber-600" rows={4} />
            </div>

            <div>
              <Label htmlFor="recommendation-detail">Opsi Penanganan Lanjutan</Label>
              <Textarea id="recommendation-detail" placeholder="Jelaskan secara detail opsi penanganan yang direkomendasikan..." value={recommendationDetail} onChange={(e) => setRecommendationDetail(e.target.value)} className="mt-2 bg-black/50 border-amber-600" rows={4} />
            </div>
          </div>
        </div>

        <Button onClick={handleSubmit} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold text-lg py-6">
          <Calculator className="mr-2 h-5 w-5" />
          Lanjutkan
        </Button>
      </Card>
    </>
  )
}