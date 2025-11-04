<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ClientController extends Controller
{
    public function index()
    {
        return Client::with('clientType')->orderBy('name')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
   public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:clients',
            'email' => 'nullable|email|max:255',
            'phone_number' => 'nullable|string|max:255',
            'client_type' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $clientTypeId = null;
        $clientTypeInput = $request->input('client_type');

        if (is_numeric($clientTypeInput)) {
            $clientTypeId = $clientTypeInput;
        } else {
            $clientType = ClientType::firstOrCreate(['name' => $clientTypeInput]);
            $clientTypeId = $clientType->id;
        }

        $client = Client::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'phone_number' => $request->input('phone_number'),
            'client_type_id' => $clientTypeId,
        ]);

        return response()->json($client->load('clientType'), 201);
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

    public function getClientTypes()
    {
        return ClientType::orderBy('name')->get();
    }
}
