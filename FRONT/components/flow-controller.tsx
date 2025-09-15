"use client"

import type React from "react"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Variants, TargetAndTransition, Transition } from "framer-motion"
import { ArrowRight, ArrowLeft, Home, MapPin, Calculator, Banknote, Gift, Camera, User, Check } from "lucide-react"
import ClientSelection from "@/components/client-selection"
import KalkulatorRisiko from "@/components/kalkulator-risiko"
import PetaRisikoSurabaya from "@/components/peta-risiko-surabaya"
import LoadingAnalysis from "@/components/loading-analysis"
import PerbandinganHarga from "@/components/perbandingan-harga"
import CombinedPromos from "@/components/combined-promos"
import InspectionResults from "@/components/inspection-results"

// Tambahkan import untuk framer-motion
import { motion, AnimatePresence } from "framer-motion"

// Tambahkan import untuk PromoNotification
import PromoNotification from "@/components/promo-notification"
import { useRouter } from "next/navigation"

interface PerhitunganDanInspeksi {
  // Property fields
  luasTanah: number;
  umurBangunan: number;
  lokasiRumah: string;
  materialBangunan: string;
  riwayatRayap: string;
  tingkatKelembaban: number;
  jumlahPerabotKayu: number;
  // adaDanauSebelumnya: string;
  adaLahanKosongDisekitar: string;
  // jenisTanah: string;
  jenisLantai: string;
  skorRisiko: number;
  kategoriRisiko: string;
  estimasiKerugian: number;
  rekomendasiLayanan: string;
  biayaPerbaikan: number;
  biayaLayanan: number;
  penghematan: number;
  inspectionData: InspectionResult;
}


// Tipe data untuk data kecamatan
interface KecamatanData {
  id: string
  name: string
  riskLevel: "tinggi" | "sedang" | "rendah"
  affectedHomes: number
  totalHomes: number
  description: string
}

// Updated InspectionResult type to match what's coming from the calculator
interface InspectionResult {
  clientName?: string;
  dateTime: string;
  images: { url: string; description: string }[];
  summary: string;
  recommendation: string;
  treatment: string;
  status: string;
  agentName?: string;
}
interface ClientData {
  id: number | null;
  name: string;
}

export default function FlowController() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1)
  const [client, setClient] = useState<ClientData | null>(null)

  // This state will now hold the combined calculation and inspection data
  const [hasilPerhitungan, setHasilPerhitungan] = useState<Omit<PerhitunganDanInspeksi, 'inspectionData'> | null>(null);
  const [inspectionResults, setInspectionResults] = useState<InspectionResult | null>(null)

  const [selectedKecamatan, setSelectedKecamatan] = useState<KecamatanData | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [popupMessage, setPopupMessage] = useState("")
  const [popupIcon, setPopupIcon] = useState<React.ReactNode | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState(1)
  const [showPromoNotification, setShowPromoNotification] = useState(false)

  if (status === "loading") {
    return <div>Memuat sesi...</div>;
  }
  if (status === "unauthenticated") {
    router.push('/login');
    return null;
  }

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(angka)
  }

  const handleClientSelected = (selectedClient: ClientData) => {
    setClient(selectedClient);
    showPopupMessage(`Klien "${selectedClient.name}" dipilih.`, <User className="h-8 w-8 text-amber-500" />)
    setTimeout(() => {
      goToNextStep();
    }, 1500)
  };

  const handleHasilPerhitungan = (hasil: PerhitunganDanInspeksi) => {
    const { inspectionData, ...calcResults } = hasil;

    setHasilPerhitungan(calcResults);

    if (client && session?.user) {
      setInspectionResults({
        ...inspectionData,
        clientName: client.name,
        agentName: session.user.name ?? "Nama Agen Tidak Tersedia",
      });
    } else {
      setInspectionResults({
        ...inspectionData,
        clientName: client?.name,
      });
    }

    goToNextStep();
  }

  const handleKecamatanSelected = (kecamatan: KecamatanData) => {
    setSelectedKecamatan(kecamatan)
    showPopupMessage(`Anda memilih Kecamatan ${kecamatan.name}`, <MapPin className="h-8 w-8 text-amber-500" />)

    setTimeout(() => {
      goToNextStep()
    }, 1500)
  }

  const saveDataToDatabase = async () => {
    if (!client || !hasilPerhitungan || !selectedKecamatan || !inspectionResults || !session?.accessToken) {
      console.error("Missing data or auth token for saving.", { client, hasilPerhitungan, selectedKecamatan, inspectionResults });
      showPopupMessage("Gagal menyimpan. Data tidak lengkap atau sesi tidak valid.", null);
      return;
    }

    const { clientName, ...inspectionPayload } = inspectionResults;

    const payload = {
      client: {
        id: client.id,
        name: client.name,
      },
      calculatorResult: { ...hasilPerhitungan },
      kecamatan: {
        name: selectedKecamatan.name,
        riskLevel: selectedKecamatan.riskLevel,
      },
      inspection: inspectionPayload,
    };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/risk-calculations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("VALIDATION ERRORS:", errorData.errors);
        throw new Error(errorData.message || 'Failed to save data due to validation issues.');
      }

      const result = await response.json();
      console.log("Save successful:", result);
      showPopupMessage("Data berhasil disimpan!", <Check className="h-8 w-8 text-green-500" />);

    } catch (error) {
      console.error("Error saving data:", error);
      showPopupMessage(`Gagal menyimpan data: ${error}`, null);
    }
  };


  const handleLoadingComplete = () => goToNextStep()

  const showPopupMessage = (message: string, icon: React.ReactNode) => {
    setPopupMessage(message)
    setPopupIcon(icon)
    setShowPopup(true)
    setTimeout(() => setShowPopup(false), 3000)
  }

  const goToNextStep = () => {
    if (currentStep < 7 && !isAnimating) {
      setIsAnimating(true)
      setDirection(1)
      setTimeout(() => {
        const nextStep = currentStep + 1
        setCurrentStep(nextStep)
        setIsAnimating(false)
        if (nextStep === 7 && selectedKecamatan) {
          setTimeout(() => setShowPromoNotification(true), 1000)
        }
      }, 700)
    }
  }

  const goToPrevStep = () => {
    if (currentStep > 1 && !isAnimating) {
      setIsAnimating(true)
      setDirection(-1)
      setTimeout(() => {
        setCurrentStep(currentStep - 1)
        setIsAnimating(false)
      }, 700)
    }
  }

  const restartProcess = async () => {
    await saveDataToDatabase();
    setTimeout(() => {
      setIsAnimating(true)
      setDirection(-1)
      setTimeout(() => {
        setCurrentStep(1)
        setClient(null)
        setHasilPerhitungan(null)
        setSelectedKecamatan(null)
        setInspectionResults(null)
        setIsAnimating(false)
        showPopupMessage("Memulai proses baru", <Home className="h-8 w-8 text-amber-500" />)
      }, 700)
    }, 2000);
  }

  const renderStep = () => {
    const variants: Variants = {
      enter: (direction: number): TargetAndTransition => ({
        x: direction > 0 ? "30%" : "-30%", y: 0, opacity: 0, scale: 0.9, filter: "blur(10px)",
        transition: { type: "spring", bounce: 0.3, duration: 0.6 },
      }),
      center: {
        x: 0, y: 0, opacity: 1, scale: 1, filter: "blur(0px)",
        transition: { type: "spring", stiffness: 300, damping: 25, mass: 0.5, velocity: 5, duration: 0.7 },
      },
      exit: (direction: number): TargetAndTransition => ({
        x: direction > 0 ? "-20%" : "20%", y: 0, opacity: 0, scale: 0.95, filter: "blur(5px)",
        transition: { type: "spring", bounce: 0.2, duration: 0.5 },
      }),
    }

    return (
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div key={currentStep} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="w-full">
          {(() => {
            switch (currentStep) {
              case 1:
                return <ClientSelection onClientSelected={handleClientSelected} accessToken={session?.accessToken} />
              case 2:
                return <KalkulatorRisiko onHasilPerhitungan={handleHasilPerhitungan} accessToken={session?.accessToken} />
              case 3:
                return <PetaRisikoSurabaya onKecamatanSelected={handleKecamatanSelected} />
              case 4:
                return <InspectionResults
                  inspectionResults={inspectionResults}
                  fullExportData={{
                    client,
                    hasilPerhitungan,
                    selectedKecamatan,
                    inspectionResults,
                  }}
                  accessToken={session?.accessToken}
                />
              // case 5:
              //   return <LoadingAnalysis onComplete={handleLoadingComplete} />
              case 5:
                return hasilPerhitungan ? (
                  <PerbandinganHarga
                    biayaPerbaikan={hasilPerhitungan.biayaPerbaikan}
                    biayaLayanan={hasilPerhitungan.biayaLayanan}
                    penghematan={hasilPerhitungan.penghematan}
                    formatRupiah={formatRupiah}
                  />
                ) : null
              case 6:
                return selectedKecamatan && hasilPerhitungan ? (
                  <CombinedPromos
                    riskLevel={selectedKecamatan.riskLevel}
                    kecamatanName={selectedKecamatan.name}
                    biayaPerbaikan={hasilPerhitungan.biayaPerbaikan}
                    biayaLayanan={hasilPerhitungan.biayaLayanan}
                    penghematan={hasilPerhitungan.penghematan}
                    formatRupiah={formatRupiah}
                  />
                ) : null
              default:
                return null
            }
          })()}
        </motion.div>
      </AnimatePresence>
    )
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Pilih Klien"
      case 2: return "Input Data Properti & Inspeksi"
      case 3: return "Pilih Lokasi Rumah di Peta"
      case 4: return "Hasil Inspeksi Rayap"
      // case 5: return "Analisis AI Sedang Berjalan"
      case 5: return "Perbandingan Biaya"
      case 6: return "Promo Spesial untuk Anda"
      default: return ""
    }
  }

  const getStepIcon = () => {
    switch (currentStep) {
      case 1: return <User className="h-6 w-6 text-amber-500" />
      case 2: return <Home className="h-6 w-6 text-amber-500" />
      case 3: return <MapPin className="h-6 w-6 text-amber-500" />
      case 4: return <Camera className="h-6 w-6 text-amber-500" />
      // case 5: return <Calculator className="h-6 w-6 text-amber-500" />
      case 5: return <Banknote className="h-6 w-6 text-amber-500" />
      case 6: return <Gift className="h-6 w-6 text-amber-500" />
      default: return null
    }
  }

  const handleClosePromoNotification = () => {
    setShowPromoNotification(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-black/90 border-l-4 border-yellow-500 p-4 rounded-md shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.div
              key={`icon-${currentStep}`}
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                duration: 0.6,
                delay: 0.1,
              }}
            >
              {getStepIcon()}
            </motion.div>
            <motion.h2
              key={`title-${currentStep}`}
              initial={{ y: -15, opacity: 0, filter: "blur(8px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                mass: 0.8,
                duration: 0.7,
                delay: 0.2,
              }}
              className="text-xl font-bold headline text-white"
            >
              Langkah {currentStep} dari 7: {getStepTitle()}
            </motion.h2>
          </div>
        </div>
        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
          <motion.div
            className="bg-amber-500 h-full"
            initial={{ width: `${((currentStep - 1) / 7) * 100}%` }}
            animate={{ width: `${(currentStep / 7) * 100}%` }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 30,
              mass: 0.5,
              duration: 1.2,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          ></motion.div>
        </div>

        <div className="flex justify-between mt-2">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
            <motion.div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${step === currentStep
                ? "bg-amber-500 text-black font-bold"
                : step < currentStep
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-400"
                }`}
              whileHover={{ scale: 1.15, boxShadow: "0px 5px 10px rgba(0, 0, 0, 0.2)" }}
              animate={
                step === currentStep
                  ? {
                    scale: [1, 1.2, 1],
                    boxShadow: [
                      "0px 0px 0px rgba(0, 0, 0, 0)",
                      "0px 8px 15px rgba(0, 0, 0, 0.3)",
                      "0px 5px 10px rgba(0, 0, 0, 0.2)",
                    ],
                    transition: {
                      duration: 0.8,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatType: "reverse",
                      repeatDelay: 2,
                    },
                  }
                  : {}
              }
            >
              {step}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="transition-all duration-500 ease-in-out">{renderStep()}</div>
      <div className="flex justify-between">
        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95, y: 2 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Button
            variant="outline"
            onClick={goToPrevStep}
            disabled={currentStep === 1 || currentStep === 4 || isAnimating}
            className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </motion.div>

        {currentStep > 1 && (
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95, y: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              onClick={currentStep < 7 ? goToNextStep : restartProcess}
              disabled={
                (currentStep === 2 && !hasilPerhitungan) ||
                (currentStep === 3 && !selectedKecamatan) ||
                currentStep === 5 ||
                isAnimating
              }
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {currentStep < 7 ? (
                <>
                  Lanjut
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Simpan & Mulai Baru
                  <Home className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>
        )}
      </div>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <motion.div
            initial={{ y: -30, opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ y: 30, opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 25,
              mass: 0.8,
              velocity: 2,
            }}
            className="bg-black/90 border-l-4 border-yellow-500 p-6 rounded-lg shadow-2xl max-w-md mx-auto"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{
                  scale: 1,
                  rotate: [0, 15, -15, 10, -10, 5, -5, 0],
                  transition: { duration: 1.2 },
                }}
                className="mb-4 bg-amber-500/20 p-4 rounded-full"
              >
                {popupIcon}
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-white text-lg font-bold"
              >
                {popupMessage}
              </motion.p>
            </div>
          </motion.div>
        </div>
      )}
      {showPromoNotification && selectedKecamatan && (
        <PromoNotification
          riskLevel={selectedKecamatan.riskLevel}
          kecamatanName={selectedKecamatan.name}
          onClose={handleClosePromoNotification}
        />
      )}
    </div>
  )
}