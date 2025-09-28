<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Intervention\Image\Laravel\Facades\Image;
use PhpOffice\PhpWord\TemplateProcessor;
use App\Services\ExcelCalculationService;

class ProposalController extends Controller
{
    public function __construct(private ExcelCalculationService $calculationService)
    {
    }
    public function generate(Request $request)
    {
        Log::info($request->all());
        $rules = [
            'client_name' => 'required|string',
            'address' => 'required|string',
            'service_type' => 'required|string',
            'area_treatment' => 'required|numeric',
            'floor_count' => 'required|integer',
            'distance_km' => 'required|numeric',
            'transport' => 'required|in:mobil,motor',
            'monitoring_duration_months' => 'required|integer',
            'preparation_set_items' => 'present|array',
            'additional_set_items' => 'present|array',
            'images' => 'nullable|array',
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            Log::error('Proposal generation validation failed.', $validator->errors()->toArray());
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }
        $validated = $validator->validated();
        $serviceDataForCalculation = [
            'luasTanah' => $validated['area_treatment'],
            'jarakTempuh' => $validated['distance_km'],
            'jumlahLantai' => $validated['floor_count'],
            'monitoringPerBulan' => $validated['monitoring_duration_months'],
            'preparationSet' => $validated['preparation_set_items'],
            'additionalSet' => $validated['additional_set_items'],
            'client_name' => $validated['client_name'],
            'address' => $validated['address'],
            'transport' => $validated['transport'],
        ];
        $finalPrice = 0;
        try {
            $finalPrice = $this->calculationService->getCalculatedPrice($serviceDataForCalculation);
            Log::info('Successfully calculated final price from Excel service: ' . $finalPrice);
        } catch (\Exception $e) {
            Log::error('Could not calculate price from Excel Service: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to calculate the price from the backend engine.'], 500);
        }
        $roundedPrice = round($finalPrice);
        $validated['final_price_raw'] = $roundedPrice;
        $validated['final_price'] = 'Rp ' . number_format($roundedPrice, 0, ',', '.');
        $proposalType = $request->get('proposal_type', 'pest_control');
        $serviceType = in_array($validated['service_type'], ['pipanasi', 'inject_spraying', 'spraying', 'baiting', 'refill_pipanasi'])
            ? $validated['service_type'] : 'spraying';
        $templatePath = storage_path("app/templates/{$serviceType}.docx");

        if (!file_exists($templatePath)) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $template = new TemplateProcessor($templatePath);

        $this->fillGeneralAttributes($template, $validated, $serviceType);

        $this->fillServiceSpecificAttributes($template, $serviceType, $validated);

        $this->processImages($template, $validated['images'] ?? []);

        $outputFilename = $this->generateOutputFilename($proposalType, $serviceType, $validated['client_name']);
        $outputPath = storage_path("app/generated/{$outputFilename}");

        if (!file_exists(dirname($outputPath))) {
            mkdir(dirname($outputPath), 0755, true);
        }

        $template->saveAs($outputPath);

        return response()->download($outputPath)->deleteFileAfterSend(true);
    }

    private function fillGeneralAttributes(TemplateProcessor $template, array $data, string $serviceType)
    {
        $luasTanah = $data['area_treatment'];
        $time_estimation = '';
        $worker_estimation = '';

        if ($serviceType === 'baiting') {
            if ($luasTanah >= 1 && $luasTanah <= 999) {
                $time_estimation = '1 hari';
                $worker_estimation = '2 orang';
            } elseif ($luasTanah >= 1000) {
                $time_estimation = '2 hari';
                $worker_estimation = '3 orang';
            } else {
                $time_estimation = 'N/A';
                $worker_estimation = 'N/A';
            }
        } else {
            $time_estimation = $luasTanah <= 200 ? '4 hari' : ($luasTanah <= 400 ? '7 hari' : ($luasTanah <= 500 ? '10 hari' : '30 hari'));
            $worker_estimation = $luasTanah <= 300 ? '2 orang' : ($luasTanah <= 500 ? '3 orang' : '5 orang');
        }
        $generalData = [
            'number' => $data['number'] ?? $this->generateProposalNumber(),
            'type' => $data['type'] ?? 'Penawaran Harga Pest Control',
            'client_name' => $data['client_name'] ?? '',
            'address' => $data['address'] ?? '',
            'guarantee' => $data['guarantee'] ?? '1 tahun',
            'estimated_time' => $data['estimated_time'] ?? ($time_estimation . ' hari'),
            'total_technician' => $data['total_technician'] ?? ($worker_estimation . ' orang'),
        ];

        foreach ($generalData as $key => $value) {
            $template->setValue($key, $value);
        }
    }

    private function fillServiceSpecificAttributes(TemplateProcessor $template, string $serviceType, array $data)
    {
        Log::info("Inside fillServiceSpecificAttributes. The serviceType is: " . $serviceType);
        $rawPrice = $data['final_price_raw'];
        $area = $data['area_treatment'];
        switch ($serviceType) {
            case 'pipanasi':
                $pipanasiPriceRaw = $rawPrice * 1.3;
                $data['final_price'] = 'Rp ' . number_format(round($pipanasiPriceRaw), 0, ',', '.');
                $psychologicalPriceRaw = $pipanasiPriceRaw * 1.2;
                $data['psychological_price'] = 'Rp ' . number_format(round($psychologicalPriceRaw), 0, ',', '.');
                $this->fillPipanasiAttributes($template, $data);
                break;
            case 'spraying':
                $sprayingPriceRaw = $area * 12250;
                $data['final_price'] = 'Rp ' . number_format(round($sprayingPriceRaw), 0, ',', '.');
                $psychologicalPriceRaw = $sprayingPriceRaw * 1.2;
                $data['psychological_price'] = 'Rp ' . number_format(round($psychologicalPriceRaw), 0, ',', '.');
                $this->fillSprayingAttributes($template, $data);
                break;
            case 'inject_spraying':
                $psychologicalPriceRaw = $rawPrice * 1.2;
                $data['psychological_price'] = 'Rp ' . number_format(round($psychologicalPriceRaw), 0, ',', '.');
                $this->fillInjectSprayingAttributes($template, $data);
                break;
            case 'baiting':
                $psychologicalPriceRaw = $rawPrice * 1.2;
                $data['psychological_price'] = 'Rp ' . number_format(round($psychologicalPriceRaw), 0, ',', '.');
                $this->fillBaitingAttributes($template, $data);
                break;
            case 'refill_pipanasi':
                $refillPipanasiPriceRaw = $area * 33600;
                $data['final_price'] = 'Rp ' . number_format(round($refillPipanasiPriceRaw), 0, ',', '.');
                $psychologicalPriceRaw = $refillPipanasiPriceRaw * 1.2;
                $data['psychological_price'] = 'Rp ' . number_format(round($psychologicalPriceRaw), 0, ',', '.');
                $this->fillRefillPipanasi($template, $data);
                break;
        }
    }

    private function fillPipanasiAttributes(TemplateProcessor $template, array $data)
    {
        $area = $data['area_treatment'] ?? '100';
        $pipanasiData = [
            'area_treatment' => $area,
            'final_price' => $data['final_price'] ?? 'N/A',
            'psychological_price' => $data['psychological_price'] ?? 'N/A',
        ];
        foreach ($pipanasiData as $key => $value) {
            $template->setValue($key, $value);
        }
    }

    private function fillSprayingAttributes(TemplateProcessor $template, array $data)
    {
        $sprayingData = [
            'area_treatment' => $data['area_treatment'] ?? '100',
            'final_price' => $data['final_price'] ?? 'N/A',
            'psychological_price' => $data['psychological_price'] ?? 'N/A',
        ];
        foreach ($sprayingData as $key => $value) {
            $template->setValue($key, $value);
        }
    }


    private function fillInjectSprayingAttributes(TemplateProcessor $template, array $data)
    {
        $injectSprayingData = [
            'area_treatment' => $data['area_treatment'] ?? '100',
            'final_price' => $data['final_price'] ?? 'N/A',
            'psychological_price' => $data['psychological_price'] ?? 'N/A',
        ];
        foreach ($injectSprayingData as $key => $value) {
            $template->setValue($key, $value);
        }
    }

    private function fillBaitingAttributes(TemplateProcessor $template, array $data)
    {
        $baitingData = [
            'area_treatment' => $data['area_treatment'] ?? '100',
            'final_price' => $data['final_price'] ?? 'N/A',
            'psychological_price' => $data['psychological_price'] ?? 'N/A',
        ];
        foreach ($baitingData as $key => $value) {
            $template->setValue($key, $value);
        }
    }

    private function fillRefillPipanasi(TemplateProcessor $template, array $data)
    {
        $baitingData = [
            'area_treatment' => $data['area_treatment'] ?? '100',
            'final_price' => $data['final_price'] ?? 'N/A',
            'psychological_price' => $data['psychological_price'] ?? 'N/A',
        ];
        foreach ($baitingData as $key => $value) {
            $template->setValue($key, $value);
        }
    }

    private function processImages(TemplateProcessor $template, array $imageGroups)
    {
        Log::info('DATA RECEIVED IN processImages:', ['imageGroups' => $imageGroups]);
        $hasImages = !empty($imageGroups) && isset($imageGroups[0]['paths']) && !empty($imageGroups[0]['paths'][0]);

        Log::info('Image check result:', ['hasImages' => $hasImages]);
        if (!$hasImages) {
            $template->setValue('inspection_heading', '');
            $template->cloneBlock('image_block', 0);
            return;
        }

        $template->setValue('inspection_heading', 'HASIL INSPEKSI');

        $template->cloneBlock('image_block', count($imageGroups), true, true);
        $targetHeight = 300;
        $spacing = 10;
        foreach ($imageGroups as $i => $group) {
            $index = $i + 1;
            if (!is_array($group)) {
                continue;
            }
            $description = !empty($group['description']) ? $group['description'] : 'no detail';
            $template->setValue("image_desc#{$index}", $description);
            if (!empty($group['paths'])) {
                $this->processAndSetImage($template, "image_content#{$index}", $group['paths'], $index, $targetHeight, $spacing);
            } else {
                $template->setValue("image_content#{$index}", '');
            }
        }
    }


    private function processAndSetImage(TemplateProcessor $template, string $placeholder, array $imagePaths, int $index, int $targetHeight, int $spacing)
    {
        $resized = [];
        foreach ($imagePaths as $imgPath) {
            if (!is_string($imgPath) || empty($imgPath)) {
                continue;
            }

            $fullPath = public_path($imgPath);

            if (file_exists($fullPath)) {
                try {
                    // This uses the v3 Facade, which is correct
                    $img = Image::read($fullPath);
                    $img->scaleDown(null, $targetHeight);
                    $resized[] = $img;
                } catch (\Exception $e) {
                    Log::error("Could not process image: {$fullPath}. Error: " . $e->getMessage());
                    continue;
                }
            }
        }

        if ($resized) {
            $totalWidth = array_sum(array_map(fn($img) => $img->width(), $resized)) + ($spacing * (count($resized) - 1));
            $manager = new ImageManager(new Driver());

            $canvas = $manager->create($totalWidth, $targetHeight)->fill('ffffff');

            $x = 0;
            foreach ($resized as $ri) {
                $canvas->place($ri, 'top-left', $x, 0);
                $x += $ri->width() + $spacing;
            }

            $outPath = storage_path("app/public/generated/image_group_{$index}_" . time() . ".png");

            if (!file_exists(dirname($outPath))) {
                mkdir(dirname($outPath), 0755, true);
            }

            $canvas->save($outPath);

            $template->setImageValue($placeholder, [
                'path' => $outPath,
                'width' => $totalWidth,
                'height' => $targetHeight,
            ]);
        } else {
            $template->setValue($placeholder, '');
        }
    }

    private function generateProposalNumber()
    {
        $prefix = date('Y-m');
        $random = str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
        return "{$random}-SPH-PC-{$prefix}";
    }

    private function generateOutputFilename($proposalType, $serviceType, $clientName)
    {
        $cleanClientName = preg_replace('/[^A-Za-z0-9\-]/', '', str_replace(' ', '-', $clientName));
        $timestamp = date('Y-m-d_H-i-s');
        return "proposal_{$proposalType}_{$serviceType}_{$cleanClientName}_{$timestamp}.docx";
    }

    public function getAvailableServiceTypes($proposalType = 'pest_control')
    {
        $serviceTypes = [
            'pest_control' => ['pipanasi', 'spraying', 'inject_spraying'],
            'rat_control' => ['baiting', 'trapping', 'exclusion'],
        ];

        return $serviceTypes[$proposalType] ?? [];
    }

    public function getServiceTypes(Request $request)
    {
        $proposalType = $request->get('proposal_type', 'pest_control');
        $serviceTypes = $this->getAvailableServiceTypes($proposalType);

        return response()->json([
            'proposal_type' => $proposalType,
            'available_service_types' => $serviceTypes
        ]);
    }
}