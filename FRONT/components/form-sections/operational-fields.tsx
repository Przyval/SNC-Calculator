"use client"

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator } from "lucide-react";
import { AllServiceDetails } from "../types";

interface OperationalFieldsProps {
  data: AllServiceDetails['common'];
  onChange: (field: keyof AllServiceDetails['common'], value: any) => void;
}

export default function OperationalFields({ data, onChange }: OperationalFieldsProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="h-6 w-6 text-gray-400" />
        <h2 className="text-xl font-bold headline">Detail Operasional</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="transport">Transportasi</Label>
          <Select value={data.transport || 'mobil'} onValueChange={(value) => onChange('transport', value as 'mobil' | 'motor')}>
            <SelectTrigger id="transport" className="mt-2 bg-black/50 border-gray-600 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-black text-white border-gray-600">
              <SelectItem value="mobil">Mobil</SelectItem>
              <SelectItem value="motor">Motor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="jarak-tempuh">Jarak Tempuh (km)</Label>
          <Input type="number" id="jarak-tempuh" value={data.jarakTempuh || 10} onChange={(e) => onChange('jarakTempuh', Number(e.target.value))} className="mt-2 w-full bg-black/50 border-gray-600" />
        </div>
        <div>
          <Label htmlFor="jumlah-lantai">Jumlah Lantai</Label>
          <Input type="number" id="jumlah-lantai" value={data.jumlahLantai || 1} onChange={(e) => onChange('jumlahLantai', Number(e.target.value))} className="mt-2 w-full bg-black/50 border-gray-600" />
        </div>
        <div>
          <Label htmlFor="monitoring-per-bulan">Durasi Monitoring (Bulan)</Label>
          <Input type="number" id="monitoring-per-bulan" value={data.monitoringPerBulan || 1} onChange={(e) => onChange('monitoringPerBulan', Number(e.target.value))} className="mt-2 w-full bg-black/50 border-gray-600" />
        </div>
      </div>
    </div>
  );
}