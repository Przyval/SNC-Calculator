import { NextRequest, NextResponse } from 'next/server';
import { Workbook } from 'exceljs';

const LARAVEL_URL = process.env.NEXT_PUBLIC_LARAVEL_API_URL || 'http://localhost:8000';

function getSupportedExtension(url: string): 'jpeg' | 'png' | 'gif' {
    const parts = url.split('.');
    const ext = parts.pop()?.toLowerCase() || '';
    if (ext === 'jpg' || ext === 'jpeg') return 'jpeg';
    if (ext === 'png') return 'png';
    if (ext === 'gif') return 'gif';
    throw new Error(`Unsupported or missing image extension in URL: ${url}`);
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        if (!data.inspectionResults || !data.hasilPerhitungan || !data.client || !data.selectedKecamatan) {
            return new NextResponse('Incomplete data provided for export', { status: 400 });
        }
        const { client, hasilPerhitungan, selectedKecamatan, inspectionResults } = data;
        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet('Inspection Result');

        const titleStyle = { font: { name: 'Arial Black', size: 16, bold: true }, alignment: { vertical: 'middle' as const, horizontal: 'center' as const } };
        const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFC65911' } }, border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } } };
        const cellStyle = { alignment: { vertical: 'top' as const, wrapText: true }, border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } } };
        worksheet.mergeCells('A1:C1');
        worksheet.getCell('A1').value = 'HASIL INSPEKSI RAYAP';
        worksheet.getCell('A1').style = titleStyle;
        worksheet.getRow(1).height = 40;
        worksheet.getCell('A2').value = 'INFORMASI INSPEKSI';
        worksheet.getCell('A2').font = { bold: true, color: { argb: 'FFC65911' }, size: 12 };
        worksheet.getCell('B2').value = 'DETAIL PERHITUNGAN RISIKO';
        worksheet.getCell('B2').font = { bold: true, color: { argb: 'FFC65911' }, size: 12 };
        worksheet.getCell('C2').value = 'GAMBAR & DESKRIPSI';
        worksheet.getCell('C2').font = { bold: true, color: { argb: 'FFC65911' }, size: 12 };
        worksheet.getRow(2).height = 20;
        const inspectionInfo = [ { label: 'Nama Klien', value: client.name }, { label: 'Jam/Tanggal', value: inspectionResults.dateTime }, { label: 'Metode', value: inspectionResults.treatment }, { label: 'Diinput oleh', value: inspectionResults.agentName }, { label: 'Status', value: inspectionResults.status }, { label: 'Ringkasan Temuan', value: inspectionResults.summary }, { label: 'Rekomendasi Penanganan', value: inspectionResults.recommendation }, ];
        let rowA = 3;
        inspectionInfo.forEach(item => { worksheet.getCell(`A${rowA}`).value = { richText: [{ text: item.label, font: { bold: true } }] }; worksheet.getCell(`A${rowA}`).style = headerStyle; const valueCell = worksheet.getCell(`A${rowA + 1}`); valueCell.value = item.value; valueCell.style = cellStyle; rowA += 2; });
        const riskInfo = [ { label: 'Luas Tanah', value: `${hasilPerhitungan.luasTanah} m²` }, { label: 'Umur Bangunan', value: `${hasilPerhitungan.umurBangunan} tahun` }, { label: 'Material Bangunan', value: hasilPerhitungan.materialBangunan }, { label: 'Riwayat Rayap', value: hasilPerhitungan.riwayatRayap }, { label: 'Tingkat Kelembaban', value: `${hasilPerhitungan.tingkatKelembaban}%` }, { label: 'Jumlah Perabot Kayu', value: hasilPerhitungan.jumlahPerabotKayu }, { label: 'Lahan Kosong Disekitar', value: hasilPerhitungan.adaLahanKosongDisekitar }, { label: 'Jenis Lantai', value: hasilPerhitungan.jenisLantai }, { label: 'Kecamatan Terpilih', value: selectedKecamatan.name }, { label: 'Tingkat Risiko Kecamatan', value: selectedKecamatan.riskLevel }, { label: 'Skor Risiko', value: hasilPerhitungan.skorRisiko }, { label: 'Kategori Risiko', value: hasilPerhitungan.kategoriRisiko }, { label: 'Estimasi Kerugian', value: `Rp ${new Intl.NumberFormat('id-ID').format(hasilPerhitungan.estimasiKerugian)}` }, { label: 'Rekomendasi Layanan', value: hasilPerhitungan.rekomendasiLayanan }, ];
        let rowB = 3;
        riskInfo.forEach(item => { worksheet.getCell(`B${rowB}`).value = { richText: [{ text: item.label, font: { bold: true } }] }; worksheet.getCell(`B${rowB}`).style = headerStyle; const valueCell = worksheet.getCell(`B${rowB + 1}`); valueCell.value = item.value; valueCell.style = cellStyle; rowB += 2; });
        
        let imageRow = 3;
        if (inspectionResults.images && inspectionResults.images.length > 0) {
            for (const img of inspectionResults.images) {
                try {
                    const imageExtension = getSupportedExtension(img.url);
                    const imageUrl = `${LARAVEL_URL}${img.url}`;
                    const response = await fetch(imageUrl);
                    if (!response.ok) throw new Error(`Server returned ${response.status}`);
                    const imageBuffer = await response.arrayBuffer();
                    if (imageBuffer.byteLength === 0) throw new Error("Received an empty (0 byte) image buffer.");
                    const imageId = workbook.addImage({
                        buffer: imageBuffer,
                        extension: imageExtension,
                    });
                    
                    worksheet.getRow(imageRow).height = 165;
                    
                    worksheet.addImage(imageId, {
                        tl: { col: 2.05, row: imageRow - 0.95 },
                        ext: { width: 310, height: 210 }
                    });
                

                    const descCell = worksheet.getCell(`C${imageRow + 1}`);
                    descCell.value = img.description || 'Tidak ada deskripsi.';
                    descCell.style = cellStyle;
                    worksheet.getRow(imageRow + 1).height = 60;
                    imageRow += 2;
                } catch (error) {
                    // ... (error handling remains the same)
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    const errorCell = worksheet.getCell(`C${imageRow}`);
                    errorCell.value = { richText: [{ font: { bold: true, color: { argb: 'FFFF0000' } }, text: 'Gagal memuat gambar:\n' }, { text: `URL: ${img.url}\n` }, { text: `Error: ${errorMessage}` }] };
                    errorCell.style = { alignment: { wrapText: true, vertical: 'top' } };
                    worksheet.getRow(imageRow).height = 80;
                    imageRow++;
                }
            }
        } else {
            worksheet.getCell('C3').value = 'Tidak ada gambar.';
        }
        worksheet.getColumn('A').width = 40;
        worksheet.getColumn('B').width = 40;
        worksheet.getColumn('C').width = 40; 

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Hasil_Inspeksi_${client.name.replace(/ /g, '_')}.xlsx`;
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });
    } catch (error) {
        console.error('Failed to export Excel file:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return new NextResponse(`Internal Server Error: ${errorMessage}`, { status: 500 });
    }
}