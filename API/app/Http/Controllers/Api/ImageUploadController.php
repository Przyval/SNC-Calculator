<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\Process\Process;

class ImageUploadController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $path = $request->file('image')->store('inspections', 'public');
        $relativePath = '/storage/' . $path;

        return response()->json([
            'message' => 'Image uploaded successfully',
            'url' => $relativePath
        ], 201);
    }

    public function detectPest(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $imageFile = $request->file('image');
        $imageBase64 = base64_encode($imageFile->get());
        $mimeType = $imageFile->getMimeType();

        $apiKey = env('GEMINI_API_KEY');
        if (!$apiKey) {
            return response()->json(['description' => 'API key is not configured on the server.'], 500);
        }

        $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}";

        $detectPrompt = "Analyze this image to detect any pests (like termites, ants, cockroaches, etc.) or signs of pest activity. "
            . "Describe the findings in Indonesian. "
            . "Output ONLY A JSON object containing a single key 'description' with a string value. "
            . "Example for a positive finding: {\"description\": \"Terdeteksi: 1x Rayap, 3x Semut.\"} "
            . "Example for a negative finding: {\"description\": \"Tidak ada hama yang terdeteksi secara visual.\"} "
            . "Be concise.";

        $payload = [
            "contents" => [
                [
                    "parts" => [
                        ["text" => $detectPrompt],
                        [
                            "inline_data" => [
                                "mime_type" => $mimeType,
                                "data" => $imageBase64
                            ]
                        ]
                    ]
                ]
            ],
            "generationConfig" => [
                "response_mime_type" => "application/json"
            ]
        ];

        try {
            $response = Http::timeout(60)->post($apiUrl, $payload);

            if (!$response->successful()) {
                Log::error('Gemini API request failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return response()->json(['description' => 'Failed to analyze image with the vision service.'], $response->status() ?: 500);
            }

            $responseData = $response->json();

            $generatedJsonText = data_get($responseData, 'candidates.0.content.parts.0.text');

            if (!$generatedJsonText) {
                Log::error('Invalid response structure from Gemini', ['response' => $responseData]);
                return response()->json(['description' => 'Received an invalid response format.'], 500);
            }

            $finalResult = json_decode($generatedJsonText, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Failed to decode the inner JSON from Gemini', ['text' => $generatedJsonText]);
                return response()->json(['description' => 'Failed to parse the analysis result.'], 500);
            }

            return response()->json($finalResult);

        } catch (\Exception $e) {
            Log::error('Exception during Gemini API call', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['description' => 'An unexpected server error occurred during analysis.'], 500);
        }
    }
    public function detectAndLocatePest(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $imageFile = $request->file('image');
        $path = $imageFile->store('inspections', 'public');
        $imageUrl = Storage::url($path);

        $imageBase64 = base64_encode($imageFile->get());
        $mimeType = $imageFile->getMimeType();
        $apiKey = env('GEMINI_API_KEY');

        if (!$apiKey) {
            return response()->json(['description' => 'API key is not configured on the server.'], 500);
        }

        $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}";

        $detectPrompt = 'Give segmentation masks of any pests (like termites, ants, cockroaches, etc.) or signs of pest activity. '
            . 'Output ONLY A JSON list where each entry contains the 2D bounding box in "box_2d" '
            . 'and a text label in "label" to describe the object in Indonesian language. '
            . 'Coordinates in box_2d must be [ymin, xmin, ymax, xmax] **normalised to 1000**. '
            . 'If no pests are found, return an empty list [].';

        $payload = [
            "contents" => [
                [
                    "parts" => [
                        ["text" => $detectPrompt],
                        [
                            "inline_data" => [
                                "mime_type" => $mimeType,
                                "data" => $imageBase64
                            ]
                        ]
                    ]
                ]
            ],
            "generationConfig" => [
                "response_mime_type" => "application/json"
            ]
        ];

        try {
            $response = Http::timeout(90)->post($apiUrl, $payload);

            if (!$response->successful()) {
                Log::error('Gemini Object Detection Failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return response()->json(['description' => 'Failed to analyze image with the vision service.'], 500);
            }

            $responseData = $response->json();

            $generatedJsonText = data_get($responseData, 'candidates.0.content.parts.0.text');

            if (!$generatedJsonText) {
                Log::error('Invalid response structure from Gemini', ['response' => $responseData]);
                return response()->json(['description' => 'Received an invalid response format.'], 500);
            }

            $detectedObjects = json_decode($generatedJsonText, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Failed to decode the inner JSON from Gemini', ['text' => $generatedJsonText]);
                return response()->json(['description' => 'Failed to parse the analysis result.'], 500);
            }

            $summary = collect($detectedObjects)->countBy('label')->map(function ($count, $label) {
                return ['label' => $label, 'count' => $count];
            })->values();

            // --- 5. Return the complete data package to the frontend ---
            return response()->json([
                'imageUrl' => $imageUrl,
                'detectedObjects' => $detectedObjects,
                'summary' => $summary,
            ]);

        } catch (\Exception $e) {
            Log::error('Exception during Gemini object detection', ['message' => $e->getMessage()]);
            return response()->json(['description' => 'An unexpected server error occurred during analysis.'], 500);
        }
    }
}