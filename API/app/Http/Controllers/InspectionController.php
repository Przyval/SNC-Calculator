<?php

namespace App\Http\Controllers;

use App\Models\Inspection;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InspectionController extends Controller
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
        $validator = Validator::make($request->all(), [
            'client.id' => 'required|exists:clients,id',
            'agentName' => 'required|string',
            'serviceType' => 'required|string|in:TC,RC,GPC,GPRC',
            'inspection' => 'required|array',
            'details' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $proposalNumber = DB::transaction(function () use ($request) {
                $setting = Setting::where('key', 'last_proposal_number')->lockForUpdate()->first();

                if (!$setting) {
                    $setting = Setting::create(['key' => 'last_proposal_number', 'value' => '0']);
                }

                $newNumber = (int)$setting->value + 1;
                $setting->value = $newNumber;
                $setting->save();

                $paddedNumber = str_pad($newNumber, 3, '0', STR_PAD_LEFT);
                $serviceCode = $this->getServiceCode($request->input('serviceType'));
                $month = date('n');
                $year = date('Y');

                return "{$paddedNumber}-SPH-{$serviceCode}-{$month}-{$year}";
            });

            Inspection::create([
                'proposal_number' => $proposalNumber,
                'client_id' => $request->input('client.id'),
                'agent_name' => $request->input('agentName'),
                'service_type' => $request->input('serviceType'),
                'inspection_data' => $request->input('inspection'),
                'details_data' => $request->input('details'),
            ]);

            return response()->json([
                'message' => 'Inspection data saved successfully!',
                'proposal_number' => $proposalNumber,
            ], 201);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to save data.', 'details' => $e->getMessage()], 500);
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

    private function getServiceCode(string $serviceType): string
    {
        return match ($serviceType) {
            'TC' => 'TC',
            'RC' => 'RC',
            'GPC' => 'PC',
            'GPRC' => 'GPRC',
            default => 'GEN',
        };
    }
}
