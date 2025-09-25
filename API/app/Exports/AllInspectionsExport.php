<?php

namespace App\Exports;

use App\Models\RiskCalculation;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class AllInspectionsExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize
{
    /**
     * --- PERBAIKAN DI SINI ---
     *
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function query()
    {
        return RiskCalculation::query()->with(['client', 'user', 'inspection']);
    }

    /**
     * @return array
     */
    public function headings(): array
    {
        return [
            'ID Kalkulasi', 'Nama Klien', 'Nama Agen', 'Tanggal Input',
            'Luas Tanah (m2)', 'Umur Bangunan (Tahun)', 'Material Bangunan', 'Riwayat Rayap',
            'Tingkat Kelembaban (%)', 'Jumlah Perabot Kayu', 'Ada Lahan Kosong', 'Jenis Lantai',
            'Skor Risiko (Kalkulasi)', 'Kategori Risiko',
            'Estimasi Kerugian (IDR)', 'Rekomendasi Layanan', 'Status Inspeksi',
            'Saran Treatment Inspeksi', 'Tanggal Inspeksi', 'Kesimpulan Inspeksi', 'Rekomendasi Inspeksi',
        ];
    }

    /**
     * @param mixed $calculation
     * @return array
     */
    public function map($calculation): array
    {
        return [
            $calculation->id,
            $calculation->client->name ?? 'N/A',
            $calculation->user->name ?? 'N/A',
            $calculation->created_at->format('d-m-Y H:i'),
            
            $calculation->luas_tanah ?? 'N/A',
            $calculation->umur_bangunan ?? 'N/A',
            $calculation->material_bangunan ?? 'N/A',
            $calculation->riwayat_rayap ?? 'N/A',
            $calculation->tingkat_kelembaban ?? 'N/A',
            $calculation->jumlah_perabot_kayu ?? 'N/A',
            $calculation->ada_lahan_kosong_disekitar ?? 'N/A',
            $calculation->jenis_lantai ?? 'N/A',
            // $calculation->selected_kecamatan_name ?? 'N/A',
            // $calculation->selected_kecamatan_risk_level ?? 'N/A',
            $calculation->skor_risiko ?? 'N/A',
            $calculation->kategori_risiko ?? 'N/A',
            $calculation->estimasi_kerugian ?? 'N/A',
            $calculation->rekomendasi_layanan ?? 'N/A',

            optional($calculation->inspection)->status,
            optional($calculation->inspection)->treatment,
            optional($calculation->inspection)->date_time,
            optional($calculation->inspection)->summary,
            optional($calculation->inspection)->recommendation,
        ];
    }
}