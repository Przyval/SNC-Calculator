"use client"

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Rat } from "lucide-react";
import { AllServiceDetails } from "../types";

const rcTreatmentOptions = [
  "Bait Trap - PP.Tray",
  "Bait Trap - Blackbox",
  "Bait Trap Perangkap Massal",
  "Perangkap Lem - Glue Box Segitiga"
];

interface RatFieldsProps {
  data: AllServiceDetails['RC'];
  onChange: (field: keyof AllServiceDetails['RC'], value: any) => void;
}

export default function RatFields({ data, onChange }: RatFieldsProps) {
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

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Rat className="h-6 w-6 text-blue-500" />
        <h2 className="text-xl font-bold headline">Detail Spesifik: Rodent Control</h2>
      </div>
      <div className="space-y-6">
        
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div>
            <Label>Jenis Treatment (Bisa lebih dari satu)</Label>
            <div className="mt-2 space-y-3 p-3 bg-black/40 rounded-md max-h-48 overflow-y-auto">
              {rcTreatmentOptions.map(treatmentName => (
                <div key={treatmentName} className="flex items-center">
                  <Checkbox
                    id={`rc-treat-${treatmentName}`}
                    checked={data?.treatment?.includes(treatmentName)}
                    onCheckedChange={(checked) => handleTreatmentToggle(treatmentName, checked)}
                    className="border-blue-400"
                  />
                  <label htmlFor={`rc-treat-${treatmentName}`} className="ml-3 text-sm font-medium leading-none cursor-pointer">
                    {treatmentName}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label>Tingkat Infestasi</Label>
              <Select value={data?.tingkatInfestasi || 'Sedang'} onValueChange={(v) => onChange('tingkatInfestasi', v)}>
                <SelectTrigger className="mt-2 bg-black/50 border-blue-600"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black text-white border-blue-600">
                  <SelectItem value="Rendah">Rendah</SelectItem>
                  <SelectItem value="Sedang">Sedang</SelectItem>
                  <SelectItem value="Tinggi">Tinggi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rekomendasi-sanitasi">Rekomendasi Sanitasi</Label>
              <Textarea 
                id="rekomendasi-sanitasi"
                value={data?.rekomendasiSanitasi || ''}
                onChange={(e) => onChange('rekomendasiSanitasi', e.target.value)}
                className="mt-2 bg-black/50 border-blue-600"
                placeholder="Contoh: Tutup semua sumber makanan dan perbaiki lubang di dinding..."
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}