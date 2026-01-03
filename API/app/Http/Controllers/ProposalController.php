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
    protected ExcelCalculationService $calculationService;
    private array $tcItems = [
        'Expose Soil Treatent per Liter Larutan',
        'Premise Soil Treatent per Liter Larutan',
        'Agenda Soil Treatent per Liter Larutan',
        'Xterm AG Station',
        'Xterm IG Station',
        'Expose Wood Treatent per Liter Larutan',
        'Queen Killer',
        'Mata Bor kayu 2mm',
        'Mata Bor kayu 3mm',
        'Mata bor Hilti 6mm',
        'Mata Bor Hilti 8mm',
        'Mata Bor Hilti 10mm',
        'Semen Warna',
        'Premium',
        'Oli Fastron 10W-40SL',
        'Jarum B&G',
    ];

    private array $rcItems = [
        'Unit PP Tray',
        'Racumin Unit PP Tray',
        'Unit Black Box',
        'Racumin Block Black Box',
        'Unit Block Perangkap Masal',
        'Racumin Block Perangkap Masal',
        'Unit Glue Box Segitiga',
        'Racumin Glue Box Segitiga',
    ];

    private array $baitingItems = [
        'Xterm AG Station',
        'Xterm IG Station',
    ];

    private array $gpcItems = [
        'SMASH 100 EC Fogging per Liter Larutan',
        'Clearmos Fogging per Liter Larutan',
        'Storin Fogging per Liter Larutan (White Oil)',
        'K Othrine Fogging per Liter Larutan',
        'CLEARMOS ULV PER LITER LARUTAN',
        'K OTHRINE ULV PER LITER LARUTAN',
        'Lavender per Liter Larutan',
        'Agenda RSD Semut/Rayap per Liter Larutan',
        'Storin per Liter Larutan',
        'TENOPA RSD Kecoa Jerman',
        'K OTHRINE per Liter Larutan',
        'Flygard Bait Lalat',
        'Agita WG Bait Lalat',
        'Blattanex Gel Bait trap',
        'Max Force Quantum Gel Semut',
        'Pohon Lalat',
        'Hoy Hoy (Kecoa)',
        'Vectobac Larvasida',
        'Abate Larvasida',
        'Fly Catcher',
        'Blackhole',
        'Cat Trap',
        'Conant',
    ];

    private array $additionalItems = [
        'Masker untuk Klien',
        'Company Profile',
        'Laporan/SPK/Surat/Kontrak',
        'BAP',
        'LOG BOOK',
    ];

    public function __construct(ExcelCalculationService $calculationService)
    {
        $this->calculationService = $calculationService;
    }

    public function generate(Request $request)
    {
        Log::info('Multi-service proposal generation request received:', $request->all());

        $rules = [
            'client_name' => 'required|string',
            'client_type' => 'nullable|string',
            'client_email' => 'nullable|email',
            'client_phone' => 'nullable|string',
            'address' => 'required|string',
            'service_types' => 'required|array|min:1',
            'service_types.*' => 'required|string|in:TC,GPC,RC,GPRC',
            'service_details' => 'nullable|array',
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
        $serviceTypes = $validated['service_types'];

        $separatedItems = $this->separateItemsByService(
            $validated['preparation_set_items'],
            $validated['additional_set_items']
        );

        Log::info('Separated items by service:', $separatedItems);

        // Check for combination services that need price comparison
        $needsPriceComparison = $this->needsPriceComparison($serviceTypes);

        if ($needsPriceComparison) {
            $priceComparison = $this->calculateCombinationPrices($validated, $separatedItems, $serviceTypes);
        } else {
            $allServicePrices = [];
            foreach ($serviceTypes as $serviceType) {
                Log::info("Calculating prices for service: {$serviceType}");
                try {
                    $serviceData = $this->prepareServiceData($validated, $serviceType, $separatedItems);
                    $prices = $this->calculateServicePrices($serviceType, $serviceData);
                    $allServicePrices[$serviceType] = $prices;
                    Log::info("Prices calculated for {$serviceType}:", $prices);
                } catch (\Exception $e) {
                    Log::error("Failed to calculate prices for {$serviceType}: " . $e->getMessage());
                    return response()->json([
                        'error' => "Failed to calculate prices for {$serviceType}",
                        'message' => $e->getMessage()
                    ], 500);
                }
            }
            $priceComparison = $allServicePrices;
        }

        try {
            $documentPath = $this->generateSingleDocument($validated, $priceComparison, $separatedItems, $serviceTypes, $needsPriceComparison);
            return response()->download($documentPath)->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            Log::error('Document generation failed: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to generate document',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Separate preparation items by service type
     */
    private function separateItemsByService(array $prepItems, array $addItems): array
    {
        $separated = [
            'TC' => ['preparation' => [], 'additional' => []],
            'RC' => ['preparation' => [], 'additional' => []],
            'GPC' => ['preparation' => [], 'additional' => []],
            'GPRC' => ['preparation' => [], 'additional' => []],
        ];

        foreach ($prepItems as $itemName => $quantity) {
            if (in_array($itemName, $this->tcItems)) {
                $separated['TC']['preparation'][$itemName] = $quantity;
            }
            if (in_array($itemName, $this->rcItems)) {
                $separated['RC']['preparation'][$itemName] = $quantity;
            }
            if (in_array($itemName, $this->gpcItems)) {
                $separated['GPC']['preparation'][$itemName] = $quantity;
            }
        }

        $separated['GPRC']['preparation'] = array_merge(
            $separated['RC']['preparation'],
            $separated['GPC']['preparation']
        );

        $allServiceTypes = ['TC', 'RC', 'GPC', 'GPRC'];
        foreach ($allServiceTypes as $serviceType) {
            $separated[$serviceType]['additional'] = $addItems;
        }

        return $separated;
    }

    /**
     * Prepare service-specific data for calculation
     */
    private function prepareServiceData(array $validated, string $serviceType, array $separatedItems): array
    {
        $commonData = [
            'luasTanah' => $validated['area_treatment'],
            'jarakTempuh' => $validated['distance_km'],
            'jumlahLantai' => $validated['floor_count'],
            'monitoringPerBulan' => $validated['monitoring_duration_months'],
            'client_name' => $validated['client_name'],
            'address' => $validated['address'],
            'transport' => $validated['transport'],
        ];

        // Get service-specific items
        $serviceItems = $separatedItems[$serviceType] ?? ['preparation' => [], 'additional' => []];

        return array_merge($commonData, [
            'service_type' => $serviceType,
            'preparationSet' => $serviceItems['preparation'],
            'additionalSet' => $serviceItems['additional'],
        ]);
    }

    /**
     * Calculate prices for a specific service type
     */
    private function calculateServicePrices(string $serviceType, array $serviceData): array
    {
        $result = [
            'service_type' => $serviceType,
            'options' => []
        ];

        switch ($serviceType) {
            case 'TC':
                $result['options'] = $this->calculateTCPrices($serviceData);
                break;

            case 'GPC':
                $result['options'] = $this->calculateGPCPrices($serviceData);
                break;

            case 'RC':
                $result['options'] = $this->calculateRCPrices($serviceData);
                break;

            case 'GPRC':
                $result['options'] = $this->calculateGPRCPrices($serviceData);
                break;
        }

        return $result;
    }

    /**
     * Calculate Termite Control prices (chemical comparison)
     */
    private function calculateTCPrices(array $data): array
    {
        // Detect which chemicals are selected
        $selectedChemicals = array_intersect_key(
            $data['preparationSet'],
            array_flip([
                'Expose Soil Treatent per Liter Larutan',
                'Premise Soil Treatent per Liter Larutan',
                'Agenda Soil Treatent per Liter Larutan',
            ])
        );

        if (empty($selectedChemicals)) {
            Log::warning('No TC chemicals selected, using default treatment');
            $data['service_type'] = 'inject_spraying';
            $basePrice = $this->calculationService->getCalculatedPrice($data);
            $adjustedPrices = $this->applyServicePriceAdjustments('inject_spraying', $basePrice, $data['luasTanah']);

            return [
                [
                    'name' => 'Standard Treatment',
                    'treatment' => 'inject_spraying',
                    'base_price' => $basePrice,
                    'final_price' => $adjustedPrices['final_price'],
                    'psychological_price' => $adjustedPrices['psychological_price'],
                    'guarantee_period' => $this->getGuaranteePeriod('inject_spraying'),
                ]
            ];
        }

        // Get comparative prices for selected chemicals
        $data['service_type'] = 'inject_spraying';
        $comparisonResults = $this->calculationService->getComparativePrices($data);

        $options = [];
        foreach ($comparisonResults as $chemical => $priceData) {
            $adjustedPrices = $this->applyServicePriceAdjustments('inject_spraying', $priceData['price'], $data['luasTanah']);

            $chemicalDetails = $this->getChemicalDetails($chemical);

            $options[] = [
                'name' => $chemical,
                'display_name' => $chemicalDetails['name'],
                'treatment' => 'inject_spraying',
                'base_price' => $priceData['price'],
                'final_price' => $adjustedPrices['final_price'],
                'psychological_price' => $adjustedPrices['psychological_price'],
                'quantity_liter' => $priceData['auto_quantity_liter'] ?? 0,
                'guarantee_period' => $this->getGuaranteePeriod('inject_spraying'),
                'description' => $chemicalDetails['description'],
            ];
        }

        return $options;
    }

    /**
     * Calculate General Pest Control prices
     */
    private function calculateGPCPrices(array $data): array
    {
        $data['service_type'] = 'general_pest_control';
        $basePrice = $this->calculationService->getCalculatedPrice($data);
        $adjustedPrices = $this->applyServicePriceAdjustments('general_pest_control', $basePrice, $data['luasTanah']);

        return [
            [
                'name' => 'General Pest Control',
                'display_name' => 'Pengendalian Hama Umum',
                'treatment' => 'general_pest_control',
                'base_price' => $basePrice,
                'final_price' => $adjustedPrices['final_price'],
                'psychological_price' => $adjustedPrices['psychological_price'],
                'guarantee_period' => '1 tahun',
                'description' => 'Layanan pengendalian hama umum (kecoa, semut, lalat, nyamuk, dll)',
            ]
        ];
    }

    /**
     * Calculate Rodent Control prices (baiting method)
     */
    private function calculateRCPrices(array $data): array
    {
        $data['service_type'] = 'baiting';
        $basePrice = $this->calculationService->getCalculatedPrice($data);
        $adjustedPrices = $this->applyServicePriceAdjustments('baiting', $basePrice, $data['luasTanah']);

        return [
            [
                'name' => 'Rodent Control - Baiting',
                'display_name' => 'Pengendalian Tikus - Umpan',
                'treatment' => 'baiting',
                'base_price' => $basePrice,
                'final_price' => $adjustedPrices['final_price'],
                'psychological_price' => $adjustedPrices['psychological_price'],
                'guarantee_period' => '1 tahun',
                'description' => 'Pengendalian tikus menggunakan metode umpan racun',
            ]
        ];
    }

    /**
     * Calculate GPRC (combined GPC + RC) prices
     */
    private function calculateGPRCPrices(array $data): array
    {
        // Calculate GPC component
        $gpcData = $data;
        $gpcData['service_type'] = 'general_pest_control';
        $gpcData['preparationSet'] = array_intersect_key(
            $data['preparationSet'],
            array_flip($this->gpcItems)
        );
        $gpcBasePrice = $this->calculationService->getCalculatedPrice($gpcData);

        // Calculate RC component
        $rcData = $data;
        $rcData['service_type'] = 'baiting';
        $rcData['preparationSet'] = array_intersect_key(
            $data['preparationSet'],
            array_flip($this->rcItems)
        );
        $rcBasePrice = $this->calculationService->getCalculatedPrice($rcData);

        // Bundle discount: 10% off total
        $bundleBasePrice = ($gpcBasePrice + $rcBasePrice) * 0.9;
        $adjustedPrices = $this->applyServicePriceAdjustments('gprc_bundle', $bundleBasePrice, $data['luasTanah']);

        return [
            [
                'name' => 'GPRC Bundle (GPC + RC)',
                'display_name' => 'Paket GPRC (Hama Umum + Tikus)',
                'treatment' => 'gprc_bundle',
                'base_price' => $bundleBasePrice,
                'final_price' => $adjustedPrices['final_price'],
                'psychological_price' => $adjustedPrices['psychological_price'],
                'gpc_component' => $gpcBasePrice,
                'rc_component' => $rcBasePrice,
                'discount_percentage' => 10,
                'guarantee_period' => '1 tahun',
                'description' => 'Paket bundling pengendalian hama umum dan tikus dengan diskon 10%',
            ]
        ];
    }

    /**
     * Get chemical details for display
     */
    private function getChemicalDetails(string $chemicalKey): array
    {
        $details = [
            'Expose Soil Treatent per Liter Larutan' => [
                'name' => 'Expose 55 SC',
                'description' => 'Bahan aktif Fipronil (5.5%) - Dosis 5-10 ml/L',
            ],
            'Agenda Soil Treatent per Liter Larutan' => [
                'name' => 'Agenda 25 EC',
                'description' => 'Bahan aktif Fipronil (25%) - Dosis 10 ml/L - Koloni Eliminasi',
            ],
            'Premise Soil Treatent per Liter Larutan' => [
                'name' => 'Premise 200 SL',
                'description' => 'Bahan aktif Imidakloprid (20%) - Dosis 2.5 ml/L - Non-repellent',
            ],
        ];

        return $details[$chemicalKey] ?? ['name' => $chemicalKey, 'description' => ''];
    }

    /**
     * Check if service combination needs price comparison
     */
    private function needsPriceComparison(array $serviceTypes): bool
    {
        // TC always has price comparison (except baiting)
        if (count($serviceTypes) === 1 && in_array('TC', $serviceTypes)) {
            return true;
        }

        // GPC + GPRC combination needs price comparison
        if (
            count($serviceTypes) === 2 &&
            in_array('GPC', $serviceTypes) &&
            in_array('GPRC', $serviceTypes)
        ) {
            return true;
        }

        // RC + GPRC combination needs price comparison  
        if (
            count($serviceTypes) === 2 &&
            in_array('RC', $serviceTypes) &&
            in_array('GPRC', $serviceTypes)
        ) {
            return true;
        }

        return false;
    }

    /**
     * Calculate prices for combination services
     */
    private function calculateCombinationPrices(array $validated, array $separatedItems, array $serviceTypes): array
    {
        if (count($serviceTypes) === 1 && in_array('TC', $serviceTypes)) {
            // Handle TC price comparison
            $serviceData = $this->prepareServiceData($validated, 'TC', $separatedItems);
            $result = $this->calculateServicePrices('TC', $serviceData);
            $result['area_treatment'] = $validated['area_treatment'];
            return $result;
        }

        if (
            count($serviceTypes) === 2 &&
            in_array('GPC', $serviceTypes) &&
            in_array('GPRC', $serviceTypes)
        ) {
            return $this->calculateGPCGPRCComparison($validated, $separatedItems);
        }

        if (
            count($serviceTypes) === 2 &&
            in_array('RC', $serviceTypes) &&
            in_array('GPRC', $serviceTypes)
        ) {
            return $this->calculateRCGPRCComparison($validated, $separatedItems);
        }

        return [];
    }

    /**
     * Calculate GPC + GPRC price comparison
     */
    private function calculateGPCGPRCComparison(array $validated, array $separatedItems): array
    {
        $options = [];

        // GPC option
        $gpcData = $this->prepareServiceData($validated, 'GPC', $separatedItems);
        $gpcData['service_type'] = 'general_pest_control';
        $gpcBasePrice = $this->calculationService->getCalculatedPrice($gpcData);
        $gpcAdjusted = $this->applyServicePriceAdjustments('general_pest_control', $gpcBasePrice, $validated['area_treatment']);

        $options[] = [
            'target_name' => 'serangga kecoa, semut, nyamuk, lalat',
            'final_price' => $gpcAdjusted['final_price'],
            'psychological_price' => $gpcAdjusted['psychological_price'],
        ];

        // GPRC option
        $gprcData = $this->prepareServiceData($validated, 'GPRC', $separatedItems);
        $gprcPrices = $this->calculateGPRCPrices($gprcData);

        $options[] = [
            'target_name' => 'serangga kecoa, semut, nyamuk, lalat, tikus',
            'final_price' => $gprcPrices[0]['final_price'],
            'psychological_price' => $gprcPrices[0]['psychological_price'],
        ];

        return ['options' => $options];
    }

    /**
     * Calculate RC + GPRC price comparison
     */
    private function calculateRCGPRCComparison(array $validated, array $separatedItems): array
    {
        $options = [];

        // RC option
        $rcData = $this->prepareServiceData($validated, 'RC', $separatedItems);
        $rcPrices = $this->calculateRCPrices($rcData);

        $options[] = [
            'target_name' => 'tikus',
            'final_price' => $rcPrices[0]['final_price'],
            'psychological_price' => $rcPrices[0]['psychological_price'],
        ];

        // GPRC option
        $gprcData = $this->prepareServiceData($validated, 'GPRC', $separatedItems);
        $gprcPrices = $this->calculateGPRCPrices($gprcData);

        $options[] = [
            'target_name' => 'serangga kecoa, semut, nyamuk, lalat, tikus',
            'final_price' => $gprcPrices[0]['final_price'],
            'psychological_price' => $gprcPrices[0]['psychological_price'],
        ];

        return ['options' => $options];
    }

    /**
     * Generate single document instead of multiple
     */
    private function generateSingleDocument(array $validated, array $priceData, array $separatedItems, array $serviceTypes, bool $needsPriceComparison): string
    {
        // Determine template based on service combination
        $templateName = $this->getTemplateForCombination($serviceTypes, $validated);
        $templatePath = storage_path("app/templates/{$templateName}.docx");

        if (!file_exists($templatePath)) {
            $templatePath = storage_path("app/templates/general_template.docx");
            $templateName = 'general_template';
        }

        if (!file_exists($templatePath)) {
            throw new \Exception("Template not found: {$templateName}.docx and no general_template.docx fallback available");
        }

        Log::info("Using template: {$templateName}.docx for services: " . implode(', ', $serviceTypes));

        $template = new TemplateProcessor($templatePath);

        $this->fillGeneralAttributes($template, $validated, implode('_', $serviceTypes), $validated['service_details'] ?? []);
        $this->processImages($template, $validated['images'] ?? []);

        if ($needsPriceComparison) {
            $this->fillCombinationPriceComparison($template, $priceData, $serviceTypes);
        } else {
            $this->fillRegularPrices($template, $priceData, $serviceTypes);
        }

        $this->fillCombinedMaterialList($template, $separatedItems, $serviceTypes);
        $this->fillCombinedServiceDetails($template, $serviceTypes, $validated['service_details'] ?? []);

        // Clear unused placeholders at the very end
        $this->clearUnusedPlaceholders($template);

        $outputFilename = $this->generateCombinedOutputFilename($serviceTypes, $validated['client_name']);
        $outputPath = storage_path("app/generated/{$outputFilename}");

        if (!file_exists(dirname($outputPath))) {
            mkdir(dirname($outputPath), 0755, true);
        }

        $template->saveAs($outputPath);
        return $outputPath;
    }

    /**
     * Get template name for service combination
     */
    private function getTemplateForCombination(array $serviceTypes, array $validated): string
    {
        if (count($serviceTypes) === 1) {
            $serviceType = $serviceTypes[0];
            $templateMap = [
                'TC' => 'inject_spraying',
                'GPC' => 'gpc',
                'RC' => 'baiting',
                'GPRC' => 'integrated_pest_management_(gprc)',
            ];

            // Handle TC treatment variations
            if ($serviceType === 'TC' && isset($validated['service_details']['TC']['treatment'])) {
                $tcTreatment = strtolower(str_replace('_', '_', $validated['service_details']['TC']['treatment']));
                $availableTemplates = ['pipanasi', 'refill_pipanasi', 'spraying', 'inject_spraying', 'baiting'];
                if (in_array($tcTreatment, $availableTemplates)) {
                    return $tcTreatment;
                }
            }

            return $templateMap[$serviceType] ?? 'general_template';
        }

        // For combinations, use integrated template
        return 'integrated_pest_management_(gprc)';
    }



    /**
     * Fill price comparison data in template
     */
    private function fillPriceComparison(TemplateProcessor $template, array $priceData, string $serviceType, float $area): void
    {
        $options = $priceData['options'];

        if (count($options) > 1) {
            // Multiple options - create comparison table
            try {
                $template->cloneBlock('price_comparison_block', count($options), true, true);

                foreach ($options as $i => $option) {
                    $index = $i + 1;

                    $template->setValue("option_name#{$index}", $option['display_name'] ?? $option['name']);
                    $template->setValue("option_description#{$index}", $option['description'] ?? '');
                    $template->setValue("option_final_price#{$index}", 'Rp ' . number_format($option['final_price'], 0, ',', '.'));
                    $template->setValue("option_psychological_price#{$index}", 'Rp ' . number_format($option['psychological_price'], 0, ',', '.'));
                    $template->setValue("option_guarantee#{$index}", $option['guarantee_period']);

                    if (isset($option['quantity_liter'])) {
                        $template->setValue("option_quantity#{$index}", $option['quantity_liter'] . ' Liter');
                    }
                }
            } catch (\Exception $e) {
                Log::error("Failed to fill price comparison: " . $e->getMessage());
            }
        } else {
            // Single option
            $option = $options[0];

            $template->setValue('service_name', $option['display_name'] ?? $option['name']);
            $template->setValue('service_description', $option['description'] ?? '');
            $template->setValue('final_price', 'Rp ' . number_format($option['final_price'], 0, ',', '.'));
            $template->setValue('psychological_price', 'Rp ' . number_format($option['psychological_price'], 0, ',', '.'));
            $template->setValue('guarantee_period', $option['guarantee_period']);
            $template->setValue('area_treatment', $area);

            // Remove comparison block if exists
            try {
                $template->cloneBlock('price_comparison_block', 0);
            } catch (\Exception $e) {
                // Ignore if block doesn't exist
            }
        }
    }

    /**
     * Fill material list in template
     */
    private function fillMaterialList(TemplateProcessor $template, array $serviceItems): void
    {
        $prepItems = $serviceItems['preparation'] ?? [];
        $addItems = $serviceItems['additional'] ?? [];

        $allItems = array_merge($prepItems, $addItems);
        $itemCount = count($allItems);

        if ($itemCount > 0) {
            try {
                $template->cloneBlock('material_list_block', $itemCount, true, true);

                $i = 1;
                foreach ($allItems as $itemName => $quantity) {
                    $template->setValue("material_name#{$i}", $itemName);
                    $template->setValue("material_qty#{$i}", $quantity);
                    $i++;
                }
            } catch (\Exception $e) {
                Log::warning("Failed to fill material list: " . $e->getMessage());
            }
        } else {
            try {
                $template->cloneBlock('material_list_block', 0);
            } catch (\Exception $e) {
                // Ignore
            }
        }
    }

    /**
     * Fill combination price comparison
     */
    private function fillCombinationPriceComparison(TemplateProcessor $template, array $priceData, array $serviceTypes): void
    {
        if (count($serviceTypes) === 1 && in_array('TC', $serviceTypes)) {
            // Handle TC price comparison (existing logic)
            if (count($priceData['options']) > 1) {
                $this->fillChemicalAndPriceBlocks($template, $priceData['options'], $priceData['area_treatment'] ?? 0);
                $template->setValue('final_price', '');
                $template->setValue('psychological_price', '');
            } else {
                $this->fillPriceComparison($template, $priceData, 'TC', $priceData['area_treatment'] ?? 0);
            }
        } else {
            // Handle GPC+GPRC or RC+GPRC combinations
            $options = $priceData['options'];
            try {
                $template->cloneBlock('price_comparison_block', count($options), true, true);

                foreach ($options as $i => $option) {
                    $index = $i + 1;
                    $template->setValue("target_name#{$index}", $option['target_name']);
                    $template->setValue("option_final_price#{$index}", 'Rp ' . number_format($option['final_price'], 0, ',', '.'));
                    $template->setValue("option_psychological_price#{$index}", 'Rp ' . number_format($option['psychological_price'], 0, ',', '.'));
                }
            } catch (\Exception $e) {
                Log::error("Failed to fill combination price comparison: " . $e->getMessage());
            }
        }
    }

    /**
     * Fill regular prices for non-comparison services
     */
    private function fillRegularPrices(TemplateProcessor $template, array $allServicePrices, array $serviceTypes): void
    {
        // For single services without comparison, use first service price
        $firstService = array_key_first($allServicePrices);
        if ($firstService && isset($allServicePrices[$firstService]['options'][0])) {
            $option = $allServicePrices[$firstService]['options'][0];
            $template->setValue('final_price', 'Rp ' . number_format($option['final_price'], 0, ',', '.'));
            $template->setValue('psychological_price', 'Rp ' . number_format($option['psychological_price'], 0, ',', '.'));
            $template->setValue('guarantee_period', $option['guarantee_period'] ?? '1 tahun');
        }
    }

    /**
     * Fill combined material list for multiple services
     */
    private function fillCombinedMaterialList(TemplateProcessor $template, array $separatedItems, array $serviceTypes): void
    {
        $allItems = [];

        foreach ($serviceTypes as $serviceType) {
            if (isset($separatedItems[$serviceType])) {
                $allItems = array_merge($allItems, $separatedItems[$serviceType]['preparation'] ?? []);
            }
        }

        // Add additional items (shared across all services)
        if (isset($separatedItems[array_key_first($separatedItems)]['additional'])) {
            $allItems = array_merge($allItems, $separatedItems[array_key_first($separatedItems)]['additional']);
        }

        $this->fillMaterialList($template, ['preparation' => $allItems, 'additional' => []]);
    }

    /**
     * Fill combined service details
     */
    private function fillCombinedServiceDetails(TemplateProcessor $template, array $serviceTypes, array $serviceDetails): void
    {
        foreach ($serviceTypes as $serviceType) {
            if (isset($serviceDetails[$serviceType])) {
                $this->fillServiceSpecificDetails($template, $serviceType, $serviceDetails[$serviceType]);
            }
        }
    }

    /**
     * Generate combined output filename
     */
    private function generateCombinedOutputFilename(array $serviceTypes, string $clientName): string
    {
        $cleanClientName = preg_replace('/[^A-Za-z0-9\-]/', '', str_replace(' ', '-', $clientName));
        $serviceString = implode('_', $serviceTypes);
        $timestamp = date('Y-m-d_H-i-s');
        return "proposal_{$serviceString}_{$cleanClientName}_{$timestamp}.docx";
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
            case 'inject_spraying':
            case 'baiting':
            case 'trapping':
            case 'general_pest_control':
            case 'gprc_bundle':
                // Use calculated price as-is
                break;
        }

        $psychologicalPrice = $finalPrice * 1.2;

        return [
            'final_price' => round($finalPrice),
            'psychological_price' => round($psychologicalPrice),
        ];
    }

    private function getGuaranteePeriod(string $serviceType): string
    {
        switch ($serviceType) {
            case 'pipanasi':
                return '5 tahun';
            case 'inject_spraying':
            case 'refill_pipanasi':
                return '3 tahun';
            case 'baiting':
            case 'spraying':
            case 'general_pest_control':
            case 'gprc_bundle':
                return '1 tahun';
            default:
                return '1 tahun';
        }
    }

    /**
     * Fill service-specific details in template
     */
    private function fillServiceSpecificDetails(TemplateProcessor $template, string $serviceType, array $serviceDetails): void
    {
        switch ($serviceType) {
            case 'TC':
                // Termite Control specific fields
                $template->setValue('tc_treatment', $serviceDetails['treatment'] ?? 'Inject & Spraying');
                $template->setValue('tc_status', $serviceDetails['status'] ?? 'Terdeteksi Rayap');
                break;

            case 'GPC':
                // General Pest Control specific fields
                $targetHama = $serviceDetails['targetHama'] ?? [];
                $template->setValue('gpc_target_hama', is_array($targetHama) ? implode(', ', $targetHama) : $targetHama);
                $template->setValue('gpc_area_aplikasi', $serviceDetails['areaAplikasi'] ?? 'Seluruh Area');
                $template->setValue('gpc_bahan_aktif', $serviceDetails['bahanAktifKimia'] ?? '-');
                $template->setValue('gpc_status', $serviceDetails['status'] ?? 'Terdeteksi Hama');

                // Treatment methods
                $treatments = $serviceDetails['treatment'] ?? [];
                $template->setValue('gpc_treatment', is_array($treatments) ? implode(', ', $treatments) : $treatments);
                break;

            case 'RC':
                // Rodent Control specific fields
                $template->setValue('rc_tingkat_infestasi', $serviceDetails['tingkatInfestasi'] ?? 'Sedang');
                $template->setValue('rc_rekomendasi_sanitasi', $serviceDetails['rekomendasiSanitasi'] ?? 'Perbaikan sanitasi diperlukan');

                $treatments = $serviceDetails['treatment'] ?? [];
                $template->setValue('rc_treatment', is_array($treatments) ? implode(' & ', $treatments) : $treatments);
                break;

            case 'GPRC':
                // Combined GPRC fields
                $targetHama = $serviceDetails['targetHama'] ?? [];
                $template->setValue('gprc_target_hama', is_array($targetHama) ? implode(', ', $targetHama) : $targetHama);
                $template->setValue('gprc_tingkat_infestasi', $serviceDetails['tingkatInfestasi'] ?? 'Sedang');

                $treatments = $serviceDetails['treatment'] ?? [];
                $template->setValue('gprc_treatment', is_array($treatments) ? implode(', ', $treatments) : $treatments);
                break;
        }
    }

    private function fillGeneralAttributes(TemplateProcessor $template, array $data, string $serviceType, array $serviceDetails = [])
    {
        $luasTanah = $data['area_treatment'];

        // Time estimation based on service type
        if ($serviceType === 'baiting' || $serviceType === 'RC') {
            $time_estimation = $luasTanah <= 999 ? '1 hari' : '2 hari';
            $worker_estimation = $luasTanah <= 999 ? '2 orang' : '3 orang';
        } else {
            $time_estimation = $luasTanah <= 200 ? '4 hari' :
                ($luasTanah <= 400 ? '7 hari' :
                    ($luasTanah <= 500 ? '10 hari' : '30 hari'));
            $worker_estimation = $luasTanah <= 300 ? '2 orang' :
                ($luasTanah <= 500 ? '3 orang' : '5 orang');
        }

        $serviceLabels = [
            'TC' => 'Termite Control (Pengendalian Rayap)',
            'GPC' => 'General Pest Control (Pengendalian Hama Umum)',
            'RC' => 'Rodent Control (Pengendalian Tikus)',
            'GPRC' => 'GPRC Bundle (Hama Umum + Tikus)',
        ];

        $template->setValue('number', $this->generateProposalNumber());
        $template->setValue('type', 'Penawaran Harga Pest Control');
        $template->setValue('client_name', $data['client_name'] ?? '');
        $template->setValue('client_type', $data['client_type'] ?? '-');
        $template->setValue('client_email', $data['client_email'] ?? '-');
        $template->setValue('client_phone', $data['client_phone'] ?? '-');
        $template->setValue('address', $data['address'] ?? '');
        $template->setValue('area_treatment', $data['area_treatment'] ?? 0);
        $template->setValue('guarantee', $this->getGuaranteePeriod($serviceType));
        $template->setValue('estimated_time', $time_estimation);
        $template->setValue('total_technician', $worker_estimation);
        $template->setValue('service_type_label', $serviceLabels[$serviceType] ?? strtoupper($serviceType));
        $template->setValue('date', date('d F Y'));
    }

    private function processImages(TemplateProcessor $template, array $imageGroups)
    {
        Log::info('Processing inspection images:', ['imageGroups' => $imageGroups]);
        $hasImages = !empty($imageGroups) && isset($imageGroups[0]['paths']) && !empty($imageGroups[0]['paths'][0]);

        if (!$hasImages) {
            Log::info('No images found, removing inspection section');
            $template->setValue('inspection_heading', '');
            try {
                $template->cloneRowAndSetValues('image_desc', []);
                Log::info('Successfully removed image table rows');
            } catch (\Exception $e) {
                Log::info('No image table found to remove: ' . $e->getMessage());
            }
            return;
        }

        Log::info('Setting inspection heading and processing ' . count($imageGroups) . ' image groups');
        $template->setValue('inspection_heading', 'HASIL INSPEKSI');

        try {
            $imageRowData = [];
            foreach ($imageGroups as $group) {
                $description = !empty($group['description']) ? $group['description'] : 'Tidak ada detail';
                $imageRowData[] = [
                    'image_desc' => $description
                ];
            }

            Log::info('Cloning image table rows');
            $template->cloneRowAndSetValues('image_desc', $imageRowData);
            Log::info('Successfully cloned image table rows');

            foreach ($imageGroups as $i => $group) {
                $index = $i + 1;
                if (!empty($group['paths']) && !empty($group['paths'][0])) {
                    $imagePath = public_path($group['paths'][0]);
                    if (file_exists($imagePath)) {
                        Log::info("Setting inspection image #{$index}: {$imagePath}");
                        $template->setImageValue("image_content#{$index}", [
                            'path' => $imagePath,
                            'width' => 600,
                            'height' => 300,
                            'ratio' => false
                        ]);
                        Log::info("Successfully set image_content#{$index}");
                    } else {
                        Log::error("Image file not found: {$imagePath}");
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error("Failed to process image table: " . $e->getMessage());
        }
    }


    private function processImageForTemplate(array $imagePaths, int $index, int $targetHeight, int $spacing): string
    {
        Log::info("Processing image template for index {$index} with paths:", $imagePaths);
        $resized = [];
        foreach ($imagePaths as $imgPath) {
            if (!is_string($imgPath) || empty($imgPath)) {
                Log::warning("Skipping invalid image path: " . var_export($imgPath, true));
                continue;
            }
            $fullPath = public_path($imgPath);
            Log::info("Checking image file: {$fullPath}");
            if (file_exists($fullPath)) {
                try {
                    $img = Image::read($fullPath)->scaleDown(null, $targetHeight);
                    if ($img->width() > 0 && $img->height() > 0) {
                        $resized[] = $img;
                        Log::info("Successfully processed image: {$fullPath} (size: {$img->width()}x{$img->height()})");
                    }
                } catch (\Exception $e) {
                    Log::error("Could not process image: {$fullPath}. Error: " . $e->getMessage());
                }
            } else {
                Log::error("Image file not found: {$fullPath}");
            }
        }

        if (empty($resized)) {
            Log::warning("No images were successfully processed for index {$index}");
            return '';
        }

        $totalWidth = array_sum(array_map(fn($img) => $img->width(), $resized)) + ($spacing * (count($resized) - 1));
        if ($totalWidth <= 0 || $targetHeight <= 0) {
            Log::error("Invalid canvas dimensions: width={$totalWidth}, height={$targetHeight}");
            return '';
        }

        Log::info("Creating canvas with dimensions: {$totalWidth}x{$targetHeight}");
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
        Log::info("Saved combined image to: {$outPath}");

        return $outPath;
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

    private function clearUnusedPlaceholders(TemplateProcessor $template)
    {
        $placeholders = [
            'inspection_heading',
            'image_desc',
            'image_content',
            'option_name',
            'option_description',
            'option_final_price',
            'option_psychological_price',
            'option_guarantee',
            'option_quantity',
            'service_name',
            'service_description',
            'final_price',
            'psychological_price',
            'material_name',
            'material_qty',
            'tc_treatment',
            'tc_status',
            'gpc_target_hama',
            'gpc_area_aplikasi',
            'gpc_bahan_aktif',
            'gpc_status',
            'gpc_treatment',
            'rc_tingkat_infestasi',
            'rc_rekomendasi_sanitasi',
            'rc_treatment',
            'gprc_target_hama',
            'gprc_tingkat_infestasi',
            'gprc_treatment',
            'chem_name',
            'chem_desc_1',
            'chem_desc_2',
            'chem_desc_3',
            'chem_image',
            'price_block_counter',
            'price_treatment_name',
            'price_psychological',
            'price_final',
            'price_guarantee',
            'target_name'
        ];

        // Clear numbered placeholders (up to 10 for safety)
        for ($i = 1; $i <= 10; $i++) {
            foreach ($placeholders as $placeholder) {
                try {
                    $template->setValue("{$placeholder}#{$i}", '');
                } catch (\Exception $e) {
                    // Ignore errors for placeholders that may not exist
                }
            }
        }

        // Clear base placeholders
        foreach ($placeholders as $placeholder) {
            try {
                $template->setValue($placeholder, '');
            } catch (\Exception $e) {
                // Ignore errors for placeholders that may not exist in all templates
            }
        }
    }

    private function generateProposalNumber()
    {
        return str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT) . "-SPH-PC-" . date('Y-m');
    }

    private function generateOutputFilename($documentType, $serviceType, $clientName)
    {
        $cleanClientName = preg_replace('/[^A-Za-z0-9\-]/', '', str_replace(' ', '-', $clientName));
        $timestamp = date('Y-m-d_H-i-s');
        return "{$documentType}_{$serviceType}_{$cleanClientName}_{$timestamp}.docx";
    }

    private function fillChemicalAndPriceBlocks(TemplateProcessor $template, array $options, float $area): void
    {
        Log::info('Starting fillChemicalAndPriceBlocks with options:', $options);

        $chemicalDetails = [
            'Expose Soil Treatent per Liter Larutan' => [
                'name' => 'Expose 55 SC',
                'desc_1' => 'Bahan aktif Fipronil yang bersifat racun perut dan racun kontak.',
                'desc_2' => 'Dosis 5-10 ml/L',
                'desc_3' => 'Konsentrasi 5,5 %',
                'image' => storage_path('app/templates/images/expose.png'),
                'treatment_name' => 'Pipanisasi & Spraying Chemical Expose by KRISTAL',
            ],
            'Agenda Soil Treatent per Liter Larutan' => [
                'name' => 'Agenda 25 EC',
                'desc_1' => 'Bahan aktif Fipronil',
                'desc_2' => 'Efektif membasmi rayap hingga ke ratunya (Koloni Eliminasi)',
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

        $chemCount = count($options);
        Log::info("Processing {$chemCount} chemical options");

        // Process chemical blocks using cloneRowAndSetValues like price table
        try {
            $chemicalRowData = [];
            foreach ($options as $option) {
                $chemicalKey = $option['name'];
                if (isset($chemicalDetails[$chemicalKey])) {
                    $details = $chemicalDetails[$chemicalKey];
                    $chemicalRowData[] = [
                        'chem_name' => $details['name'],
                        'chem_desc_1' => $details['desc_1'],
                        'chem_desc_2' => $details['desc_2'],
                        'chem_desc_3' => $details['desc_3']
                    ];
                }
            }

            if (!empty($chemicalRowData)) {
                $template->cloneRowAndSetValues('chem_name', $chemicalRowData);

                // Set images separately after cloning
                foreach ($options as $i => $option) {
                    $chemicalKey = $option['name'];
                    if (isset($chemicalDetails[$chemicalKey])) {
                        $details = $chemicalDetails[$chemicalKey];
                        $index = $i + 1;

                        if (file_exists($details['image'])) {
                            $template->setImageValue("chem_image#{$index}", [
                                'path' => $details['image'],
                                'width' => 150,
                                'height' => 150,
                                'ratio' => false
                            ]);
                            Log::info("Set chemical image #{$index}: {$details['image']}");
                        }
                    }
                }

                Log::info("Cloned chemical rows successfully");
            }
        } catch (\Exception $e) {
            Log::error("Failed to process chemical_block: " . $e->getMessage());
        }

        // Process price blocks
        try {
            $rowData = $this->preparePriceRowDataForTC($options, $chemicalDetails);
            $template->cloneRowAndSetValues('price_block_counter', $rowData);
            Log::info("Cloned price table rows successfully using cloneRowAndSetValues.");
        } catch (\Exception $e) {
            Log::warning("cloneRowAndSetValues failed, trying cloneBlock as fallback: " . $e->getMessage());
            try {
                $template->cloneBlock('price_block', $chemCount, true, false);
                $this->fillPriceBlockManuallyForTC($template, $options, $chemicalDetails);
            } catch (\Exception $e2) {
                Log::error("Both price table cloning methods failed: " . $e2->getMessage());
            }
        }
    }

    private function preparePriceRowDataForTC(array $options, array $chemicalDetails): array
    {
        $rowData = [];
        $i = 1;
        foreach ($options as $option) {
            $chemicalKey = $option['name'];
            if (isset($chemicalDetails[$chemicalKey])) {
                $details = $chemicalDetails[$chemicalKey];
                $rowData[] = [
                    'price_block_counter' => (string) $i,
                    'price_treatment_name' => htmlspecialchars($details['treatment_name'], ENT_XML1),
                    'price_psychological' => 'Rp ' . number_format($option['psychological_price'], 0, ',', '.'),
                    'price_final' => 'Rp ' . number_format($option['final_price'], 0, ',', '.'),
                    'price_guarantee' => $option['guarantee_period'],
                ];
                $i++;
            }
        }
        return $rowData;
    }

    private function fillPriceBlockManuallyForTC(TemplateProcessor $template, array $options, array $chemicalDetails): void
    {
        $i = 1;
        foreach ($options as $option) {
            $chemicalKey = $option['name'];
            if (isset($chemicalDetails[$chemicalKey])) {
                $details = $chemicalDetails[$chemicalKey];
                try {
                    $template->setValue("price_block_counter#{$i}", (string) $i);
                    $template->setValue("price_treatment_name#{$i}", htmlspecialchars($details['treatment_name'], ENT_XML1));
                    $template->setValue("price_final#{$i}", 'Rp ' . number_format($option['final_price'], 0, ',', '.'));
                    $template->setValue("price_psychological#{$i}", 'Rp ' . number_format($option['psychological_price'], 0, ',', '.'));
                    $template->setValue("price_guarantee#{$i}", $option['guarantee_period']);
                    Log::info("Successfully filled price_block (manual) #{$i}");
                } catch (\Exception $e) {
                    Log::error("Failed to fill price_block (manual) #{$i}: " . $e->getMessage());
                }
                $i++;
            }
        }
    }
}