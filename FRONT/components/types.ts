export type ServiceType = 'TC' | 'RC' | 'GPC' | 'GPRC';

export interface InspectionImage {
  url: string;
  description: string;
  detectedObjects?: {
    box_2d: [number, number, number, number];
    label: string;
  }[];
}

interface CommonDetails {
  lokasiRumah?: string;
  luasTanah?: number;
  transport?: 'mobil' | 'motor';
  jarakTempuh?: number;
  jumlahLantai?: number;
  monitoringPerBulan?: number;
  preparationSet?: Record<string, number>;
  additionalSet?: Record<string, number>;
}

interface TermiteDetails {
  treatment?: 'Inject_Spraying' | 'Baiting' | 'Spraying' | 'Pipanasi' | 'Refill_Pipanasi';
  status?: 'Aman' | 'Terdeteksi Rayap' | 'Butuh Pencegahan';
}

interface RatDetails {
  tingkatInfestasi?: 'Rendah' | 'Sedang' | 'Tinggi';
  treatment?: string[];
  rekomendasiSanitasi?: string;
}

interface GeneralPestDetails {
  targetHama?: string[];
  areaAplikasi?: string;
  bahanAktifKimia?: string;
  treatment?: string[];
  status?: 'Aman' | 'Terdeteksi Hama' | 'Butuh Pencegahan';
}

export interface AllServiceDetails {
  common: CommonDetails;
  TC: TermiteDetails;
  RC: RatDetails;
  GPC: GeneralPestDetails;
  GPRC: GeneralPestDetails & RatDetails;
}

export interface UnifiedResultData {
  serviceTypes: ServiceType[];
  client: ClientData | null;
  agentName: string;
  inspection: {
    dateTime: string;
    images: InspectionImage[];
    summary: string;
    recommendation: string;
  };
  details: AllServiceDetails;
}

export interface ClientData {
  id: number | null;
  name: string;
  email?: string;
  phone_number?: string;
  client_type?: {
    id: number;
    name: string;
  };
}