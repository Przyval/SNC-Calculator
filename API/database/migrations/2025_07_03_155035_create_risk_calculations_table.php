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

            $table->string('transport');
            $table->float('jarak_tempuh');
            $table->integer('jumlah_lantai');
            $table->integer('monitoring_per_bulan');
            $table->bigInteger('final_price')->comment('The calculated final price from the Excel service, stored as a whole number.');
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
