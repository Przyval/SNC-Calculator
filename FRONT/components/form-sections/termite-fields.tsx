"use client"

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bug } from "lucide-react";
import { AllServiceDetails } from "../types";

interface TermiteFieldsProps {
  data: AllServiceDetails['TC'];
  onChange: (field: keyof AllServiceDetails['TC'], value: any) => void;
}

export default function TermiteFields({ data, onChange }: TermiteFieldsProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Bug className="h-6 w-6 text-amber-500" />
        <h2 className="text-xl font-bold headline">Detail Spesifik: Termite Control</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
          <div>
              <Label htmlFor="tc-treatment">Saran Treatment (TC)</Label>
              <Select 
                  value={data?.treatment || 'Inject_Spraying'} 
                  onValueChange={(v) => onChange('treatment', v as AllServiceDetails['TC']['treatment'])}
              >
                  <SelectTrigger id="tc-treatment" className="mt-2 bg-black/50 border-amber-600"><SelectValue /></SelectTrigger>
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
              <Label htmlFor="tc-status">Status Temuan (TC)</Label>
              <Select 
                  value={data?.status || 'Aman'} 
                  onValueChange={(v) => onChange('status', v as AllServiceDetails['TC']['status'])}
              >
                  <SelectTrigger id="tc-status" className="mt-2 bg-black/50 border-amber-600"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-black text-white border-amber-600">
                      <SelectItem value="Aman">Aman</SelectItem>
                      <SelectItem value="Terdeteksi Rayap">Terdeteksi Rayap</SelectItem>
                      <SelectItem value="Butuh Pencegahan">Butuh Pencegahan</SelectItem>
                  </SelectContent>
              </Select>
          </div>
      </div>
    </div>
  )
}