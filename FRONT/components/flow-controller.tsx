"use client"

import type React from "react"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Variants, TargetAndTransition } from "framer-motion"
import { ArrowRight, ArrowLeft, Home, User, Check, ShieldCheck, FileText, AlertTriangle } from "lucide-react"
import ClientSelection from "@/components/client-selection"
import ServiceSelection from "@/components/service-selection"
import DynamicControlForm from "@/components/dynamic-control-form"
import InspectionResults from "@/components/inspection-results"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

import { 
  type ServiceType, 
  type UnifiedResultData,
  type ClientData
} from "./types";


export default function FlowController() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [client, setClient] = useState<ClientData | null>(null);

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [finalResults, setFinalResults] = useState<UnifiedResultData | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupIcon, setPopupIcon] = useState<React.ReactNode | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState(1);

  const TOTAL_STEPS = 4;

  if (status === "loading") {
    return <div className="text-white text-center p-8">Memuat sesi...</div>;
  }
  if (status === "unauthenticated") {
    router.push('/login');
    return null;
  }

  const handleClientSelected = (selectedClient: ClientData) => {
    setClient(selectedClient);
    showPopupMessage(`Klien "${selectedClient.name}" dipilih.`, <User className="h-8 w-8 text-amber-500" />);
    setTimeout(goToNextStep, 1500);
  };

  const handleServiceSelected = (selectedServices: ServiceType[]) => {
    setServiceTypes(selectedServices);
    showPopupMessage(`Layanan "${selectedServices.join(', ')}" dipilih.`, <ShieldCheck className="h-8 w-8 text-amber-500" />);
    setTimeout(goToNextStep, 1500);
  }

  const handleFormSubmit = (results: UnifiedResultData) => {
    setFinalResults(results);
    goToNextStep();
  }

  const saveDataToDatabase = async (): Promise<boolean> => {
    if (!finalResults || !session?.accessToken) {
      showPopupMessage("Error: Data tidak lengkap atau sesi tidak valid.", <AlertTriangle className="h-8 w-8 text-red-500" />);
      return false;
    }

    setIsSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/inspections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(finalResults),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `Gagal menyimpan data. Status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      showPopupMessage(`Data berhasil disimpan! No: ${result.proposal_number}`, <Check className="h-8 w-8 text-green-500" />);
      return true;

    } catch (error: any) {
      console.error("Gagal menyimpan data ke database:", error);
      showPopupMessage(error.message || "Terjadi kesalahan saat menyimpan.", <AlertTriangle className="h-8 w-8 text-red-500" />);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const showPopupMessage = (message: string, icon: React.ReactNode) => {
    setPopupMessage(message);
    setPopupIcon(icon);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  }

  const goToStep = (step: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(step > currentStep ? 1 : -1);
    setTimeout(() => {
      setCurrentStep(step);
      setIsAnimating(false);
    }, 700);
  }

  const goToNextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      goToStep(currentStep + 1);
    }
  }

  const goToPrevStep = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  }

  const restartProcess = async () => {
    const success = await saveDataToDatabase();
    if (success) {
      setTimeout(() => {
        setIsAnimating(true);
        setDirection(-1);
        setTimeout(() => {
          setCurrentStep(1);
          setClient(null);
          setServiceTypes([]);
          setFinalResults(null);
          setIsAnimating(false);
          showPopupMessage("Memulai proses baru", <Home className="h-8 w-8 text-amber-500" />);
        }, 700);
      }, 2000);
    }
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
    };

    return (
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div key={currentStep} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="w-full">
          {(() => {
            switch (currentStep) {
              case 1:
                return <ClientSelection onClientSelected={handleClientSelected} accessToken={session?.accessToken} />;
              case 2:
                return <ServiceSelection onServiceSelected={handleServiceSelected} />;
              case 3:
                return serviceTypes.length > 0 ? (
                  <DynamicControlForm
                    client={client}
                    session={session}
                    onFormSubmit={handleFormSubmit}
                    serviceTypes={serviceTypes}
                  />
                ) : (
                  <div className="text-center text-red-500 p-8">
                    Error: Jenis layanan tidak valid. Silakan kembali ke langkah sebelumnya.
                  </div>
                );
              case 4:
                return finalResults ? <InspectionResults results={finalResults} accessToken={session?.accessToken} /> : <div className="text-center text-white p-8">Memuat hasil...</div>;
              default:
                return null;
            }
          })()}
        </motion.div>
      </AnimatePresence>
    );
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Pilih Klien";
      case 2: return "Pilih Jenis Layanan";
      case 3: return `Input Data (${serviceTypes.join(' & ') || '...'})`;
      case 4: return "Hasil & Laporan";
      default: return "";
    }
  }

  const getStepIcon = () => {
    switch (currentStep) {
      case 1: return <User className="h-6 w-6 text-amber-500" />;
      case 2: return <ShieldCheck className="h-6 w-6 text-amber-500" />;
      case 3: return <FileText className="h-6 w-6 text-amber-500" />;
      case 4: return <Check className="h-6 w-6 text-amber-500" />;
      default: return null;
    }
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
              transition={{ type: "spring", stiffness: 260, damping: 20, duration: 0.6, delay: 0.1 }}
            >
              {getStepIcon()}
            </motion.div>
            <motion.h2
              key={`title-${currentStep}`}
              initial={{ y: -15, opacity: 0, filter: "blur(8px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.8, duration: 0.7, delay: 0.2 }}
              className="text-xl font-bold headline text-white"
            >
              Langkah {currentStep} dari {TOTAL_STEPS}: {getStepTitle()}
            </motion.h2>
          </div>
        </div>
        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
          <motion.div
            className="bg-amber-500 h-full"
            initial={{ width: `${((currentStep - 1) / TOTAL_STEPS) * 100}%` }}
            animate={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 30, mass: 0.5, duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
          ></motion.div>
        </div>
        <div className="flex justify-between mt-2">
          {[1, 2, 3, 4].map((step) => (
            <motion.div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${step === currentStep
                ? "bg-amber-500 text-black font-bold"
                : step < currentStep
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-400"
                }`}
              whileHover={{ scale: 1.15, boxShadow: "0px 5px 10px rgba(0, 0, 0, 0.2)" }}
            >
              {step < currentStep ? <Check size={18} /> : step}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="transition-all duration-500 ease-in-out">{renderStep()}</div>

      <div className="flex justify-between">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            onClick={goToPrevStep}
            disabled={currentStep === 1 || isAnimating}
            className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={currentStep < TOTAL_STEPS ? goToNextStep : restartProcess}
            disabled={
              (currentStep === 1 && !client) ||
              (currentStep === 2 && serviceTypes.length === 0) ||
              (currentStep === 3 && !finalResults) ||
              isAnimating
            }
            className="bg-amber-500 hover:bg-amber-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentStep < TOTAL_STEPS ? (
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
      </div>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <motion.div
            initial={{ y: -30, opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ y: 30, opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 500, damping: 25, mass: 0.8 }}
            className="bg-black/90 border-l-4 border-yellow-500 p-6 rounded-lg shadow-2xl max-w-md mx-auto"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0, transition: { type: "spring", stiffness: 300, damping: 15 } }}
                className="mb-4 bg-amber-500/20 p-4 rounded-full"
              >
                {popupIcon}
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } }}
                className="text-white text-lg font-bold"
              >
                {popupMessage}
              </motion.p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}