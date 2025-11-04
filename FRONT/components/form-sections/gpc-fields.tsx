"use client"

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SprayCan } from "lucide-react";
import { AllServiceDetails } from "../types";

const gpcTreatmentOptions = [
  "Spray-Out (Fogging)", "Spray-In (ULV)", "Residual", "Bait Trap (Lalat)",
  "Bait Trap (Kecoa & Semut)", "Pohon Lalat (Lalat)", "Hoy Hoy (Kecoa)",
  "Larvacida (Nyamuk)", "Insect Light Trap", "Cat"
];

const targetHamaOptions = [
  "Kecoa", "Semut", "Nyamuk", "Lalat", "Biawak", "Musang", "Lainnya"
];

interface GeneralPestFieldsProps {
  data: AllServiceDetails['GPC'];
  onChange: (field: keyof AllServiceDetails['GPC'], value: any) => void;
}

export default function GeneralPestFields({ data, onChange }: GeneralPestFieldsProps) {
  const handleTreatmentToggle = (treatmentName: string, checked: boolean | 'indeterminate') => {
    const currentTreatments = data?.treatment || [];
    let newTreatments: string[];

    if (checked) {
      newTreatments = [...currentTreatments, treatmentName];
    } else {
      newTreatments = currentTreatments.filter(t => t !== treatmentName);
    }
    onChange('treatment', newTreatments);
  };

  const handleTargetHamaToggle = (hamaName: string, checked: boolean | 'indeterminate') => {
    const currentTargets = data?.targetHama || [];
    let newTargets: string[];

    if (checked) {
      newTargets = [...currentTargets, hamaName];
    } else {
      newTargets = currentTargets.filter(h => h !== hamaName);
    }
    onChange('targetHama', newTargets);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <SprayCan className="h-6 w-6 text-green-500" />
        <h2 className="text-xl font-bold headline">Detail Spesifik: General Pest Control</h2>
      </div>

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <div>
              <Label>Target Hama (Bisa lebih dari satu)</Label>
              <div className="mt-2 space-y-3 p-3 bg-black/40 rounded-md max-h-48 overflow-y-auto">
                {targetHamaOptions.map(hamaName => (
                  <div key={hamaName} className="flex items-center">
                    <Checkbox
                      id={`hama-${hamaName}`}
                      checked={data?.targetHama?.includes(hamaName)}
                      onCheckedChange={(checked) => handleTargetHamaToggle(hamaName, checked)}
                      className="border-green-400"
                    />
                    <label htmlFor={`hama-${hamaName}`} className="ml-3 text-sm font-medium leading-none cursor-pointer">
                      {hamaName}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label>Jenis Treatment (Bisa lebih dari satu)</Label>
              <div className="mt-2 space-y-3 p-3 bg-black/40 rounded-md max-h-48 overflow-y-auto">
                {gpcTreatmentOptions.map(treatmentName => (
                  <div key={treatmentName} className="flex items-center">
                    <Checkbox
                      id={`gpc-treat-${treatmentName}`}
                      checked={data?.treatment?.includes(treatmentName)}
                      onCheckedChange={(checked) => handleTreatmentToggle(treatmentName, checked)}
                      className="border-green-400"
                    />
                    <label htmlFor={`gpc-treat-${treatmentName}`} className="ml-3 text-sm font-medium leading-none cursor-pointer">
                      {treatmentName}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="gpc-status">Status Temuan (GPC)</Label>
            <Select
              value={data?.status || 'Terdeteksi Hama'}
              onValueChange={(v) => onChange('status', v as AllServiceDetails['GPC']['status'])}
            >
              <SelectTrigger id="gpc-status" className="mt-2 bg-black/50 border-green-600"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-black text-white border-green-600">
                <SelectItem value="Aman">Aman</SelectItem>
                <SelectItem value="Terdeteksi Hama">Terdeteksi Hama</SelectItem>
                <SelectItem value="Butuh Pencegahan">Butuh Pencegahan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="area-aplikasi">Area Aplikasi</Label>
            <Input id="area-aplikasi" value={data?.areaAplikasi || ''} onChange={(e) => onChange('areaAplikasi', e.target.value)} className="mt-2 bg-black/50 border-green-600" placeholder="Contoh: Seluruh area indoor dan outdoor" />
          </div>
        </div>
      </div>
    </div>
  )
}