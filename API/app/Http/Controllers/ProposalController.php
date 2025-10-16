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
        Log::info('Proposal generation request received:', $request->all());

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
            return response()->json(['error' => 'Validation failed', 'messages' => $validator->errors()], 422);
        }

        $validated = $validator->validated();
        $serviceType = $validated['service_type'];
        $proposalType = $request->get('proposal_type', 'pest_control');

        $templatePath = storage_path("app/templates/{$serviceType}.docx");
        if (!file_exists($templatePath)) {
            Log::error("Template not found for service type: {$serviceType}");
            return response()->json(['error' => 'Template not found'], 404);
        }
        $template = new TemplateProcessor($templatePath);

        $this->fillGeneralAttributes($template, $validated, $serviceType);
        $this->processImages($template, $validated['images'] ?? []);

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
            'service_type' => $serviceType,
        ];

        try {
            $comparisonResults = $this->calculationService->getComparativePrices($serviceDataForCalculation);

            if (!empty($comparisonResults)) {
                Log::info('Filling template with comparative prices.', $comparisonResults);
                $this->fillComparativeAttributes($template, $comparisonResults, $serviceType, $validated['area_treatment']);
            } else {
                Log::info('No comparison needed. Calculating single price.');
                $basePrice = $this->calculationService->getCalculatedPrice($serviceDataForCalculation);
                $this->fillSinglePriceAttributes($template, $basePrice, $validated);
            }
        } catch (\Exception $e) {
            Log::error('Proposal generation failed during price calculation: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to calculate price and generate proposal.'], 500);
        }

        $outputFilename = $this->generateOutputFilename($proposalType, $serviceType, $validated['client_name']);
        $outputPath = storage_path("app/generated/{$outputFilename}");
        if (!file_exists(dirname($outputPath))) {
            mkdir(dirname($outputPath), 0755, true);
        }
        $this->clearUnusedPlaceholders($template);
        $template->saveAs($outputPath);

        return response()->download($outputPath)->deleteFileAfterSend(true);
    }

    private function fillComparativeAttributes(TemplateProcessor $template, array $comparisonResults, string $serviceType, float $area)
    {
        $chemicalDetails = [
            'Expose Soil Treatent per Liter Larutan' => [
                'name' => 'Expose 55 SC',
                'desc_1' => 'Bahan aktif Fipronil...',
                'desc_2' => 'Dosis 5-10 ml/L',
                'desc_3' => 'Konsentrasi 5,5 %',
                'image' => storage_path('app/templates/images/expose.png'),
                'treatment_name' => 'Pipanisasi & Spraying Chemical Expose by KRISTAL',
            ],
            'Agenda Soil Treatent per Liter Larutan' => [
                'name' => 'Agenda 25 EC',
                'desc_1' => 'Bahan aktif Fipronil',
                'desc_2' => 'Efektif membasmi rayap...',
                'desc_3' => 'Dosis 10 ml/L',
                'image' => storage_path('app/templates/images/agenda.png'),
                'treatment_name' => 'Pipanisasi & Spraying Chemical Agenda by Envu Indonesia',
            ],
            'Premise Soil Treatent per Liter Larutan' => [
                'name' => 'Premise 200 SL',
                'desc_1' => 'Bahan aktif Imidakloprid',
                'desc_2' => 'Non-repellent...',
                'desc_3' => 'Dosis 2.5 ml/L',
                'image' => storage_path('app/templates/images/premise.png'),
                'treatment_name' => 'Pipanisasi & Spraying Chemical Premise by Envu Indonesia',
            ],
        ];

        $template->cloneBlock('chemical_block', count($comparisonResults), true, true);
        $template->cloneBlock('price_block', count($comparisonResults), true, true);

        $i = 1;
        foreach ($comparisonResults as $chemicalKey => $priceData) {
            if (isset($chemicalDetails[$chemicalKey])) {
                $details = $chemicalDetails[$chemicalKey];
                $template->setValue("chem_name#{$i}", $details['name']);
                $template->setValue("chem_desc_1#{$i}", $details['desc_1']);
                $template->setValue("chem_desc_2#{$i}", $details['desc_2']);
                $template->setValue("chem_desc_3#{$i}", $details['desc_3']);
                if (file_exists($details['image'])) {
                    $template->setImageValue("chem_image#{$i}", ['path' => $details['image'], 'width' => 150]);
                }

                $basePriceForChemical = $priceData['price'];
                $adjustedPrices = $this->applyServicePriceAdjustments($serviceType, $basePriceForChemical, $area);
                Log::info("Setting price values for #{$i}", [
                    'counter' => $i,
                    'treatment_name' => $details['treatment_name'],
                    'final_price' => $adjustedPrices['final_price'],
                    'psychological_price' => $adjustedPrices['psychological_price']
                ]);
                try {
                    $template->setValue("price_block_counter#{$i}", $i);
                    $template->setValue("price_treatment_name#{$i}", $details['treatment_name']);
                    $template->setValue("price_final#{$i}", 'Rp ' . number_format($adjustedPrices['final_price'], 0, ',', '.'));
                    $template->setValue("price_psychological#{$i}", 'Rp ' . number_format($adjustedPrices['psychological_price'], 0, ',', '.'));
                    $template->setValue("price_guarantee#{$i}", '3 Tahun Garansi');

                    Log::info("Successfully set all price_block values for #{$i}");
                } catch (\Exception $e) {
                    Log::error("Failed to set price_block values for #{$i}: " . $e->getMessage());
                }

                $i++;
            }
        }
    }

    private function fillSinglePriceAttributes(TemplateProcessor $template, float $basePrice, array $data)
    {
        $adjustedPrices = $this->applyServicePriceAdjustments($data['service_type'], $basePrice, $data['area_treatment']);

        $template->setValue('final_price', 'Rp ' . number_format($adjustedPrices['final_price'], 0, ',', '.'));
        $template->setValue('psychological_price', 'Rp ' . number_format($adjustedPrices['psychological_price'], 0, ',', '.'));
        $template->setValue('area_treatment', $data['area_treatment'] ?? 'N/A');
        $template->cloneBlock('chemical_block', 0);
        $template->cloneBlock('price_block', 0);
    }

    private function applyServicePriceAdjustments(string $serviceType, float $rawPrice, float $area): array
    {
        $finalPrice = $rawPrice;

        switch ($serviceType) {
            case 'pipanasi':
                $finalPrice = $rawPrice * 1.3;
                break;
            case 'spraying':
                $finalPrice = $area * 12250;
                break;
            case 'refill_pipanasi':
                $finalPrice = $area * 33600;
                break;
        }

        $psychologicalPrice = $finalPrice * 1.2;

        return [
            'final_price' => round($finalPrice),
            'psychological_price' => round($psychologicalPrice),
        ];
    }

    private function fillGeneralAttributes(TemplateProcessor $template, array $data, string $serviceType)
    {
        $luasTanah = $data['area_treatment'];
        $time_estimation = $serviceType === 'baiting' ? ($luasTanah <= 999 ? '1 hari' : '2 hari') : ($luasTanah <= 200 ? '4 hari' : ($luasTanah <= 400 ? '7 hari' : ($luasTanah <= 500 ? '10 hari' : '30 hari')));
        $worker_estimation = $serviceType === 'baiting' ? ($luasTanah <= 999 ? '2 orang' : '3 orang') : ($luasTanah <= 300 ? '2 orang' : ($luasTanah <= 500 ? '3 orang' : '5 orang'));

        $template->setValue('number', $this->generateProposalNumber());
        $template->setValue('type', 'Penawaran Harga Pest Control');
        $template->setValue('client_name', $data['client_name'] ?? '');
        $template->setValue('address', $data['address'] ?? '');
        $template->setValue('guarantee', '1 tahun');
        $template->setValue('estimated_time', $time_estimation);
        $template->setValue('total_technician', $worker_estimation);
    }

    private function processImages(TemplateProcessor $template, array $imageGroups)
    {
        Log::info('Processing inspection images:', ['imageGroups' => $imageGroups]);
        $hasImages = !empty($imageGroups) && isset($imageGroups[0]['paths']) && !empty($imageGroups[0]['paths'][0]);

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
            if (!is_string($imgPath) || empty($imgPath))
                continue;
            $fullPath = public_path($imgPath);
            if (file_exists($fullPath)) {
                try {
                    $img = Image::read($fullPath)->scaleDown(null, $targetHeight);
                    if ($img->width() > 0 && $img->height() > 0) {
                        $resized[] = $img;
                    }
                } catch (\Exception $e) {
                    Log::error("Could not process image: {$fullPath}. Error: " . $e->getMessage());
                }
            }
        }

        if (empty($resized)) {
            $template->setValue($placeholder, '');
            return;
        }

        $totalWidth = array_sum(array_map(fn($img) => $img->width(), $resized)) + ($spacing * (count($resized) - 1));
        if ($totalWidth <= 0 || $targetHeight <= 0) {
            $template->setValue($placeholder, '');
            return;
        }

        $canvas = (new ImageManager(new Driver()))->create($totalWidth, $targetHeight)->fill('ffffff');

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
        $maxWidth = min($totalWidth, 600);
        $template->setImageValue($placeholder, [
            'path' => $outPath,
            'width' => $maxWidth,
            'height' => $targetHeight,
            'ratio' => false
        ]);
    }

    private function generateProposalNumber()
    {
        return str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT) . "-SPH-PC-" . date('Y-m');
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
            'pest_control' => ['pipanasi', 'spraying', 'inject_spraying', 'refill_pipanasi'],
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

    private function clearUnusedPlaceholders(TemplateProcessor $template)
    {
        $placeholders = [
            'inspection_heading',
            'image_desc',
            'image_content',
            'chem_name',
            'chem_desc_1',
            'chem_desc_2',
            'chem_desc_3',
            'price_treatment_name',
            'price_final',
            'price_psychological'
        ];

        foreach ($placeholders as $placeholder) {
            try {
                $template->setValue($placeholder, '');
            } catch (\Exception $e) {
            }
        }
    }
}