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
        'Agadi Treatent per Liter Larutan' => 'C65',
        'Expose Soil Treatent per Liter Larutan' => 'C66',
        'Xterm AG Station' => 'C67',
        'Xterm IG Station' => 'C68',
        'Expose Wood Treatent per Liter Larutan' => 'C69',
        'Queen Killer' => 'C70',
        'Mata Bor kayu 2mm' => 'C73',
        'Mata Bor kayu 3mm' => 'C74',
        'Mata bor Hilti 6mm' => 'C77',
        'Mata Bor Hilti 8mm' => 'C78',
        'Mata Bor Hilti 10mm' => 'C79',
        'Semen Warna' => 'C80',
        'Premium' => 'C81',
        'Oli Fastron 10W-40SL' => 'C82',
        'Jarum B&G' => 'C76',
        'Masker untuk Klien' => 'C95',
        'Company Profile' => 'C96',
        'Laporan/SPK/Surat/Kontrak' => 'C97',
        'BAP' => 'C98',
        'LOG BOOK' => 'C99',
    ];

    public function __construct()
    {
        $this->templatePath = storage_path("app/templates/calculation_template.xlsx");
    }

    /**
     * Main method for the API: calculates the price and returns just the final value.
     */
    public function getCalculatedPrice(array $data): float
    {
        $spreadsheet = $this->getFilledSpreadsheet($data);
        return $spreadsheet->getActiveSheet()->getCell('O17')->getCalculatedValue();
    }

    /**
     * Main method for the Proposal Generator: returns the entire filled spreadsheet object.
     */
    public function getFilledSpreadsheet(array $data): Spreadsheet
    {
        if (!file_exists($this->templatePath)) {
            throw new \Exception('Calculation template not found!');
        }

        $spreadsheet = IOFactory::load($this->templatePath);
        $sheet = $spreadsheet->getActiveSheet();

        $this->fillGeneralInfo($sheet, $data);
        $this->fillTransportationAndSdm($sheet, $data);
        $this->fillMaterialQuantities($sheet, $data['preparationSet'], $data['additionalSet']);
        $this->fillTimenWorkerEstimation($sheet, $data);
        
        return $spreadsheet;
    }

    private function fillTimenWorkerEstimation(Worksheet $sheet, array $data)
    {
        $luasTanah = $data['luasTanah'];
        $time_estimation = $luasTanah <= 200 ? 4 : ($luasTanah <= 400 ? 7 : ($luasTanah <= 500 ? 10 : 30));
        $worker_estimation = $luasTanah <= 300 ? 2 : ($luasTanah <= 500 ? 3 : 5);
        $transportType = $data['transport'];
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

    private function fillMaterialQuantities(Worksheet $sheet, array $prepItems, array $addItems): void
    {
        $allItems = array_merge($prepItems, $addItems);
        foreach ($allItems as $name => $quantity) {
            if (isset($this->materialCellMap[$name])) {
                $sheet->setCellValue($this->materialCellMap[$name], $quantity);
            } else {
                Log::warning("Unmapped material in Excel calculation: {$name}");
            }
        }
    }
}