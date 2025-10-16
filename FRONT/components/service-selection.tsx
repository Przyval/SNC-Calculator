"use client"

import { Card } from "@/components/ui/card"
import { Bug, Rat, SprayCan, ArrowRight } from "lucide-react"

export type ServiceType = 'TC' | 'RC' | 'GPC' | 'GPRC';

interface ServiceSelectionProps {
  onServiceSelected: (service: ServiceType) => void;
}

const serviceOptions = [
  {
    type: 'TC' as ServiceType,
    title: "Termite Control (TC)",
    description: "Kalkulasi risiko dan inspeksi untuk pengendalian rayap.",
    icon: <Bug className="h-12 w-12 text-amber-500" />,
  },
  {
    type: 'RC' as ServiceType,
    title: "Rat Control (RC)",
    description: "Formulir inspeksi dan penanganan untuk pengendalian tikus.",
    icon: <Rat className="h-12 w-12 text-blue-500" />,
  },
  {
    type: 'GPC' as ServiceType,
    title: "General Pest Control (GPC)",
    description: "Formulir untuk penanganan hama umum seperti semut, kecoa, dll.",
    icon: <SprayCan className="h-12 w-12 text-green-500" />,
  },
  {
    type: 'GPRC' as ServiceType,
    title: "General Pest and Rodent Control (GPRC)",
    description: "Formulir untuk penanganan hama umum dan tikus.",
    icon: <SprayCan className="h-12 w-12 text-purple-500" />,
  },
];

export default function ServiceSelection({ onServiceSelected }: ServiceSelectionProps) {
  return (
    <Card className="p-6 bg-black/90 border-l-4 border-yellow-500 text-white shadow-lg space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold headline">Pilih Jenis Layanan</h2>
        <p className="text-white/70 mt-2">Pilih jenis pengendalian hama yang akan dilakukan.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {serviceOptions.map((service) => (
          <div
            key={service.type}
            onClick={() => onServiceSelected(service.type)}
            className="group relative p-6 bg-gray-900/50 rounded-lg border-2 border-gray-700 hover:border-amber-500 hover:bg-gray-900 transition-all duration-300 cursor-pointer transform hover:-translate-y-2"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">{service.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{service.title}</h3>
              <p className="text-sm text-white/60">{service.description}</p>
            </div>
            <ArrowRight className="absolute bottom-4 right-4 h-6 w-6 text-gray-600 group-hover:text-amber-500 transition-colors" />
          </div>
        ))}
      </div>
    </Card>
  )
}