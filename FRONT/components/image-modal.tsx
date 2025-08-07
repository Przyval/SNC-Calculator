"use client";

import Image from "next/image";
import { X } from "lucide-react";

interface InspectionImage {
    url: string;
    description: string;
}

interface ImageModalProps {
    data: {
        images: InspectionImage[];
        clientName: string;
    };
    onClose: () => void;
}
const laravelLoader = ({ src }: { src: string }) => {
  const laravelUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || 'http://localhost:8000';
  return `${laravelUrl}${src}`;
};
export default function ImageModal({ data, onClose }: ImageModalProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 text-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-amber-400">Foto Inspeksi: {data.clientName}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    {data.images.map((image, index) => (
                        <div key={index} className="bg-gray-800 p-4 rounded-lg">
                            <div className="relative w-full h-80 rounded-md overflow-hidden mb-3">
                                <Image
                                    loader={laravelLoader}
                                    src={image.url}
                                    alt={`Inspection image ${index + 1}`}
                                    layout="fill"
                                    objectFit="contain"
                                />
                            </div>
                            <p className="text-gray-300 whitespace-pre-line">{image.description || "Tidak ada deskripsi."}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}