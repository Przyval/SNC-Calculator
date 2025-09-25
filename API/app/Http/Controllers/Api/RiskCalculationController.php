<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\RiskCalculation;
use App\Services\ExcelCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

use Maatwebsite\Excel\Facades\Excel;
use App\Exports\AllInspectionsExport;
use App\Exports\SingleInspectionExport;

class RiskCalculationController extends Controller
{
    public function __construct(private ExcelCalculationService $calculationService)
    {
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = RiskCalculation::query();
        $query->with(['client', 'user', 'inspection.images']);
        $query->latest();

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($subQuery) use ($searchTerm) {
                $subQuery->whereHas('client', function ($q) use ($searchTerm) {
                    $q->where('name', 'like', "%{$searchTerm}%");
                })->orWhereHas('user', function ($q) use ($searchTerm) {
                    $q->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }

        $calculations = $query->paginate(10);

        return response()->json($calculations);
    }

    public function exportAll()
    {
        return Excel::download(new AllInspectionsExport, 'semua_inspeksi.xlsx');
    }

    public function exportSingle(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:risk_calculations,id',
        ]);

        $calculation = RiskCalculation::with(['client', 'user', 'inspection.images'])->findOrFail($request->id);

        return Excel::download(new SingleInspectionExport($calculation), 'inspeksi_' . $calculation->client->name . '.xlsx');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Log::info($request->all());
        $riskCalculationModel = new RiskCalculation();
        $prefixedCalculatorRules = collect($riskCalculationModel->validationRules())
            ->mapWithKeys(fn($rules, $field) => ['calculatorResult.' . $field => $rules])
            ->all();
        $newCalculatorRules = [
            'calculatorResult.transport' => 'required|in:mobil,motor',
            'calculatorResult.jarakTempuh' => 'required|numeric',
            'calculatorResult.jumlahLantai' => 'required|integer',
            'calculatorResult.monitoringPerBulan' => 'required|integer',
            'calculatorResult.preparationSet' => 'present|array',
            'calculatorResult.additionalSet' => 'present|array',
        ];
        $otherRules = [
            'client.id' => 'nullable|integer|exists:clients,id',
            'client.name' => 'required|string|max:255',
            // 'kecamatan.name' => 'required|string|max:255',
            // 'kecamatan.riskLevel' => ['required', 'string', Rule::in(['rendah', 'sedang', 'tinggi'])],
            'inspection' => 'required|array',
            'inspection.dateTime' => 'required|string',
            'inspection.agentName' => 'nullable|string',
            'inspection.treatment' => 'required|string|max:255',
            'inspection.status' => 'required|string|max:255',
            'inspection.summary' => 'required|string',
            'inspection.recommendation' => 'required|string',
            'inspection.images' => 'nullable|array',
            'inspection.images.*.url' => 'required|string',
            'inspection.images.*.description' => 'nullable|string',
        ];
        $request->validate(array_merge($prefixedCalculatorRules, $newCalculatorRules, $otherRules));

        try {
            $result = DB::transaction(function () use ($request) {
                $clientData = $request->input('client');
                $calculatorResult = $request->input('calculatorResult');
                // $kecamatanData = $request->input('kecamatan');
                $inspectionData = $request->input('inspection');
                $dataForPriceCalc = [
                    'client_name' => $clientData['name'],
                    'address' => $calculatorResult['lokasiRumah'],
                    'luasTanah' => $calculatorResult['luasTanah'],
                    'jumlahLantai' => $calculatorResult['jumlahLantai'],
                    'jarakTempuh' => $calculatorResult['jarakTempuh'],
                    'transport' => $calculatorResult['transport'],
                    'monitoringPerBulan' => $calculatorResult['monitoringPerBulan'],
                    'preparationSet' => $calculatorResult['preparationSet'],
                    'additionalSet' => $calculatorResult['additionalSet'],
                ];
                $finalPrice = $this->calculationService->getCalculatedPrice($dataForPriceCalc);
                $finalPriceRaw = round($finalPrice);

                $client = Client::firstOrCreate(['name' => $clientData['name']]);

                // if (!empty($clientData['id'])) {
                //     $client = Client::findOrFail($clientData['id']);
                // } else {
                //     $client = Client::firstOrCreate(
                //         ['name' => $clientData['name']]
                //     );
                // }

                $snakeCaseCalculatorResult = [];
                foreach ($calculatorResult as $key => $value) {
                    if (is_scalar($value)) {
                        $snakeCaseCalculatorResult[Str::snake($key)] = $value;
                    }
                }
                $snakeCaseCalculatorResult['final_price'] = $finalPriceRaw;
                $riskCalculation = RiskCalculation::create(array_merge(
                    $snakeCaseCalculatorResult,
                    [
                        'client_id' => $client->id,
                        'user_id' => Auth::id(),
                        // 'selected_kecamatan_name' => $kecamatanData['name'],
                        // 'selected_kecamatan_risk_level' => $kecamatanData['riskLevel'],
                    ]
                ));
                $inspection = $riskCalculation->inspection()->create([
                    'agent_name' => $inspectionData['agentName'] ?? Auth::user()->name,
                    'date_time' => $inspectionData['dateTime'],
                    'treatment' => $inspectionData['treatment'],
                    'status' => $inspectionData['status'],
                    'summary' => $inspectionData['summary'],
                    'recommendation' => $inspectionData['recommendation'],
                ]);

                if (!empty($inspectionData['images'])) {
                    $inspection->images()->createMany($inspectionData['images']);
                }

                return $riskCalculation->load('client', 'inspection.images');
            });

            return response()->json([
                'message' => 'Risk calculation and inspection saved successfully!',
                'data' => $result
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to save risk calculation: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'An internal server error occurred while saving the data.'
            ], 500);
        }
    }


    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
