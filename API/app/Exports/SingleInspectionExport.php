<?php
namespace App\Exports;

use App\Models\RiskCalculation;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithDrawings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

class SingleInspectionExport implements FromCollection, WithEvents, WithDrawings, ShouldAutoSize
{
    protected $calculation;

    public function __construct(RiskCalculation $calculation)
    {
        $this->calculation = $calculation->load(['client', 'user', 'inspection.images']);
    }

    public function collection()
    {
        return new Collection([]);
    }

    public function drawings()
    {
        $drawings = [];
        if ($this->calculation->inspection && $this->calculation->inspection->images->count() > 0) {
            $row = 9;
            foreach ($this->calculation->inspection->images as $image) {
                $imageSystemPath = storage_path('app/public/' . Str::remove('/storage/', $image->url));

                if (file_exists($imageSystemPath)) {
                    $drawing = new Drawing();
                    $drawing->setName('Foto Inspeksi');
                    $drawing->setDescription($image->description ?? 'Foto temuan');
                    $drawing->setPath($imageSystemPath);
                    $drawing->setHeight(150);
                    $drawing->setCoordinates('A' . $row);
                    
                    $drawings[] = $drawing;
                    $row += 8;
                }
            }
        }
        return $drawings;
    }
    
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $calc = $this->calculation;
                $inspection = $calc->inspection;
                
                $sheet->mergeCells('A1:D1');
                $sheet->setCellValue('A1', 'HASIL INSPEKSI RAYAP');
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);

                $row = 3;

                $sheet->setCellValue('A'.$row, 'Informasi Inspeksi')->getStyle('A'.$row)->getFont()->setBold(true);
                $row++;
                $sheet->setCellValue('A'.$row, 'Nama Klien:')->setCellValue('B'.$row, $calc->client->name ?? 'N/A');
                $row++;
                $sheet->setCellValue('A'.$row, 'Jam/Tanggal:')->setCellValue('B'.$row, optional($inspection)->date_time ?? 'N/A');
                $row++;
                $sheet->setCellValue('A'.$row, 'Metode:')->setCellValue('B'.$row, optional($inspection)->treatment ?? 'N/A');
                $row++;
                $sheet->setCellValue('A'.$row, 'Diinput oleh:')->setCellValue('B'.$row, optional($inspection)->agent_name ?? ($calc->user->name ?? 'N/A'));
                
                $row = 3;
                $sheet->setCellValue('C'.$row, 'Ringkasan Temuan')->getStyle('C'.$row)->getFont()->setBold(true);
                $row++;
                $sheet->setCellValue('C'.$row, 'Jumlah Foto:')->setCellValue('D'.$row, $inspection ? $inspection->images->count() : 0);
                $row++;
                $sheet->setCellValue('C'.$row, 'Status:')->setCellValue('D'.$row, optional($inspection)->status ?? 'N/A');
                $row++;
                $sheet->setCellValue('C'.$row, 'Kategori Risiko:')->setCellValue('D'.$row, $calc->kategori_risiko ?? 'N/A');
                $row++;
                $sheet->setCellValue('C'.$row, 'Estimasi Kerugian:')->setCellValue('D'.$row, 'Rp ' . number_format($calc->estimasi_kerugian ?? 0, 0, ',', '.'));

                $row = 8;
                $sheet->setCellValue('A'.$row, 'FOTO TEMUAN')->getStyle('A'.$row)->getFont()->setBold(true);
                $row++;
                if ($inspection && $inspection->images->count() > 0) {
                    foreach ($inspection->images as $index => $image) {
                        $sheet->getRowDimension($row)->setRowHeight(120);
                        $sheet->mergeCells('B'.$row.':D'.($row+7));
                        $sheet->setCellValue('B' . $row, 'Deskripsi Gambar ' . ($index + 1) . ': ' . PHP_EOL . ($image->description ?? 'Tidak ada deskripsi.'));
                        $sheet->getStyle('B' . $row)->getAlignment()->setWrapText(true)->setVertical('top');
                        $row += 8;
                    }
                } else {
                    $sheet->setCellValue('A' . $row, 'Tidak ada foto inspeksi.');
                    $row++;
                }
                
                $row++;
                $sheet->setCellValue('A'.$row, 'Kesimpulan & Rekomendasi')->getStyle('A'.$row)->getFont()->setBold(true);
                $row++;
                $sheet->mergeCells('A'.$row.':D'.($row+3));
                $sheet->setCellValue('A'.$row, optional($inspection)->summary ?? 'N/A')->getStyle('A'.$row)->getAlignment()->setWrapText(true)->setVertical('top');
                $row+=4;
                
                $sheet->setCellValue('A'.$row, 'Opsi Penanganan Lanjutan:')->getStyle('A'.$row)->getFont()->setBold(true);
                $row++;
                $sheet->mergeCells('A'.$row.':D'.($row+3));
                $sheet->setCellValue('A'.$row, optional($inspection)->recommendation ?? 'N/A')->getStyle('A'.$row)->getAlignment()->setWrapText(true)->setVertical('top');
            },
        ];
    }
}