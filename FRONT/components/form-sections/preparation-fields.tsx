"use client"

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AllServiceDetails, ServiceType } from "../types";
import { Wrench, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PreparationFieldsProps {
    preparationData: Record<string, number>;
    additionalData: Record<string, number>;
    onChange: <T extends keyof AllServiceDetails>(
        section: T,
        field: keyof AllServiceDetails[T],
        value: any
    ) => void;
    serviceTypes: ServiceType[];
    themeColor: string;
    itemsWithHiddenQuantity?: Set<string>;
    activeRcTreatments: Record<string, string[]>;
    activeGpcTreatments: Record<string, string[]>;
}

export const termitePreparationItems = [
    "Expose Soil Treatent per Liter Larutan", "Premise Soil Treatent per Liter Larutan",
    "Agenda Soil Treatent per Liter Larutan", "Xterm AG Station", "Xterm IG Station",
    "Expose Wood Treatent per Liter Larutan", "Queen Killer", "Mata Bor kayu 2mm",
    "Mata Bor kayu 3mm", "Mata bor Hilti 6mm", "Mata Bor Hilti 8mm",
    "Mata Bor Hilti 10mm", "Semen Warna", "Premium", "Oli Fastron 10W-40SL", "Jarum B&G",
];

export const rcTreatments = {
    "Bait Trap - PP.Tray": ["Unit PP Tray", "Racumin Unit PP Tray"],
    "Bait Trap - Blackbox": ["Unit Black Box", "Racumin Block Black Box"],
    "Bait Trap Perangkap Massal": ["Unit Block Perangkap Masal", "Racumin Block Perangkap Masal"],
    "Perangkap Lem - Glue Box Segitiga": ["Unit Glue Box Segitiga", "Racumin Glue Box Segitiga"]
};

export const gpcTreatments = {
    "Spray-Out (Fogging)": ["SMASH 100 EC Fogging per Liter Larutan", "Clearmos Fogging per Liter Larutan", "Storin Fogging per Liter Larutan (White Oil)", "K Othrine Fogging per Liter Larutan"],
    "Spray-In (ULV)": ["CLEARMOS ULV PER LITER LARUTAN", "K OTHRINE ULV PER LITER LARUTAN"],
    "Residual": ["Lavender per Liter Larutan", "Agenda RSD Semut/Rayap per Liter Larutan", "Storin per Liter Larutan", "TENOPA RSD Kecoa Jerman", "K OTHRINE per Liter Larutan"],
    "Bait Trap (Lalat)": ["Flygard Bait Lalat", "Agita WG Bait Lalat"],
    "Bait Trap (Kecoa & Semut)": ["Blattanex Gel Bait trap", "Max Force Quantum Gel Semut"],
    "Pohon Lalat (Lalat)": ["Pohon Lalat"],
    "Hoy Hoy (Kecoa)": ["Hoy Hoy (Kecoa)"],
    "Larvacida (Nyamuk)": ["Vectobac Larvasida", "Abate Larvasida"],
    "Insect Light Trap": ["Fly Catcher", "Blackhole"],
    "Cat": ["Cat Trap", "Conant"]
};


const additionalSetItems = [
    "Masker untuk Klien", "Company Profile", "Laporan/SPK/Surat/Kontrak", "BAP", "LOG BOOK",
];

export default function PreparationFields({ preparationData, additionalData, onChange, serviceTypes, themeColor, itemsWithHiddenQuantity = new Set(), activeRcTreatments, activeGpcTreatments }: PreparationFieldsProps) {
    const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

    const toggleAccordion = (category: string) => {
        setOpenAccordions(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const themeClasses = {
        border: { amber: 'border-amber-600', blue: 'border-blue-600', green: 'border-green-600', purple: 'border-purple-600', yellow: 'border-yellow-600' }[themeColor] || 'border-gray-600',
        text: { amber: 'text-amber-500', blue: 'text-blue-500', green: 'text-green-500', purple: 'text-purple-500', yellow: 'text-yellow-500' }[themeColor] || 'text-gray-500',
        checkbox: { amber: 'border-amber-400', blue: 'border-blue-400', green: 'border-green-400', purple: 'border-purple-400', yellow: 'border-yellow-400' }[themeColor] || 'border-gray-400',
    };

    const handlePreparationChange = (item: string, value: number | null) => {
        const newSet = { ...preparationData };
        if (value === null) {
            delete newSet[item];
        } else {
            newSet[item] = value;
        }
        onChange('common', 'preparationSet', newSet);
    };

    const handleAdditionalChange = (item: string, value: number | null) => {
        const newSet = { ...additionalData };
        if (value === null) {
            delete newSet[item];
        } else {
            newSet[item] = value;
        }
        onChange('common', 'additionalSet', newSet);
    };

    const renderChecklistItem = (item: string, isPrep: boolean) => {
        const data = isPrep ? preparationData : additionalData;
        const handler = isPrep ? handlePreparationChange : handleAdditionalChange;
        const shouldHideQuantity = isPrep && itemsWithHiddenQuantity.has(item);
        return (
            <div key={item} className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center flex-1 pr-4">
                    <Checkbox
                        id={`${isPrep ? 'prep' : 'add'}-${item}`}
                        checked={item in data}
                        onCheckedChange={(checked) => handler(item, checked ? 1 : null)}
                    />
                    <label htmlFor={`${isPrep ? 'prep' : 'add'}-${item}`} className="ml-3 text-sm font-medium leading-none cursor-pointer">
                        {item}
                    </label>
                </div>
                {!shouldHideQuantity && (
                    <Input
                        type="number"
                        min="1"
                        value={data[item] || ''}
                        onChange={(e) => handler(item, parseInt(e.target.value, 10))}
                        disabled={!(item in data)}
                        className={`w-20 bg-black/50 border-gray-600 h-8 text-white disabled:opacity-50`}
                        placeholder="Qty"
                    />
                )}
            </div>
        )
    };

    const renderAccordion = (title: string, treatments: Record<string, string[]>) => (
        <div className="mt-4">
            <h4 className={`font-semibold ${themeClasses.text} mb-2`}>{title}</h4>
            <div className="space-y-2">
                {Object.entries(treatments).map(([category, items]) => (
                    <div key={category} className="bg-black/40 rounded-md">
                        <button
                            onClick={() => toggleAccordion(category)}
                            className="w-full flex justify-between items-center p-3 text-left font-semibold"
                        >
                            <span>{category}</span>
                            <ChevronDown className={`transform transition-transform duration-200 ${openAccordions[category] ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {openAccordions[category] && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-3 border-t border-white/10">
                                        {items.map(item => renderChecklistItem(item, true))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    );


    const showTermiteSet = serviceTypes.includes('TC');
    const showRCSet = Object.keys(activeRcTreatments).length > 0;
    const showGPCSet = Object.keys(activeGpcTreatments).length > 0;

    return (
        <div>
            <div className={`flex items-center gap-2 mb-6 ${themeClasses.text}`}>
                <Wrench className="h-6 w-6" />
                <h2 className="text-xl font-bold headline text-white">Perlengkapan & Logistik</h2>
            </div>
            <div className="space-y-8">
                {(showTermiteSet || showRCSet || showGPCSet) && (
                    <div>
                        <h3 className="text-white text-lg font-semibold">Preparation Set</h3>
                        <p className="text-sm text-white/70 mb-3">Pilih item yang dibutuhkan untuk persiapan treatment.</p>

                        {showTermiteSet && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-amber-400 mb-2">Untuk Termite Control</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-black/40 rounded-md">
                                    {termitePreparationItems.map(item => renderChecklistItem(item, true))}
                                </div>
                            </div>
                        )}

                        {showRCSet && renderAccordion("Rodent Control Treatments", activeRcTreatments)}
                        {showGPCSet && renderAccordion("General Pest Control Treatments", activeGpcTreatments)}
                    </div>
                )}

                <div>
                    <h3 className="text-white text-lg font-semibold">Additional Set</h3>
                    <p className="text-sm text-white/70 mb-3">Pilih item tambahan dan tentukan jumlah.</p>
                    <div className="space-y-2 p-3 bg-black/40 rounded-md">
                        {additionalSetItems.map(item => renderChecklistItem(item, false))}
                    </div>
                </div>
            </div>
        </div>
    );
}