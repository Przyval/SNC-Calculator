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
use ZipArchive;

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

        try {
            $documents = $this->generateDocuments($validated, $allServicePrices, $separatedItems);
            $zipPath = $this->createZipArchive($validated['client_name'], $documents, $serviceTypes);
            $this->cleanupTempFiles($documents);
            
            return response()->download($zipPath)->deleteFileAfterSend(true);
            
        } catch (\Exception $e) {
            Log::error('Document generation failed: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to generate documents',
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
            // Fallback to single price
            $data['service_type'] = 'inject_spraying';
            $basePrice = $this->calculationService->getCalculatedPrice($data);
            $adjustedPrices = $this->applyServicePriceAdjustments('inject_spraying', $basePrice, $data['luasTanah']);
            
            return [[
                'name' => 'Standard Treatment',
                'treatment' => 'inject_spraying',
                'base_price' => $basePrice,
                'final_price' => $adjustedPrices['final_price'],
                'psychological_price' => $adjustedPrices['psychological_price'],
                'guarantee_period' => $this->getGuaranteePeriod('inject_spraying'),
            ]];
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
        
        return [[
            'name' => 'General Pest Control',
            'display_name' => 'Pengendalian Hama Umum',
            'treatment' => 'general_pest_control',
            'base_price' => $basePrice,
            'final_price' => $adjustedPrices['final_price'],
            'psychological_price' => $adjustedPrices['psychological_price'],
            'guarantee_period' => '1 tahun',
            'description' => 'Layanan pengendalian hama umum (kecoa, semut, lalat, nyamuk, dll)',
        ]];
    }

    /**
     * Calculate Rodent Control prices (baiting method)
     */
    private function calculateRCPrices(array $data): array
    {
        $data['service_type'] = 'baiting';
        $basePrice = $this->calculationService->getCalculatedPrice($data);
        $adjustedPrices = $this->applyServicePriceAdjustments('baiting', $basePrice, $data['luasTanah']);
        
        return [[
            'name' => 'Rodent Control - Baiting',
            'display_name' => 'Pengendalian Tikus - Umpan',
            'treatment' => 'baiting',
            'base_price' => $basePrice,
            'final_price' => $adjustedPrices['final_price'],
            'psychological_price' => $adjustedPrices['psychological_price'],
            'guarantee_period' => '1 tahun',
            'description' => 'Pengendalian tikus menggunakan metode umpan racun',
        ]];
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
        
        return [[
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
        ]];
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
     * Generate all documents (proposals and contracts)
     */
    private function generateDocuments(array $validated, array $allServicePrices, array $separatedItems): array
    {
        $documents = [];
        
        foreach ($allServicePrices as $serviceType => $priceData) {
            // Generate proposal (always generate)
            try {
                $proposalPath = $this->generateDocument('proposal', $serviceType, $validated, $priceData, $separatedItems);
                $documents[] = $proposalPath;
                Log::info("Generated proposal for {$serviceType}: {$proposalPath}");
            } catch (\Exception $e) {
                Log::error("Failed to generate proposal for {$serviceType}: " . $e->getMessage());
                // Continue with other services
            }
            
            // Generate contract (optional - only if you want separate contracts)
            // Comment out if you don't need separate contract documents
            /* 
            try {
                $contractPath = $this->generateDocument('contract', $serviceType, $validated, $priceData, $separatedItems);
                $documents[] = $contractPath;
                Log::info("Generated contract for {$serviceType}: {$contractPath}");
            } catch (\Exception $e) {
                Log::warning("Contract generation skipped for {$serviceType}: " . $e->getMessage());
            }
            */
        }
        
        if (empty($documents)) {
            throw new \Exception("No documents were generated successfully");
        }
        
        return $documents;
    }

    /**
     * Generate a single document (proposal or contract)
     */
    private function generateDocument(string $docType, string $serviceType, array $validated, array $priceData, array $separatedItems): string
    {
        $templateMap = [
            'TC' => 'inject_spraying',
            'GPC' => 'pengendalian_kecoa',
            'RC' => 'baiting',
            'GPRC' => 'integrated_pest_management_(gprc)',
        ];

        $serviceDetails = $validated['service_details'][$serviceType] ?? [];

        if ($serviceType === 'TC' && isset($serviceDetails['treatment'])) {
            $tcTreatment = strtolower(str_replace('_', '_', $serviceDetails['treatment']));
            $availableTemplates = ['pipanasi', 'refill_pipanasi', 'spraying', 'inject_spraying'];
            if (in_array($tcTreatment, $availableTemplates)) {
                $templateMap['TC'] = $tcTreatment;
            }
        }

        if ($serviceType === 'RC' && isset($serviceDetails['treatment']) && is_array($serviceDetails['treatment'])) {
            if (in_array('baiting', $serviceDetails['treatment']) && in_array('trapping', $serviceDetails['treatment'])) {
                $templateMap['RC'] = 'baiting_&_trapping';
            } elseif (in_array('baiting', $serviceDetails['treatment'])) {
                $templateMap['RC'] = 'baiting';
            }
        }

        $templateName = $templateMap[$serviceType] ?? 'general_template';
        $templatePath = storage_path("app/templates/{$templateName}.docx");
        
        if (!file_exists($templatePath)) {
            $templatePath = storage_path("app/templates/general_template.docx");
            $templateName = 'general_template';
        }
        
        if (!file_exists($templatePath)) {
            throw new \Exception("Template not found: {$templateName}.docx and no general_template.docx fallback available");
        }

        Log::info("Using template: {$templateName}.docx for service: {$serviceType}");

        $template = new TemplateProcessor($templatePath);
        
        $this->fillGeneralAttributes($template, $validated, $serviceType, $serviceDetails);
        
        $this->processImages($template, $validated['images'] ?? []);
        
        $this->fillPriceComparison($template, $priceData, $serviceType, $validated['area_treatment']);
        
        $this->fillMaterialList($template, $separatedItems[$serviceType] ?? []);
        
        $this->fillServiceSpecificDetails($template, $serviceType, $serviceDetails);
        
        $this->clearUnusedPlaceholders($template);
        
        $outputFilename = $this->generateOutputFilename($docType, $serviceType, $validated['client_name']);
        $outputPath = storage_path("app/generated/{$outputFilename}");
        
        if (!file_exists(dirname($outputPath))) {
            mkdir(dirname($outputPath), 0755, true);
        }
        
        $template->saveAs($outputPath);
        
        return $outputPath;
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
     * Create ZIP archive with all documents
     */
    private function createZipArchive(string $clientName, array $documents, array $serviceTypes): string
    {
        $cleanClientName = preg_replace('/[^A-Za-z0-9\-]/', '', str_replace(' ', '-', $clientName));
        $serviceString = implode('_', $serviceTypes);
        $zipFileName = "documents_{$serviceString}_{$cleanClientName}_" . date('Y-m-d') . ".zip";
        $zipPath = storage_path("app/generated/{$zipFileName}");

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
            throw new \Exception("Cannot create ZIP archive at: {$zipPath}");
        }

        foreach ($documents as $docPath) {
            $zip->addFile($docPath, basename($docPath));
        }
        
        $zip->close();

        return $zipPath;
    }

    /**
     * Clean up temporary document files
     */
    private function cleanupTempFiles(array $files): void
    {
        foreach ($files as $file) {
            if (file_exists($file)) {
                unlink($file);
            }
        }
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
            $template->setValue('inspection_heading', '');
            try {
                $template->cloneBlock('image_block', 0);
            } catch (\Exception $e) {
                // Ignore if block doesn't exist
            }
            return;
        }

        $template->setValue('inspection_heading', 'HASIL INSPEKSI');
        
        try {
            $template->cloneBlock('image_block', count($imageGroups), true, true);
            
            $targetHeight = 300;
            $spacing = 10;
            
            foreach ($imageGroups as $i => $group) {
                $index = $i + 1;
                $description = !empty($group['description']) ? $group['description'] : 'Tidak ada detail';
                $template->setValue("image_desc#{$index}", $description);
                
                if (!empty($group['paths'])) {
                    $this->processAndSetImage($template, "image_content#{$index}", $group['paths'], $index, $targetHeight, $spacing);
                } else {
                    $template->setValue("image_content#{$index}", '');
                }
            }
        } catch (\Exception $e) {
            Log::error("Failed to process images: " . $e->getMessage());
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

    private function clearUnusedPlaceholders(TemplateProcessor $template)
    {
        $placeholders = [
            'inspection_heading', 'image_desc', 'image_content',
            'option_name', 'option_description', 'option_final_price',
            'option_psychological_price', 'option_guarantee', 'option_quantity',
            'service_name', 'service_description', 'final_price', 'psychological_price',
            'material_name', 'material_qty',
            'tc_treatment', 'tc_status',
            'gpc_target_hama', 'gpc_area_aplikasi', 'gpc_bahan_aktif', 'gpc_status', 'gpc_treatment',
            'rc_tingkat_infestasi', 'rc_rekomendasi_sanitasi', 'rc_treatment',
            'gprc_target_hama', 'gprc_tingkat_infestasi', 'gprc_treatment',
        ];

        foreach ($placeholders as $placeholder) {
            try {
                $template->setValue($placeholder, '');
            } catch (\Exception $e) {
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
}