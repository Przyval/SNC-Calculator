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
         Schema::create('inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('risk_calculation_id')->constrained()->onDelete('cascade');
            $table->string('agent_name')->nullable();
            $table->string('date_time');
            $table->string('treatment');
            $table->string('status');
            $table->text('summary')->nullable();
            $table->text('recommendation')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inspections');
    }
};
