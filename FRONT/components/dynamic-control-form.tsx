"use client"

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bug, Rat, SprayCan, Calculator, AlertCircle } from "lucide-react";
import { Session } from "next-auth";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
    type ServiceType,
    type ClientData,
    type UnifiedResultData,
    type AllServiceDetails
} from "./types";

import CommonPropertyFields from "./form-sections/common-property-fields";
import OperationalFields from "./form-sections/operational-fields";
import TermiteFields from "./form-sections/termite-fields";
import RatFields from "./form-sections/rat-fields";
import GeneralPestFields from "./form-sections/gpc-fields";
import InspectionFields from "./form-sections/inspection-fields";
import PreparationFields, { rcTreatments, gpcTreatments } from "./form-sections/preparation-fields";


const autoCalcChemicals = [
    "Expose Soil Treatent per Liter Larutan",
    "Premise Soil Treatent per Liter Larutan",
    "Agenda Soil Treatent per Liter Larutan",
];

const autoCalcTreatments: (AllServiceDetails['TC']['treatment'])[] = [
    'Inject_Spraying', 'Spraying', 'Pipanasi', 'Refill_Pipanasi'
];

interface DynamicControlFormProps {
    client: ClientData | null;
    session: Session | null;
    serviceTypes: ServiceType[];
    onFormSubmit: (hasil: UnifiedResultData) => void;
}

const serviceConfig: Record<ServiceType, { color: string; icon: JSX.Element }> = {
    TC: { color: 'amber', icon: <Bug /> },
    RC: { color: 'blue', icon: <Rat /> },
    GPC: { color: 'green', icon: <SprayCan /> },
    GPRC: { color: 'purple', icon: <SprayCan /> },
};

export default function DynamicControlForm({ client, session, serviceTypes, onFormSubmit }: DynamicControlFormProps) {
    const [formData, setFormData] = useState<AllServiceDetails>({
        common: { luasTanah: 100, jarakTempuh: 10, transport: 'mobil', jumlahLantai: 1, monitoringPerBulan: 1, preparationSet: {}, additionalSet: {}, },
        TC: { treatment: 'Inject_Spraying', status: 'Aman' }, RC: {}, GPC: {}, GPRC: {}
    });

    const [inspectionData, setInspectionData] = useState<UnifiedResultData['inspection']>({
        dateTime: new Date().toLocaleString('id-ID'),
        images: [],
        summary: "Berdasarkan inspeksi, ditemukan beberapa titik aktivitas hama.",
        recommendation: "Direkomendasikan penanganan sesuai dengan SOP dan monitoring berkala."
    });

    const [validationError, setValidationError] = useState<string | null>(null);

    const handleDetailChange = <T extends keyof AllServiceDetails>(section: T, field: keyof AllServiceDetails[T], value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleInspectionChange = (field: keyof UnifiedResultData['inspection'], value: any) => {
        setInspectionData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!formData.common.lokasiRumah?.trim()) {
            setValidationError("Alamat properti tidak boleh kosong.");
            return;
        }

        // Validate TC chemical selection for non-baiting treatments
        if (serviceTypes.includes('TC') && formData.TC?.treatment !== 'Baiting') {
            const selectedChemicals = Object.keys(formData.common.preparationSet || {}).filter(item =>
                autoCalcChemicals.includes(item)
            );
            if (selectedChemicals.length === 0) {
                setValidationError("Untuk treatment Termite Control (selain Baiting), Anda harus memilih minimal satu chemical: Expose, Agenda, atau Premise Soil Treatment.");
                return;
            }
        }

        const finalDetails: AllServiceDetails = {
            common: formData.common,
            TC: {},
            RC: {},
            GPC: {},
            GPRC: {}
        };

        if (serviceTypes.includes('TC')) finalDetails.TC = formData.TC;
        if (serviceTypes.includes('RC')) finalDetails.RC = formData.RC;
        if (serviceTypes.includes('GPC')) finalDetails.GPC = formData.GPC;
        if (serviceTypes.includes('GPRC')) {
            finalDetails.GPRC = {
                ...formData.GPC,
                ...formData.RC
            };
        }


        const finalResult: UnifiedResultData = {
            serviceTypes: serviceTypes,
            client: client,
            agentName: session?.user?.name ?? 'N/A',
            inspection: inspectionData,
            details: finalDetails,
        };

        onFormSubmit(finalResult);
    }

    const primaryService = serviceTypes[0];
    const themeColor = serviceConfig[primaryService]?.color || 'yellow';

    const themeClasses = {
        border: {
            amber: 'border-amber-500', blue: 'border-blue-500',
            green: 'border-green-500', purple: 'border-purple-500',
            yellow: 'border-yellow-500',
        }[themeColor],
        borderDashed: {
            amber: 'border-amber-800/50', blue: 'border-blue-800/50',
            green: 'border-green-800/50', purple: 'border-purple-800/50',
            yellow: 'border-yellow-800/50',
        }[themeColor],
        bg: {
            amber: 'bg-amber-500 hover:bg-amber-600', blue: 'bg-blue-500 hover:bg-blue-600',
            green: 'bg-green-500 hover:bg-green-600', purple: 'bg-purple-500 hover:bg-purple-600',
            yellow: 'bg-yellow-500 hover:bg-yellow-600',
        }[themeColor],
    };

    const isTermiteService = serviceTypes.includes('TC');
    const isAutoCalcTriggered = isTermiteService && autoCalcTreatments.includes(formData.TC?.treatment);
    const itemsWithHiddenQuantity = isAutoCalcTriggered
        ? new Set(autoCalcChemicals)
        : new Set<string>();

    const activeRcTreatments = (formData.RC?.treatment || []).reduce((acc, treatmentName) => {
        if (rcTreatments[treatmentName as keyof typeof rcTreatments]) {
            acc[treatmentName] = rcTreatments[treatmentName as keyof typeof rcTreatments];
        }
        return acc;
    }, {} as Record<string, string[]>);

    const activeGpcTreatments = (formData.GPC?.treatment || []).reduce((acc, treatmentName) => {
        if (gpcTreatments[treatmentName as keyof typeof gpcTreatments]) {
            acc[treatmentName] = gpcTreatments[treatmentName as keyof typeof gpcTreatments];
        }
        return acc;
    }, {} as Record<string, string[]>);
    return (
        <Card className={`p-6 bg-black/90 text-white space-y-8 border-l-4 ${themeClasses.border}`}>
            <div className="flex items-center gap-2">
                {serviceTypes.map(st => <span key={st} className={`text-${serviceConfig[st].color}-500`}>{serviceConfig[st].icon}</span>)}
                <h2 className="text-xl font-bold headline">
                    Formulir Pengendalian Hama ({serviceTypes.join(' & ')})
                </h2>
            </div>

            <CommonPropertyFields data={formData.common} onChange={(field, value) => handleDetailChange('common', field, value)} />
            <div className={`border-t-2 border-dashed ${themeClasses.borderDashed} my-8`}></div>

            {serviceTypes.includes('TC') && (
                <>
                    <TermiteFields data={formData.TC} onChange={(field, value) =>
                        handleDetailChange('TC', field as keyof AllServiceDetails['TC'], value)
                    } />
                    <div className={`border-t-2 border-dashed ${themeClasses.borderDashed} my-8`}></div>
                </>
            )}
            {(serviceTypes.includes('RC') || serviceTypes.includes('GPRC')) && (
                <>
                    <RatFields data={formData.RC} onChange={(field, value) =>
                        handleDetailChange('RC', field as keyof AllServiceDetails['RC'], value)
                    } />
                    <div className={`border-t-2 border-dashed ${themeClasses.borderDashed} my-8`}></div>
                </>
            )}
            {(serviceTypes.includes('GPC') || serviceTypes.includes('GPRC')) && (
                <>
                    <GeneralPestFields data={formData.GPC} onChange={(field, value) =>
                        handleDetailChange('GPC', field as keyof AllServiceDetails['GPC'], value)
                    } />
                    <div className={`border-t-2 border-dashed ${themeClasses.borderDashed} my-8`}></div>
                </>
            )}
            <PreparationFields
                preparationData={formData.common.preparationSet || {}}
                additionalData={formData.common.additionalSet || {}}
                onChange={handleDetailChange}
                serviceTypes={serviceTypes}
                themeColor={themeColor}
                itemsWithHiddenQuantity={itemsWithHiddenQuantity}
                activeRcTreatments={activeRcTreatments}
                activeGpcTreatments={activeGpcTreatments}
            />
            <div className={`border-t-2 border-dashed ${themeClasses.borderDashed} my-8`}></div>
            <OperationalFields data={formData.common} onChange={(field, value) =>
                handleDetailChange('common', field as keyof AllServiceDetails['common'], value)
            } />
            <div className={`border-t-2 border-dashed ${themeClasses.borderDashed} my-8`}></div>

            <InspectionFields data={inspectionData} onChange={handleInspectionChange} session={session} themeColor={themeColor} />

            <Button onClick={handleSubmit} className={`w-full ${themeClasses.bg} text-black font-bold text-lg py-6`}>
                <Calculator className="mr-2 h-5 w-5" />
                Lanjutkan
            </Button>

            <AlertDialog open={!!validationError} onOpenChange={() => setValidationError(null)}>
                <AlertDialogContent className="bg-black/95 border-red-500 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                            <AlertCircle className="h-5 w-5" />
                            Validasi Form
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-white/90">
                            {validationError}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white">
                            Mengerti
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}