<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Schema::create('risk_calculations', function (Blueprint $table) {
        //     $table->id();
        //     $table->foreignId('client_id')->constrained()->onDelete('cascade');
        //     $table->foreignId('user_id')->constrained()->onDelete('cascade');
        //     $table->float('luasTanah');
        //     $table->integer('umurBangunan');
        //     // $table->string('lokasiRumah'); buang
        //     $table->string('materialBangunan');
        //     $table->string('riwayatRayap');
        //     $table->float('tingkatKelembaban');
        //     $table->integer('jumlahPerabotKayu');
        //     // $table->string('adaDanauSebelumnya');
        //     $table->string('adaLahanKosongDisekitar');
        //     // $table->string('jenisTanah');
        //     $table->string('jenisLantai');

        //     // Calculated fields
        //     $table->integer('skorRisiko');
        //     $table->string('kategoriRisiko');
        //     $table->bigInteger('estimasiKerugian');
        //     $table->string('rekomendasiLayanan');

        //     $table->string('selected_kecamatan_name');
        //     $table->string('selected_kecamatan_risk_level');
        //     $table->timestamps();
        // });
        Schema::create('risk_calculations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Renamed from camelCase to snake_case
            $table->float('luas_tanah');
            $table->integer('umur_bangunan');
            $table->string('lokasi_rumah');
            $table->string('material_bangunan');
            $table->string('riwayat_rayap');
            $table->float('tingkat_kelembaban');
            $table->integer('jumlah_perabot_kayu');
            $table->string('ada_lahan_kosong_disekitar');
            $table->string('jenis_lantai');

            // Calculated fields - also renamed to snake_case
            $table->integer('skor_risiko');
            $table->string('kategori_risiko');
            $table->bigInteger('estimasi_kerugian');
            $table->string('rekomendasi_layanan');

            // These were already correct, left as is
            $table->string('selected_kecamatan_name');
            $table->string('selected_kecamatan_risk_level');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('risk_calculations');
    }
};
