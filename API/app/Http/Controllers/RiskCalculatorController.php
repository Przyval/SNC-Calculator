<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RiskCalculatorController extends Controller
{
    public function calculate(Request $request)
    {
        Log::info("Risk calculation request received", ['request_data' => $request->all()]);
        $data = $request->validate([
            'luasTanah' => 'required|numeric',
            'umurBangunan' => 'required|numeric',
            'lokasiRumah' => 'required|string',
            'materialBangunan' => 'required|string',
            'riwayatRayap' => 'required|string',
            'tingkatKelembaban' => 'required|numeric',
            'jumlahPerabotKayu' => 'required|numeric',
            // 'adaDanauSebelumnya' => 'required|string',
            'adaLahanKosongDisekitar' => 'required|string',
            // 'jenisTanah' => 'required|string',
            'jenisLantai' => 'required|string',
        ]);

        $skor = min($data['umurBangunan'] * 4, 40);

        // if ($data['lokasiRumah'] === "dekat-air") $skor += 20;
        // elseif ($data['lokasiRumah'] === "pinggiran-kota") $skor += 15;
        // elseif ($data['lokasiRumah'] === "perkotaan") $skor += 10;

        if ($data['materialBangunan'] === "kayu-dominan") $skor += 25;
        elseif ($data['materialBangunan'] === "kayu-sedang") $skor += 15;
        elseif ($data['materialBangunan'] === "beton-dominan") $skor += 5;

        if ($data['riwayatRayap'] === "ya") $skor += 25;
        $skor += floor($data['tingkatKelembaban'] / 5);
        $skor += min(floor($data['jumlahPerabotKayu'] / 2), 15);
        // if ($data['adaDanauSebelumnya'] === "ya") $skor += 15;
        if ($data['adaLahanKosongDisekitar'] === "ya") $skor += 15;
        
        // if ($data['jenisTanah'] === "gambut") $skor += 20;
        // elseif ($data['jenisTanah'] === "berpasir") $skor += 15;
        // elseif ($data['jenisTanah'] === "liat") $skor += 10;
        // elseif ($data['jenisTanah'] === "berbatu") $skor += 5;

        $skor = min($skor, 100);

        $kategori = match (true) {
            $skor < 30 => "Rendah",
            $skor < 60 => "Sedang",
            $skor < 80 => "Tinggi",
            default => "Sangat Tinggi",
        };

        $biayaPerMeter = [
            "Rendah" => 100000,
            "Sedang" => 300000,
            "Tinggi" => 750000,
            "Sangat Tinggi" => 1500000,
        ];

        $estimasiKerugian = $data['luasTanah'] * $biayaPerMeter[$kategori];

        $rekomendasi = match (true) {
            $skor < 30 => "Pemeriksaan tahunan dan tindakan pencegahan dasar",
            $skor < 60 => "Pemeriksaan berkala (6 bulan) dan pemasangan sistem anti-rayap",
            $skor < 80 => "Pemeriksaan intensif (3 bulan) dan pemasangan sistem anti-rayap premium",
            default => "Tindakan darurat! Pemeriksaan menyeluruh dan penanganan segera",
        };

        return response()->json([
            'skorRisiko' => $skor,
            'kategoriRisiko' => $kategori,
            'estimasiKerugian' => $estimasiKerugian,
            'rekomendasiLayanan' => $rekomendasi,
        ]);
    }
}
