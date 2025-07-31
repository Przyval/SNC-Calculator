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
            $table->float('luasTanah');
            $table->integer('umurBangunan');
            // $table->string('lokasiRumah'); buang
            $table->string('materialBangunan');
            $table->string('riwayatRayap');
            $table->float('tingkatKelembaban');
            $table->integer('jumlahPerabotKayu');
            // $table->string('adaDanauSebelumnya');
            $table->string('adaLahanKosongDisekitar');
            // $table->string('jenisTanah');
            $table->string('jenisLantai');

            // Calculated fields
            $table->integer('skorRisiko');
            $table->string('kategoriRisiko');
            $table->bigInteger('estimasiKerugian');
            $table->string('rekomendasiLayanan');

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
