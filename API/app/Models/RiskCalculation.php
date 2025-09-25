<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RiskCalculation extends Model
{
    use HasFactory;

    // protected $fillable = [
    //     'client_id',
    //     'user_id',
    //     'luasTanah',
    //     'umurBangunan',
    //     // 'lokasiRumah',
    //     'materialBangunan',
    //     'riwayatRayap',
    //     'tingkatKelembaban',
    //     'jumlahPerabotKayu',
    //     // 'adaDanauSebelumnya',
    //     'adaLahanKosongDisekitar',
    //     // 'jenisTanah',
    //     'jenisLantai',
    //     'skorRisiko',
    //     'kategoriRisiko',
    //     'estimasiKerugian',
    //     'rekomendasiLayanan',
    //     'selected_kecamatan_name',
    //     'selected_kecamatan_risk_level',
    // ];
    protected $fillable = [
        'client_id',
        'user_id',
        'luas_tanah',
        'umur_bangunan',
        'lokasi_rumah',
        'material_bangunan',
        'riwayat_rayap',
        'tingkat_kelembaban',
        'jumlah_perabot_kayu',
        'ada_lahan_kosong_disekitar',
        'jenis_lantai',
        'skor_risiko',
        'kategori_risiko',
        'estimasi_kerugian',
        'rekomendasi_layanan',
        // 'selected_kecamatan_name',
        // 'selected_kecamatan_risk_level',
        'transport',
        'jarak_tempuh',
        'jumlah_lantai',
        'monitoring_per_bulan',
        'final_price',
    ];
    public function validationRules()
    {
        return [
            'luasTanah' => 'required|numeric',
            'umurBangunan' => 'required|integer',
            'lokasiRumah' => 'required|string',
            'materialBangunan' => 'required|string',
            'riwayatRayap' => 'required|string',
            'tingkatKelembaban' => 'required|numeric',
            'jumlahPerabotKayu' => 'required|integer',
            // 'adaDanauSebelumnya' => 'required|string',
            'adaLahanKosongDisekitar' => 'required|string',
            // 'jenisTanah' => 'required|string',
            'jenisLantai' => 'required|string',
            'skorRisiko' => 'required|integer',
            'kategoriRisiko' => 'required|string',
            'estimasiKerugian' => 'required|numeric',
            'rekomendasiLayanan' => 'required|string',
        ];
    }

    public function validationMessages()
    {
        return [];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function inspection()
    {
        return $this->hasOne(Inspection::class);
    }
}
