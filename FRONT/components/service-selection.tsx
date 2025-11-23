"use client"

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bug, Rat, SprayCan, ArrowRight, CheckCircle2 } from "lucide-react";

import { type ServiceType } from "./types";

interface ServiceSelectionProps {
  onServiceSelected: (services: ServiceType[]) => void;
}

const serviceOptions = [
  {
    type: 'TC' as ServiceType,
    title: "Termite Control (TC)",
    description: "Kalkulasi risiko dan inspeksi untuk pengendalian rayap.",
    icon: <Bug className="h-12 w-12 text-amber-500" />,
    color: "amber"
  },
  {
    type: 'RC' as ServiceType,
    title: "Rat Control (RC)",
    description: "Formulir inspeksi dan penanganan untuk pengendalian tikus.",
    icon: <Rat className="h-12 w-12 text-blue-500" />,
    color: "blue"
  },
  {
    type: 'GPC' as ServiceType,
    title: "General Pest Control (GPC)",
    description: "Formulir untuk penanganan hama umum seperti semut, kecoa, dll.",
    icon: <SprayCan className="h-12 w-12 text-green-500" />,
    color: "green"
  },
  {
    type: 'GPRC' as ServiceType,
    title: "General Pest and Rodent Control (GPRC)",
    description: "Formulir untuk penanganan hama umum dan tikus.",
    icon: <SprayCan className="h-12 w-12 text-purple-500" />,
    color: "purple"
  },
];

export default function ServiceSelection({ onServiceSelected }: ServiceSelectionProps) {
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);

  const handleToggleService = (serviceType: ServiceType) => {
    setSelectedServices((prevSelected) => {
      if (prevSelected.includes(serviceType)) {
        return prevSelected.filter((s) => s !== serviceType);
      }
      else {
        if (serviceType === 'TC') {
          return ['TC'];
        }
        
        const withoutTC = prevSelected.filter(s => s !== 'TC');
        
        if (serviceType === 'RC') {
          return [...withoutTC.filter(s => s !== 'GPC'), serviceType];
        }
        
        if (serviceType === 'GPC') {
          return [...withoutTC.filter(s => s !== 'RC'), serviceType];
        }
        
        if (serviceType === 'GPRC') {
          return [...withoutTC, serviceType];
        }
        
        return [...withoutTC, serviceType];
      }
    });
  };

  const isServiceDisabled = (serviceType: ServiceType) => {
    if (selectedServices.includes('TC') && serviceType !== 'TC') {
      return true;
    }
    
    if (serviceType === 'TC' && selectedServices.some(s => s !== 'TC')) {
      return true;
    }
    
    if (serviceType === 'GPC' && selectedServices.includes('RC')) {
      return true;
    }
    
    if (serviceType === 'RC' && selectedServices.includes('GPC')) {
      return true;
    }
    
    return false;
  };

  const handleContinue = () => {
    if (selectedServices.length > 0) {
      onServiceSelected(selectedServices);
    }
  };

  return (
    <Card className="p-6 bg-black/90 border-l-4 border-yellow-500 text-white shadow-lg space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold headline">Pilih Jenis Layanan</h2>
        <p className="text-white/70 mt-2">Anda dapat memilih satu atau lebih layanan untuk dibandingkan.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {serviceOptions.map((service) => {
          const isSelected = selectedServices.includes(service.type);
          const isDisabled = isServiceDisabled(service.type);
          return (
            <div
              key={service.type}
              onClick={() => !isDisabled && handleToggleService(service.type)}
              className={`
                group relative p-6 bg-gray-900/50 rounded-lg border-2 
                transition-all duration-300 transform
                ${isDisabled 
                  ? 'opacity-40 cursor-not-allowed border-gray-800'
                  : 'cursor-pointer hover:-translate-y-2'
                }
                ${isSelected 
                  ? 'border-amber-500 bg-amber-900/30'
                  : !isDisabled ? 'border-gray-700 hover:border-amber-500 hover:bg-gray-900' : 'border-gray-800'
                }
              `}
            >
              {isSelected && (
                <CheckCircle2 className="absolute top-4 right-4 h-6 w-6 text-amber-500 transition-all" />
              )}
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">{service.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{service.title}</h3>
                <p className="text-sm text-white/60">{service.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="pt-4 text-center">
        <Button
          onClick={handleContinue}
          disabled={selectedServices.length === 0}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-8 text-lg rounded-lg transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500"
        >
          Lanjutkan
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </Card>
  )
}