<?php

namespace App\Http\Controllers;

use App\Services\ExcelCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
class PriceCalculationController extends Controller
{
    public function __construct(private ExcelCalculationService $calculationService)
    {
    }
    public function calculate(Request $request)
    {
        Log::info('API price calculation request received', $request->all());

        $validated = $request->validate([
            'client_name' => 'required|string',
            'address' => 'required|string',
            'luasTanah' => 'required|numeric',
            'jumlahLantai' => 'required|integer',
            'jarakTempuh' => 'required|numeric',
            'transport' => 'required|in:mobil,motor',
            'monitoringPerBulan' => 'required|integer',
            'preparationSet' => 'present|array',
            'additionalSet' => 'present|array',
        ]);

        try {
            $finalPrice = $this->calculationService->getCalculatedPrice($validated);

            return response()->json([
                'success' => true,
                'final_price' => $finalPrice,
                'formatted_final_price' => 'Rp ' . number_format($finalPrice, 2, ',', '.'),
            ]);

        } catch (\Exception $e) {
            Log::error('API price calculation failed: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to process the calculation.', 'details' => $e->getMessage()], 500);
        }
    }
}
