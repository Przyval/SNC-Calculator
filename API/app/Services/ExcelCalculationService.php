<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Support\Facades\Log;

class ExcelCalculationService
{
    private string $templatePath;

    /**
     * @var array<string, string>
     */
    private array $materialCellMap = [
        'Expose Soil Treatent per Liter Larutan' => 'C65',
        'Premise Soil Treatent per Liter Larutan' => 'C66',
        'Agenda Soil Treatent per Liter Larutan' => 'C67',
        'Xterm AG Station' => 'C68',
        'Xterm IG Station' => 'C69',
        'Expose Wood Treatent per Liter Larutan' => 'C70',
        'Queen Killer' => 'C71',
        'Mata Bor kayu 2mm' => 'C74',
        'Mata Bor kayu 3mm' => 'C75',
        'Mata bor Hilti 6mm' => 'C78',
        'Mata Bor Hilti 8mm' => 'C79',
        'Mata Bor Hilti 10mm' => 'C80',
        'Semen Warna' => 'C81',
        'Premium' => 'C82',
        'Oli Fastron 10W-40SL' => 'C83',
        'Jarum B&G' => 'C84',
        'Masker untuk Klien' => 'C96',
        'Company Profile' => 'C97',
        'Laporan/SPK/Surat/Kontrak' => 'C98',
        'BAP' => 'C99',
        'LOG BOOK' => 'C100',
    ];

    private array $comparativeChemicals = [
        'Expose Soil Treatent per Liter Larutan',
        'Premise Soil Treatent per Liter Larutan',
        'Agenda Soil Treatent per Liter Larutan',
    ];

    public function __construct()
    {
        $this->templatePath = storage_path("app/templates/calculation_template.xlsx");
    }

    public function getCalculatedPrice(array $data): float
    {
        $spreadsheet = $this->getFilledSpreadsheet($data);
        return $spreadsheet->getActiveSheet()->getCell('O17')->getCalculatedValue();
    }

    public function getComparativePrices(array $data): array
    {
        $originalPrepSet = $data['preparationSet'] ?? [];
        $selectedChemicals = array_intersect(
            array_keys($originalPrepSet),
            $this->comparativeChemicals
        );

        if (empty($selectedChemicals)) {
            return [];
        }
        $otherPrepItems = array_diff_key($originalPrepSet, array_flip($this->comparativeChemicals));

        $comparisonResults = [];

        foreach ($selectedChemicals as $chemicalToCalculate) {
            $tempData = $data;
            $currentPrepSet = $otherPrepItems;

            foreach ($this->comparativeChemicals as $chem) {
                if (array_key_exists($chem, $originalPrepSet)) {
                    $currentPrepSet[$chem] = ($chem === $chemicalToCalculate) ? 1 : 0;
                }
            }

            $tempData['preparationSet'] = $currentPrepSet;

            Log::info("Calculating comparative price for '{$chemicalToCalculate}' with final prep set:", $currentPrepSet);

            $spreadsheet = $this->getFilledSpreadsheet($tempData);
            $sheet = $spreadsheet->getActiveSheet();

            $price = $sheet->getCell('O17')->getCalculatedValue();
            $quantity = 0;
            if ($chemicalToCalculate === 'Expose Soil Treatent per Liter Larutan') {
                $quantity = $sheet->getCell('M66')->getCalculatedValue();
            } else {
                $quantity = $sheet->getCell('M67')->getCalculatedValue();
            }
            $comparisonResults[$chemicalToCalculate] = [
                'price' => round($price),
                'formatted_price' => 'Rp ' . number_format(round($price), 0, ',', '.'),
                'auto_quantity_liter' => round($quantity, 2),
            ];
        }

        return $comparisonResults;
    }

    public function getFilledSpreadsheet(array $data): Spreadsheet
    {
        if (!file_exists($this->templatePath)) {
            throw new \Exception('Calculation template not found!');
        }

        $spreadsheet = IOFactory::load($this->templatePath);
        $sheet = $spreadsheet->getActiveSheet();

        $this->fillGeneralInfo($sheet, $data);
        $this->fillTransportationAndSdm($sheet, $data);
        $this->fillMaterialQuantities($sheet, $data['preparationSet'] ?? [], $data['additionalSet'] ?? []);
        $this->fillTimenWorkerEstimation($sheet, $data);

        return $spreadsheet;
    }

    private function fillTimenWorkerEstimation(Worksheet $sheet, array $data)
    {
        $luasTanah = $data['luasTanah'];
        $transportType = $data['transport'];
        $serviceType = $data['service_type'] ?? 'spraying';
        $time_estimation = 0;
        $worker_estimation = 0;

        if ($serviceType === 'baiting') {
            if ($luasTanah >= 1 && $luasTanah <= 999) {
                $time_estimation = 1;
                $worker_estimation = 2;
            } elseif ($luasTanah >= 1000) {
                $time_estimation = 2;
                $worker_estimation = 3;
            } else {
                $time_estimation = 0;
                $worker_estimation = 0;
                Log::warning("Baiting service type has area_treatment outside defined ranges: {$luasTanah}");
            }
        } else {
            $time_estimation = $luasTanah <= 200 ? 4 : ($luasTanah <= 400 ? 7 : ($luasTanah <= 500 ? 10 : 30));
            $worker_estimation = $luasTanah <= 300 ? 2 : ($luasTanah <= 500 ? 3 : 5);
        }
        if ($transportType === 'mobil') {
            $sheet->setCellValue('C29', $time_estimation);
            $sheet->setCellValue('C41', $time_estimation);
            $sheet->setCellValue('E41', $worker_estimation);
            $sheet->setCellValue('C30', 0)->setCellValue('C42', 0);
        } else {
            $sheet->setCellValue('C30', $time_estimation);
            $sheet->setCellValue('C42', $time_estimation);
            $sheet->setCellValue('E42', $worker_estimation);
            $sheet->setCellValue('C29', 0)->setCellValue('C41', 0);
        }

    }

    private function fillGeneralInfo(Worksheet $sheet, array $data): void
    {
        $sheet->setCellValue('C1', $data['client_name']);
        $sheet->setCellValue('C5', $data['address']);
        $sheet->setCellValue('C20', $data['jarakTempuh']);
        $sheet->setCellValue('C22', $data['luasTanah']);
        $sheet->setCellValue('C23', $data['jumlahLantai']);
    }

    private function fillTransportationAndSdm(Worksheet $sheet, array $data): void
    {
        $monitoringQty = $data['monitoringPerBulan'];
        $transportType = $data['transport'];

        if ($transportType === 'mobil') {
            $sheet->setCellValue('C30', $monitoringQty);
            $sheet->setCellValue('C45', $monitoringQty);
            $sheet->setCellValue('C31', 0)->setCellValue('C46', 0);
        } else {
            $sheet->setCellValue('C31', $monitoringQty);
            $sheet->setCellValue('C46', $monitoringQty);
            $sheet->setCellValue('C30', 0)->setCellValue('C45', 0);
        }
    }

    private function fillMaterialQuantities(Worksheet $sheet, array $data): void
    {
        $prepItems = $data['preparationSet'] ?? [];
        $addItems = $data['additionalSet'] ?? [];
        $serviceType = $data['service_type'] ?? null;

        foreach ($this->materialCellMap as $cellAddress) {
            $sheet->setCellValue($cellAddress, 0);
        }

        $allItems = array_merge($prepItems, $addItems);

        if ($serviceType === 'baiting') {
            Log::info("Baiting service detected. Forcing soil treatment chemical quantities to 0.");
            unset($allItems['Expose Soil Treatent per Liter Larutan']);
            unset($allItems['Premise Soil Treatent per Liter Larutan']);
            unset($allItems['Agenda Soil Treatent per Liter Larutan']);
        }

        foreach ($allItems as $name => $quantity) {
            if (isset($this->materialCellMap[$name])) {
                $sheet->setCellValue($this->materialCellMap[$name], $quantity);
            } else {
                Log::warning("Unmapped material in Excel calculation: {$name}");
            }
        }
    }
}