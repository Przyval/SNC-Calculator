"use client";

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Image as ImageIcon, Search, ChevronLeft, ChevronRight } from "lucide-react";
import ImageModal from './image-modal';
import { da } from 'date-fns/locale';

interface InspectionImage {
    url: string;
    description: string;
}

interface Inspection {
    id: number;
    date_time: string;
    treatment: string;
    status: string;
    summary: string;
    recommendation: string;
    agent_name: string;
    images: InspectionImage[];
}

interface Record {
    id: number;
    client: { name: string };
    user: { name: string };
    kategoriRisiko: string;
    created_at: string;
    inspection: Inspection | null;
}

interface AllRecordsProps {
    accessToken?: string;
}

interface PaginationData {
    current_page: number;
    last_page: number;
    total: number;
    from: number;
    to: number;
}

export default function AllRecords({ accessToken }: AllRecordsProps) {
    const [records, setRecords] = useState<Record[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExportingAll, setIsExportingAll] = useState(false);
    const [isExportingSingle, setIsExportingSingle] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalImage, setModalImage] = useState<{ images: InspectionImage[], clientName: string } | null>(null);
    const [pagination, setPagination] = useState<PaginationData | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

    useEffect(() => {
        const fetchRecords = async () => {
            if (!accessToken) return;
            setIsLoading(true);
            try {
                const response = await fetch(`${apiUrl}/risk-calculations?search=${searchTerm}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json',
                    }
                });
                if (!response.ok) throw new Error('Gagal memuat data');
                const data = await response.json();
                console.log(data);
                
                setRecords(data.data);
                setPagination({
                    current_page: data.current_page,
                    last_page: data.last_page,
                    total: data.total,
                    from: data.from,
                    to: data.to,
                });
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const debounceFetch = setTimeout(() => {
            fetchRecords();
        }, 500);

        return () => clearTimeout(debounceFetch);
    }, [accessToken, searchTerm, apiUrl, currentPage]);

    const handleExportAll = async () => {
        setIsExportingAll(true);
        try {
            const response = await fetch(`${apiUrl}/export-all-inspections`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) throw new Error('Gagal mengekspor data');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Semua_Data_Inspeksi.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error("Export all error:", error);
        } finally {
            setIsExportingAll(false);
        }
    };

    const handleExportSingle = async (recordId: number, clientName: string) => {
        setIsExportingSingle(recordId);
        try {
            const response = await fetch(`${apiUrl}/export-single-inspection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ id: recordId }),
            });

            if (!response.ok) throw new Error(`Gagal mengekspor data untuk ${clientName}`);

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Inspeksi_${clientName.replace(/ /g, '_')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error("Export single error:", error);
        } finally {
            setIsExportingSingle(null);
        }
    };


    if (isLoading) {
        return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
    }

    return (
        <div className="bg-black/80 p-6 rounded-lg shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-1/3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Cari nama klien atau agen..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-10 bg-gray-900 border-gray-700 text-white"
                    />
                </div>
                <Button onClick={handleExportAll} disabled={isExportingAll} className="bg-amber-500 hover:bg-amber-600 text-black">
                    {isExportingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    Export Semua
                </Button>
            </div>

            <div className="overflow-x-auto">
                <Table className="text-white">
                    <TableHeader>
                        <TableRow className="border-gray-700 hover:bg-gray-800">
                            <TableHead className="text-amber-400">Nama Klien</TableHead>
                            <TableHead className="text-amber-400">Agen</TableHead>
                            <TableHead className="text-amber-400">Kategori Risiko</TableHead>
                            <TableHead className="text-amber-400">Tanggal Input</TableHead>
                            <TableHead className="text-amber-400 text-center">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length > 0 ? records.map((record) => (
                            <TableRow key={record.id} className="border-gray-800">
                                <TableCell>{record.client.name}</TableCell>
                                <TableCell>{record.user.name}</TableCell>
                                <TableCell>{record.kategoriRisiko}</TableCell>
                                <TableCell>{new Date(record.created_at).toLocaleDateString('id-ID')}</TableCell>
                                <TableCell className="flex justify-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                                        onClick={() => record.inspection && setModalImage({ images: record.inspection.images, clientName: record.client.name })}
                                        disabled={!record.inspection || record.inspection.images.length === 0}
                                    >
                                        <ImageIcon className="h-4 w-4 mr-1" />
                                        Gambar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                                        onClick={() => handleExportSingle(record.id, record.client.name)}
                                        disabled={isExportingSingle === record.id}
                                    >
                                        {isExportingSingle === record.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                                    Tidak ada data ditemukan.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && pagination.last_page > 1 && (
                <div className="flex items-center justify-between mt-6 text-white">
                    <span className="text-sm text-gray-400">
                        Menampilkan {pagination.from} sampai {pagination.to} dari {pagination.total} data
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="text-white border-gray-600"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Sebelumnya
                        </Button>
                        <span className="text-sm font-semibold">
                            {currentPage} / {pagination.last_page}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === pagination.last_page}
                            className="text-white border-gray-600"
                        >
                            Selanjutnya
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {modalImage && <ImageModal data={modalImage} onClose={() => setModalImage(null)} />}
        </div>
    );
}