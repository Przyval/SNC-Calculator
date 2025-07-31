<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\RiskCalculation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class RiskCalculationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $riskCalculationModel = new RiskCalculation();
        $prefixedCalculatorRules = collect($riskCalculationModel->validationRules())
            ->mapWithKeys(fn($rules, $field) => ['calculatorResult.' . $field => $rules])
            ->all();

        $otherRules = [
            'client.id' => 'nullable|integer|exists:clients,id',
            'client.name' => 'required|string|max:255',
            'kecamatan.name' => 'required|string|max:255',
            'kecamatan.riskLevel' => ['required', 'string', Rule::in(['rendah', 'sedang', 'tinggi'])],
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

        $request->validate(array_merge($prefixedCalculatorRules, $otherRules));

        try {
            $result = DB::transaction(function () use ($request) {
                $clientData = $request->input('client');
                $calculatorResult = $request->input('calculatorResult');
                $kecamatanData = $request->input('kecamatan');
                $inspectionData = $request->input('inspection');
                $client = null;

                if (!empty($clientData['id'])) {
                    $client = Client::findOrFail($clientData['id']);
                } else {
                    $client = Client::firstOrCreate(
                        ['name' => $clientData['name']]
                    );
                }
                
                $riskCalculation = RiskCalculation::create(array_merge(
                    $calculatorResult,
                    [
                        'client_id' => $client->id,
                        'user_id' => Auth::id(),
                        'selected_kecamatan_name' => $kecamatanData['name'],
                        'selected_kecamatan_risk_level' => $kecamatanData['riskLevel'],
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
