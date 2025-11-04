"use client"

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { AllServiceDetails } from "../types";

interface CommonPropertyFieldsProps {
  data: AllServiceDetails['common'];
  onChange: (field: keyof AllServiceDetails['common'], value: any) => void;
}

export default function CommonPropertyFields({ data, onChange }: CommonPropertyFieldsProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="lokasi-rumah">Alamat Properti</Label>
        <Input
          id="lokasi-rumah"
          value={data.lokasiRumah || ''}
          onChange={(e) => onChange('lokasiRumah', e.target.value)}
          className="mt-2 w-full bg-black/50 border-gray-600 text-white"
          placeholder="Contoh: Jl. Sudirman No. 1, Jakarta"
        />
      </div>
      <div>
        <Label htmlFor="luas-tanah">Luas Area Treatment (m²)</Label>
        <div className="flex items-center gap-4 mt-2">
          <Slider 
            id="luas-tanah" 
            min={20} 
            max={1000} 
            step={10} 
            value={[data.luasTanah || 100]} 
            onValueChange={(v) => onChange('luasTanah', v[0])} 
          />
          <Input 
            type="number" 
            value={data.luasTanah || 100} 
            onChange={(e) => onChange('luasTanah', Number(e.target.value))} 
            className="w-24 bg-black/50 border-gray-600" 
          />
        </div>
      </div>
    </div>
  );
}