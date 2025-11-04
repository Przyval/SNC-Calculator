// FILE: components/form-sections/InspectionFields.tsx

"use client"

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { createPortal } from "react-dom";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Upload, Trash2, XCircle, ScanSearch } from "lucide-react";
import Image from "next/image";
import { Session } from "next-auth";
import { UnifiedResultData } from "../types";

interface InspectionImage {
  url: string;
  description: string;
  detectedObjects?: {
    box_2d: [number, number, number, number];
    label: string;
  }[];
}

const laravelLoader = ({ src }: { src: string }) => {
  const laravelUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || 'http://localhost:8000';
  return `${laravelUrl}${src}`;
};

interface InspectionFieldsProps {
  data: UnifiedResultData['inspection'];
  onChange: (field: keyof UnifiedResultData['inspection'], value: any) => void;
  session: Session | null;
  themeColor: string;
}

export default function InspectionFields({ data, onChange, session, themeColor }: InspectionFieldsProps) {
  const accessToken = session?.accessToken;

  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploadMode, setUploadMode] = useState<'manual' | 'termatrax'>('manual');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    if (isCameraOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalStyle;
    }
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isCameraOpen]);


  const uploadAndAnalyzeImage = async (file: File) => {
    if (!accessToken) {
      alert("Sesi berakhir, silakan login kembali.");
      return;
    }
    setIsUploading(true);
    
    const tempImage = { url: URL.createObjectURL(file), description: "Menganalisis...", detectedObjects: [] };
    onChange('images', [...data.images, tempImage]);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/locate-pest`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
        body: formData,
      });

      if (!response.ok) throw new Error(`Analisis gagal: ${response.statusText}`);

      const result = await response.json();
      let autoDescription = result.summary?.map((s: any) => `${s.count}x ${s.label}`).join(', ') || "Tidak ada hama terdeteksi.";
      
      const newImage: InspectionImage = {
        url: result.imageUrl,
        description: `Terdeteksi: ${autoDescription}`,
        detectedObjects: result.detectedObjects || [],
      };
      
      onChange('images', data.images.map(img => img.url === tempImage.url ? newImage : img));

    } catch (error: any) {
      console.error("Pest location analysis error:", error);
      alert(error.message);
      onChange('images', data.images.filter(img => img.url !== tempImage.url));
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

      const newImage: InspectionImage = { url: result.url, description: "", detectedObjects: [] };
      onChange('images', [...data.images, newImage]);

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
    const newImages = data.images.map((img, i) => i === index ? { ...img, description } : img);
    onChange('images', newImages);
  };

  const removeImage = (indexToRemove: number) => {
    const newImages = data.images.filter((_, index) => index !== indexToRemove);
    onChange('images', newImages);
  };
  
  const openCamera = async () => {
    setIsCameraOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } } });
      setStream(mediaStream);
    } catch (err) {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
    }
  };
  
  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  const closeCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsCameraOpen(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        if (uploadMode === 'termatrax') await uploadAndAnalyzeImage(file);
        else await uploadManualImage(file);
      }
    }, 'image/jpeg');
    closeCamera();
  };


  return (
    <>
      {isClient && isCameraOpen && createPortal(
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          <video ref={videoRef} autoPlay playsInline className="max-w-full max-h-[70vh] rounded-lg" />
          <div className="flex items-center gap-4 mt-4">
            <Button onClick={handleCapture} className={`bg-${themeColor}-500 hover:bg-${themeColor}-600 text-black font-bold rounded-full p-4 h-16 w-16`}>
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

      <div>
          <div className="flex items-center gap-2 mb-6">
            <Camera className="h-6 w-6 text-gray-400" />
            <h2 className="text-xl font-bold headline">Input Data Inspeksi & Temuan</h2>
          </div>
          <div className="space-y-6">
            <div>
              <Label>Foto Temuan (Opsional)</Label>
              <div className={`mt-2 p-4 border-2 border-dashed border-${themeColor}-800/50 rounded-lg`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {data.images.map((image, index) => (
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
                          return (
                            <div
                              key={objIndex}
                              className="absolute border-2 border-red-500 group-hover:bg-red-500/20 transition-colors"
                              style={{
                                top: `${ymin / 10}%`, left: `${xmin / 10}%`,
                                width: `${(xmax - xmin) / 10}%`, height: `${(ymax - ymin) / 10}%`,
                              }}
                            >
                              <span className="absolute -top-5 left-0 text-xs bg-black/70 text-white px-1 rounded-sm whitespace-nowrap">
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
                    className={`w-full bg-${themeColor}-600 hover:bg-${themeColor}-700 text-black font-bold`}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading && uploadMode === 'manual' ? "Mengunggah..." : "Unggah Foto"}
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
                    {isUploading && uploadMode === 'termatrax' ? "Menganalisis..." : "Termatrax"}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="summary">Kesimpulan Umum</Label>
              <Textarea 
                id="summary" 
                placeholder="Tuliskan kesimpulan umum dari inspeksi di sini..." 
                value={data.summary} 
                onChange={(e) => onChange('summary', e.target.value)} 
                className="mt-2 bg-black/50 border-gray-600" 
                rows={4} 
              />
            </div>

            <div>
              <Label htmlFor="recommendation">Rekomendasi Penanganan</Label>
              <Textarea 
                id="recommendation" 
                placeholder="Jelaskan secara detail opsi penanganan yang direkomendasikan..." 
                value={data.recommendation} 
                onChange={(e) => onChange('recommendation', e.target.value)} 
                className="mt-2 bg-black/50 border-gray-600" 
                rows={4} 
              />
            </div>
          </div>
        </div>
    </>
  )
}