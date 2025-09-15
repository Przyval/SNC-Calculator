<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Intervention\Image\Laravel\Facades\Image;
use PhpOffice\PhpWord\TemplateProcessor;

class ProposalController extends Controller
{
    public function generate(Request $request)
    {
        $proposalType = $request->get('proposal_type', 'pest_control');
        $serviceType = $request->get('service_type', 'pipanasi');

        $templatePath = storage_path("app/templates/{$serviceType}.docx");

        if (!file_exists($templatePath)) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $template = new TemplateProcessor($templatePath);

        // Fill general attributes
        $this->fillGeneralAttributes($template, $request);

        // Fill service-specific attributes
        $this->fillServiceSpecificAttributes($template, $serviceType, $request);

        // Handle steps/images
        $this->processImages($template, $request);

        // Generate output filename
        $outputFilename = $this->generateOutputFilename($proposalType, $serviceType, $request->get('client_name', 'client'));
        $outputPath = storage_path("app/generated/{$outputFilename}");

        // Ensure directory exists
        if (!file_exists(dirname($outputPath))) {
            mkdir(dirname($outputPath), 0755, true);
        }

        $template->saveAs($outputPath);

        return response()->download($outputPath)->deleteFileAfterSend(true);
    }

    private function fillGeneralAttributes($template, $request)
    {
        $generalData = [
            'number' => $request->get('number', $this->generateProposalNumber()),
            'type' => $request->get('type', 'Penawaran Harga Pest Control'),
            'client_name' => $request->get('client_name', ''),
            'address' => $request->get('address', ''),
            'total_technician' => $request->get('total_technician', 2),
            'estimated_time' => $request->get('estimated_time', '2-3 hari kerja'),
            'guarantee' => $request->get('guarantee', '1 tahun'),
        ];

        foreach ($generalData as $key => $value) {
            $template->setValue($key, $value);
        }
    }

    private function fillServiceSpecificAttributes($template, $serviceType, $request)
    {
        Log::info("Inside fillServiceSpecificAttributes. The serviceType is: " . $serviceType);
        switch ($serviceType) {
            case 'pipanasi':
                $this->fillPipanasiAttributes($template, $request);
                break;
            case 'spraying':
                $this->fillSprayingAttributes($template, $request);
                break;
            case 'inject_spraying':
                $this->fillInjectSprayingAttributes($template, $request);
                break;
        }
    }

    private function fillPipanasiAttributes($template, $request)
    {
        $area = $request->get('area_treatment', '100');
        Log::info($area);
        $pipanasiData = [
            'area_treatment' => $area,
        ];
        foreach ($pipanasiData as $key => $value) {
            $template->setValue($key, $value);
        }
    }

    private function fillSprayingAttributes($template, $request)
    {
        // Currently no specific attributes for spraying
        // Add here when needed
    }

    private function fillInjectSprayingAttributes($template, $request)
    {
        // Currently no specific attributes for inject_spraying
        // Add here when needed
    }

    private function processImages(TemplateProcessor $template, Request $request)
    {
        $imageGroups = $request->input('images', []);

        if (empty($imageGroups) || !is_array($imageGroups)) {
            $template->cloneBlock('image_block', 0);
            return;
        }

        $template->cloneBlock('image_block', count($imageGroups), true, true);

        $targetHeight = 300;
        $spacing = 10;

        foreach ($imageGroups as $i => $group) {
            $index = $i + 1;

            if (!is_array($group)) {
                continue;
            }

            $template->setValue("image_desc#{$index}", $group['description'] ?? '');

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
                    $img = Image::read($fullPath);
                    $img->scaleDown(null, $targetHeight);
                    $resized[] = $img;
                } catch (\Exception $e) {
                    continue;
                }
            }
        }

        if ($resized) {
            $totalWidth = array_sum(array_map(fn($img) => $img->width(), $resized)) + ($spacing * (count($resized) - 1));
            $canvas = Image::canvas($totalWidth, $targetHeight, '#ffffff');
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