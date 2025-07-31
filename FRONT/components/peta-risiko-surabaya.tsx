"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { MapPin, AlertTriangle, Info, X, Search, Compass, Layers, ZoomIn, ZoomOut, Filter, LocateFixed } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import pointInPolygon from 'point-in-polygon';

interface KecamatanData {
  id: string
  name: string
  riskLevel: "tinggi" | "sedang" | "rendah"
  affectedHomes: number
  totalHomes: number
  description: string
  coordinates: {
    x: number
    y: number
  }
  path: string
  region: "barat" | "utara" | "pusat" | "timur" | "selatan"
  geoJsonPolygon?: number[][]
}

interface PetaRisikoSurabayaProps {
  onKecamatanSelected: (kecamatan: KecamatanData) => void
}

export default function PetaRisikoSurabaya({ onKecamatanSelected }: PetaRisikoSurabayaProps) {
  // Existing states
  const [selectedKecamatan, setSelectedKecamatan] = useState<KecamatanData | null>(null)
  const [hoveredKecamatan, setHoveredKecamatan] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [filterRegion, setFilterRegion] = useState<string>("all")
  const [filterRisk, setFilterRisk] = useState<string>("all")
  const [showLayers, setShowLayers] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showRoads, setShowRoads] = useState(false)
  const [showWaterBodies, setShowWaterBodies] = useState(true)
  const [showLandmarks, setShowLandmarks] = useState(false)
  const [mapTheme, setMapTheme] = useState<"standard" | "satellite" | "dark">("standard")

  // New states for GPS functionality
  const [gpsLockedKecamatan, setGpsLockedKecamatan] = useState<KecamatanData | null>(null)
  const [locationStatus, setLocationStatus] = useState<"loading" | "detected" | "outside_map" | "permission_denied" | "idle">(
    "loading",
  )
  const isGpsLocked = gpsLockedKecamatan !== null

  const mapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Data kecamatan Surabaya (remains unchanged)
  const kecamatanData: KecamatanData[] = [
    // SURABAYA BARAT (WEST)
    {
      id: "pakal",
      name: "Pakal",
      riskLevel: "sedang",
      affectedHomes: 5,
      totalHomes: 10,
      description:
        "Pakal memiliki campuran area pemukiman baru dan lama. Beberapa area memiliki risiko tinggi terutama yang dekat dengan sungai dan area hijau.",
      coordinates: { x: 15, y: 20 },
      path: "M10,10 L5,35 L20,50 L30,35 L25,25 L15,15 Z",
      region: "barat",
      geoJsonPolygon: [
        [112.63150787, -7.2605052], [112.61721039, -7.25752592], [112.61455536, -7.24820757], [112.60349274, -7.24763536], [112.60459137, -7.23331451], [112.5989151, -7.22958851], [112.59268951, -7.20230389], [112.61344147, -7.20904303], [112.62567902, -7.20331717], [112.6272583, -7.22245979], [112.63558197, -7.23548222], [112.63150787, -7.2605052]
      ]
    },
    {
      id: "benowo",
      name: "Benowo",
      riskLevel: "tinggi",
      affectedHomes: 7,
      totalHomes: 10,
      description:
        "Benowo memiliki banyak area bekas rawa dan dekat dengan tambak. Kondisi tanah yang lembab dan sejarah area sebagai lahan basah membuat risiko serangan rayap sangat tinggi.",
      coordinates: { x: 35, y: 30 },
      path: "M25,25 L30,35 L45,40 L50,30 L45,20 L25,25 Z",
      region: "barat",
      geoJsonPolygon: [
        [112.63279724, -7.26402998], [112.63150787, -7.2605052], [112.63558197, -7.23548222], [112.6272583, -7.22245979], [112.62567902, -7.20331717], [112.65917206, -7.19635439], [112.66149139, -7.1930027], [112.66210175, -7.20852995], [112.66837311, -7.22010994], [112.66060638, -7.23724985], [112.65441895, -7.24261999], [112.65962219, -7.26253986], [112.65223694, -7.25767994], [112.63279724, -7.26402998]
      ]
    },
    {
      id: "lakarsantri",
      name: "Lakarsantri",
      riskLevel: "tinggi",
      affectedHomes: 7,
      totalHomes: 10,
      description:
        "Kecamatan Lakarsantri memiliki tingkat kelembaban tinggi dan banyak area hijau yang menjadi habitat alami rayap. Bangunan di area ini sering menggunakan material kayu yang rentan terhadap serangan rayap.",
      coordinates: { x: 20, y: 70 },
      path: "M10,60 L15,85 L30,90 L40,75 L35,65 L25,75 L20,50 Z",
      region: "barat",
      geoJsonPolygon: [
        [112.66456604, -7.35144043], [112.65634155, -7.35682011], [112.65383148, -7.33899784], [112.64850616, -7.33530045], [112.64935303, -7.31456327], [112.62941742, -7.31164026], [112.62865448, -7.28963995], [112.64559937, -7.28887987], [112.67193604, -7.29252338], [112.67160797, -7.31753016], [112.67499542, -7.33310366], [112.66525269, -7.34040356], [112.66456604, -7.35144043]
      ]
    },
    {
      id: "sambikerep",
      name: "Sambikerep",
      riskLevel: "tinggi",
      affectedHomes: 6,
      totalHomes: 10,
      description:
        "Sambikerep memiliki banyak perumahan baru yang dibangun di atas lahan bekas area pertanian. Kondisi tanah yang sebelumnya digunakan untuk pertanian menciptakan lingkungan ideal bagi koloni rayap.",
      coordinates: { x: 30, y: 45 },
      path: "M20,50 L30,35 L45,40 L40,50 L35,65 Z",
      region: "barat",
      geoJsonPolygon: [
        [112.68412018, -7.27687073], [112.67858887, -7.28373337], [112.67193604, -7.29252338], [112.64559937, -7.28887987], [112.62865448, -7.28963995], [112.62688446, -7.27648211], [112.63279724, -7.26402998], [112.65223694, -7.25767994], [112.65962219, -7.26253986], [112.67642975, -7.26262808], [112.68412018, -7.27687073]
      ]
    },
    {
      id: "tandes",
      name: "Tandes",
      riskLevel: "sedang",
      affectedHomes: 5,
      totalHomes: 10,
      description:
        "Tandes memiliki campuran area komersial dan pemukiman. Beberapa area memiliki sejarah sebagai lahan basah yang meningkatkan risiko rayap.",
      coordinates: { x: 45, y: 50 },
      path: "M40,50 L45,40 L55,45 L60,55 L50,60 Z",
      region: "barat",
      geoJsonPolygon: [
        [112.65962219, -7.26253986], [112.65441895, -7.24261999], [112.66060638, -7.23724985], [112.67688751, -7.2490201], [112.69204712, -7.25273991], [112.68447113, -7.27502775], [112.68412018, -7.27687073], [112.67642975, -7.26262808], [112.65962219, -7.26253986]
      ]
    },
    {
      id: "sukomanunggal",
      name: "Sukomanunggal",
      riskLevel: "sedang",
      affectedHomes: 4,
      totalHomes: 10,
      description:
        "Sukomanunggal memiliki pemukiman padat dengan berbagai usia bangunan. Bangunan yang lebih tua memiliki risiko lebih tinggi karena sistem anti-rayap yang mungkin sudah tidak efektif.",
      coordinates: { x: 50, y: 45 },
      path: "M45,40 L55,45 L60,40 L55,35 L50,30 Z",
      region: "barat",
      geoJsonPolygon: [
        [112.68447113, -7.27502775], [112.69204712, -7.25273991], [112.71434021, -7.25611019], [112.70860291, -7.27571535], [112.70220947, -7.28479767], [112.68447113, -7.27502775]
      ]
    },
    {
      id: "asemrowo",
      name: "Asemrowo",
      riskLevel: "sedang",
      affectedHomes: 5,
      totalHomes: 10,
      description:
        "Asemrowo adalah area industri dengan beberapa pemukiman. Bangunan industri sering menggunakan material yang kurang disukai rayap, namun pemukiman di sekitarnya tetap berisiko.",
      coordinates: { x: 55, y: 35 },
      path: "M50,30 L55,35 L60,40 L65,35 L60,25 L50,30 Z",
      region: "barat",
      geoJsonPolygon: [
        [112.71711731, -7.2471199], [112.71508026, -7.25506735], [112.71434021, -7.25611019], [112.69204712, -7.25273991], [112.67688751, -7.2490201], [112.66060638, -7.23724985], [112.66837311, -7.22010994], [112.68627167, -7.22540998], [112.70623779, -7.22476006], [112.71033478, -7.24018431], [112.71711731, -7.2471199]
      ]
    },

    // SURABAYA UTARA (NORTH)
    {
      id: "krembangan",
      name: "Krembangan",
      riskLevel: "tinggi",
      affectedHomes: 6,
      totalHomes: 10,
      description:
        "Krembangan adalah area dekat pelabuhan dengan banyak bangunan tua. Kombinasi kelembaban tinggi dari laut dan usia bangunan menciptakan kondisi ideal bagi rayap.",
      coordinates: { x: 65, y: 30 },
      path: "M60,25 L65,35 L75,35 L80,25 L70,20 L60,25 Z",
      region: "utara",
      geoJsonPolygon: [
        [112.70623779, -7.22476006], [112.72158813, -7.21027994], [112.73827362, -7.23170996], [112.74259186, -7.24403238], [112.7279129, -7.24243021], [112.71711731, -7.2471199], [112.71033478, -7.24018431], [112.70623779, -7.22476006]
      ]
    },
    {
      id: "pabean-cantikan",
      name: "Pabean Cantikan",
      riskLevel: "tinggi",
      affectedHomes: 7,
      totalHomes: 10,
      description:
        "Pabean Cantikan adalah area pelabuhan tua dengan banyak bangunan bersejarah. Kelembaban tinggi dan bangunan kayu tua sangat rentan terhadap serangan rayap.",
      coordinates: { x: 70, y: 25 },
      path: "M70,20 L80,25 L85,20 L80,15 L75,15 Z",
      region: "utara",
      geoJsonPolygon: [
        [112.74259186, -7.24403238], [112.73827362, -7.23170996], [112.72158813, -7.21027994], [112.73272705, -7.20664978], [112.73493195, -7.19610023], [112.73813629, -7.22376013], [112.74292755, -7.2342701], [112.74733734, -7.24354458], [112.7421875, -7.24774981], [112.74259186, -7.24403238]
      ]
    },
    {
      id: "semampir",
      name: "Semampir",
      riskLevel: "tinggi",
      affectedHomes: 7,
      totalHomes: 10,
      description:
        "Semampir adalah area padat penduduk dengan banyak bangunan tua. Kelembaban tinggi dari laut dan kondisi drainase yang kurang baik meningkatkan risiko rayap.",
      coordinates: { x: 80, y: 20 },
      path: "M75,15 L80,15 L85,20 L90,15 L85,10 Z",
      region: "utara",
      geoJsonPolygon: [
        [112.74292755, -7.2342701], [112.73813629, -7.22376013], [112.73493195, -7.19610023], [112.75698853, -7.19776917], [112.7620697, -7.20833969], [112.75762939, -7.23456812], [112.74292755, -7.2342701]
      ]
    },
    {
      id: "kenjeran",
      name: "Kenjeran",
      riskLevel: "tinggi",
      affectedHomes: 8,
      totalHomes: 10,
      description:
        "Kenjeran terletak di pesisir dengan kelembaban sangat tinggi. Banyak bangunan menggunakan kayu dan berada di atas atau dekat dengan air, menciptakan risiko rayap tertinggi di Surabaya.",
      coordinates: { x: 90, y: 25 },
      path: "M85,10 L90,15 L95,25 L90,35 L85,20 Z",
      region: "utara",
      geoJsonPolygon: [
        [112.77056885, -7.23570633], [112.76370239, -7.23632002], [112.75762939, -7.23456812], [112.7620697, -7.20833969], [112.75698853, -7.19776917], [112.77475739, -7.20304728], [112.77867126, -7.21335983], [112.77865601, -7.21936321], [112.78408813, -7.22160006], [112.77056885, -7.23570633]
      ]
    },
    {
      id: "bulak",
      name: "Bulak",
      riskLevel: "tinggi",
      affectedHomes: 7,
      totalHomes: 10,
      description:
        "Bulak adalah area pesisir dengan banyak bangunan kayu tradisional. Kelembaban tinggi dan penggunaan material kayu membuat area ini sangat rentan terhadap serangan rayap.",
      coordinates: { x: 90, y: 35 },
      path: "M85,20 L90,35 L85,45 L75,35 Z",
      region: "utara",
      geoJsonPolygon: [
        [112.78926086, -7.24780512], [112.78404236, -7.23511982], [112.77056885, -7.23570633], [112.78408813, -7.22160006], [112.79416656, -7.23081017], [112.80654907, -7.25567961], [112.78926086, -7.24780512]
      ]
    },
    {
      id: "simokerto",
      name: "Simokerto",
      riskLevel: "sedang",
      affectedHomes: 5,
      totalHomes: 10,
      description:
        "Simokerto adalah area pemukiman padat dengan campuran bangunan tua dan baru. Sistem drainase yang kurang baik di beberapa area meningkatkan risiko rayap.",
      coordinates: { x: 75, y: 30 },
      path: "M75,35 L85,45 L80,50 L70,40 L75,35 Z",
      region: "utara",
      geoJsonPolygon: [
        [112.75325012, -7.24911928], [112.74733734, -7.24354458], [112.74292755, -7.2342701], [112.75762939, -7.23456812], [112.76370239, -7.23632002], [112.75325012, -7.24911928]
      ]
    },

    // SURABAYA PUSAT (CENTRAL)
    {
      id: "bubutan",
      name: "Bubutan",
      riskLevel: "sedang",
      affectedHomes: 5,
      totalHomes: 10,
      description:
        "Bubutan adalah area pusat kota dengan banyak bangunan komersial dan pemukiman padat. Beberapa bangunan tua memiliki risiko rayap yang lebih tinggi.",
      coordinates: { x: 65, y: 40 },
      path: "M65,35 L75,35 L70,40 L65,50 L60,55 L60,40 L65,35 Z",
      region: "pusat",
      geoJsonPolygon: [
        [112.71508026, -7.25506735], [112.71711731, -7.2471199], [112.7279129, -7.24243021], [112.74259186, -7.24403238], [112.7421875, -7.24774981], [112.73429871, -7.25588322], [112.71508026, -7.25506735]
      ]
    },
    {
      id: "genteng",
      name: "Genteng",
      riskLevel: "sedang",
      affectedHomes: 4,
      totalHomes: 10,
      description:
        "Genteng adalah pusat bisnis dan pemerintahan dengan banyak bangunan modern. Risiko rayap lebih rendah karena konstruksi yang lebih baik, namun beberapa bangunan tua tetap berisiko.",
      coordinates: { x: 70, y: 45 },
      path: "M70,40 L80,50 L75,55 L65,50 L70,40 Z",
      region: "pusat",
      geoJsonPolygon: [
        [112.73319244, -7.25839996], [112.73429871, -7.25588322], [112.7421875, -7.24774981], [112.74733734, -7.24354458], [112.75325012, -7.24911928], [112.7509613, -7.2679801], [112.74391174, -7.27426004], [112.7401123, -7.26133919], [112.73319244, -7.25839996]
      ]
    },
    {
      id: "tegalsari",
      name: "Tegalsari",
      riskLevel: "sedang",
      affectedHomes: 5,
      totalHomes: 10,
      description:
        "Tegalsari adalah area pemukiman padat di pusat kota dengan banyak bangunan tua. Usia bangunan dan sistem drainase yang kurang baik meningkatkan risiko rayap.",
      coordinates: { x: 65, y: 55 },
      path: "M60,55 L65,50 L75,55 L70,60 Z",
      region: "pusat",
      geoJsonPolygon: [
        [112.72768402, -7.27633047], [112.73319244, -7.25839996], [112.7401123, -7.26133919], [112.74391174, -7.27426004], [112.74411011, -7.27722979], [112.73592377, -7.28965235], [112.72768402, -7.27633047]
      ]
    },
    {
      id: "sawahan",
      name: "Sawahan",
      riskLevel: "sedang",
      affectedHomes: 5,
      totalHomes: 10,
      description:
        "Sawahan adalah area pemukiman padat dengan banyak bangunan tua. Usia bangunan dan kepadatan meningkatkan risiko penyebaran rayap antar bangunan.",
      coordinates: { x: 60, y: 60 },
      path: "M50,60 L60,55 L70,60 L65,70 L55,65 Z",
      region: "pusat",
      geoJsonPolygon: [
        [112.70860291, -7.27571535], [112.71434021, -7.25611019], [112.71508026, -7.25506735], [112.73429871, -7.25588322], [112.73319244, -7.25839996], [112.72768402, -7.27633047], [112.7249527, -7.2922101], [112.71343994, -7.29033184], [112.71737671, -7.27953911], [112.70860291, -7.27571535]
      ]
    },

    // SURABAYA TIMUR (EAST)
    {
      id: "tambaksari",
      name: "Tambaksari",
      riskLevel: "tinggi",
      affectedHomes: 6,
      totalHomes: 10,
      description:
        "Tambaksari memiliki sejarah sebagai area tambak yang dikeringkan. Kondisi tanah yang sebelumnya basah menciptakan risiko rayap yang tinggi.",
      coordinates: { x: 80, y: 55 },
      path: "M75,55 L80,50 L90,55 L85,65 L75,65 Z",
      region: "timur",
      geoJsonPolygon: [
        [112.76370239, -7.23632002], [112.77056885, -7.23570633], [112.78404236, -7.23511982], [112.78926086, -7.24780512], [112.77725983, -7.25489998], [112.7763443, -7.26409721], [112.7641983, -7.26281023], [112.7509613, -7.2679801], [112.75325012, -7.24911928], [112.76370239, -7.23632002]
      ]
    },
    {
      id: "gubeng",
      name: "Gubeng",
      riskLevel: "sedang",
      affectedHomes: 4,
      totalHomes: 10,
      description:
        "Gubeng memiliki campuran bangunan tua dan baru. Area dengan bangunan yang lebih tua memiliki risiko rayap yang lebih tinggi.",
      coordinates: { x: 75, y: 65 },
      path: "M70,60 L75,55 L75,65 L70,70 Z",
      region: "timur",
      geoJsonPolygon: [
        [112.7591629, -7.30539989], [112.75679016, -7.30473995], [112.75713348, -7.29361296], [112.74751282, -7.29032993], [112.74411011, -7.27722979], [112.74391174, -7.27426004], [112.7509613, -7.2679801], [112.7641983, -7.26281023], [112.7763443, -7.26409721], [112.77198792, -7.28043985], [112.76435089, -7.27961874], [112.76303864, -7.28915739], [112.76194, -7.30615997], [112.7591629, -7.30539989]
      ]
    },
    {
      id: "mulyorejo",
      name: "Mulyorejo",
      riskLevel: "sedang",
      affectedHomes: 5,
      totalHomes: 10,
      description:
        "Mulyorejo memiliki banyak area kampus dan perumahan baru. Meskipun banyak bangunan baru dengan sistem anti-rayap, beberapa area masih berisiko terutama yang dekat dengan area hijau.",
      coordinates: { x: 90, y: 60 },
      path: "M85,45 L90,55 L95,65 L85,65 Z",
      region: "timur",
      geoJsonPolygon: [
        [112.7763443, -7.26409721], [112.77725983, -7.25489998], [112.78926086, -7.24780512], [112.80654907, -7.25567961], [112.82698822, -7.26176977], [112.82793427, -7.26945114], [112.81195831, -7.28066015], [112.79936218, -7.27431774], [112.78388977, -7.27692986], [112.78516388, -7.2842207], [112.7705307, -7.2811451], [112.76303864, -7.28915739], [112.76435089, -7.27961874], [112.77198792, -7.28043985], [112.7763443, -7.26409721]
      ]
    },
    {
      id: "sukolilo",
      name: "Sukolilo",
      riskLevel: "sedang",
      affectedHomes: 4,
      totalHomes: 10,
      description:
        "Sukolilo memiliki banyak kampus dan perumahan kelas menengah ke atas. Bangunan yang lebih baru cenderung memiliki perlindungan anti-rayap yang lebih baik.",
      coordinates: { x: 85, y: 75 },
      path: "M85,65 L95,65 L90,80 L80,75 Z",
      region: "timur",
      geoJsonPolygon: [
        [112.77095795, -7.30861998], [112.76194, -7.30615997], [112.76303864, -7.28915739], [112.7705307, -7.2811451], [112.78516388, -7.2842207], [112.78388977, -7.27692986], [112.79936218, -7.27431774], [112.81195831, -7.28066015], [112.82793427, -7.26945114], [112.83981323, -7.27767992], [112.84690094, -7.29666996], [112.84568024, -7.3041501], [112.83888245, -7.31018019], [112.82196808, -7.30678988], [112.81118774, -7.29890013], [112.80339813, -7.30756998], [112.78035736, -7.31073999], [112.77095795, -7.30861998]
      ]
    },
    {
      id: "rungkut",
      name: "Rungkut",
      riskLevel: "tinggi",
      affectedHomes: 6,
      totalHomes: 10,
      description:
        "Rungkut memiliki banyak area industri dan pemukiman. Beberapa area adalah bekas rawa yang dikeringkan, menciptakan kondisi tanah yang disukai rayap.",
      coordinates: { x: 90, y: 85 },
      path: "M80,75 L90,80 L95,90 L85,95 L75,85 Z",
      region: "timur",
      geoJsonPolygon: [
        [112.75749969, -7.33031988], [112.77095795, -7.30861998], [112.78035736, -7.31073999], [112.80339813, -7.30756998], [112.81118774, -7.29890013], [112.82196808, -7.30678988], [112.83888245, -7.31018019], [112.84568024, -7.3041501], [112.8425293, -7.31696987], [112.827034, -7.33286524], [112.82228088, -7.33033991], [112.79476166, -7.33337021], [112.75749969, -7.33031988]
      ]
    },
    {
      id: "gunung-anyar",
      name: "Gunung Anyar",
      riskLevel: "sedang",
      affectedHomes: 5,
      totalHomes: 10,
      description:
        "Gunung Anyar memiliki banyak perumahan baru dan dekat dengan area mangrove. Kelembaban dari area mangrove meningkatkan risiko rayap di beberapa lokasi.",
      coordinates: { x: 85, y: 95 },
      path: "M75,85 L85,95 L90,100 L70,95 Z",
      region: "timur",
      geoJsonPolygon: [
        [112.827034, -7.33286524], [112.82589722, -7.34321976], [112.81293488, -7.34628057], [112.78956604, -7.34409332], [112.75508881, -7.33682013], [112.75749969, -7.33031988], [112.79476166, -7.33337021], [112.82228088, -7.33033991], [112.827034, -7.33286524]
      ]
    },
    {
      id: "tenggilis-mejoyo",
      name: "Tenggilis Mejoyo",
      riskLevel: "sedang",
      affectedHomes: 4,
      totalHomes: 10,
      description:
        "Tenggilis Mejoyo memiliki banyak perumahan dan area komersial. Bangunan yang lebih baru memiliki risiko lebih rendah, tetapi area yang dekat dengan sungai tetap berisiko.",
      coordinates: { x: 75, y: 80 },
      path: "M70,70 L75,65 L80,75 L75,85 L65,80 Z",
      region: "timur",
      geoJsonPolygon: [
        [112.74302673, -7.34081507], [112.74398804, -7.32260275], [112.7591629, -7.30539989], [112.76194, -7.30615997], [112.77095795, -7.30861998], [112.75749969, -7.33031988], [112.75508881, -7.33682013], [112.74302673, -7.34081507]
      ]
    },

    // SURABAYA SELATAN (SOUTH)
    {
      id: "wonokromo",
      name: "Wonokromo",
      riskLevel: "sedang",
      affectedHomes: 5,
      totalHomes: 10,
      description:
        "Wonokromo dilalui sungai besar dan memiliki banyak bangunan tua. Kombinasi kelembaban dari sungai dan usia bangunan meningkatkan risiko rayap.",
      coordinates: { x: 70, y: 75 },
      path: "M65,70 L70,70 L75,65 L70,60 L65,70 Z",
      region: "selatan",
      geoJsonPolygon: [
        [112.75679016, -7.30473995], [112.741745, -7.30587244], [112.73522186, -7.31116724], [112.7232666, -7.30768394], [112.72080231, -7.30800009], [112.7249527, -7.2922101], [112.72768402, -7.27633047], [112.73592377, -7.28965235], [112.74411011, -7.27722979], [112.74751282, -7.29032993], [112.75713348, -7.29361296], [112.75679016, -7.30473995]
      ]
    },
    {
      id: "wonocolo",
      name: "Wonocolo",
      riskLevel: "rendah",
      affectedHomes: 3,
      totalHomes: 10,
      description:
        "Wonocolo memiliki banyak area kampus dan pemukiman. Bangunan yang lebih baru dan perawatan yang baik mengurangi risiko rayap.",
      coordinates: { x: 65, y: 75 },
      path: "M60,75 L65,70 L65,80 L60,85 L55,80 L60,75 Z",
      region: "selatan",
      geoJsonPolygon: [
        [112.74302673, -7.34081507], [112.73775482, -7.34494734], [112.72931671, -7.33950377], [112.73522186, -7.31116724], [112.741745, -7.30587244], [112.75679016, -7.30473995], [112.7591629, -7.30539989], [112.74398804, -7.32260275], [112.74302673, -7.34081507]
      ]
    },
    {
      id: "gayungan",
      name: "Gayungan",
      riskLevel: "rendah",
      affectedHomes: 3,
      totalHomes: 10,
      description:
        "Gayungan memiliki banyak perumahan kelas menengah ke atas dengan konstruksi yang lebih baik. Sistem drainase yang baik mengurangi kelembaban dan risiko rayap.",
      coordinates: { x: 60, y: 85 },
      path: "M55,80 L60,85 L55,90 L50,85 Z",
      region: "selatan",
      geoJsonPolygon: [
        [112.71568298, -7.34181118], [112.7161026, -7.33993292], [112.71800995, -7.32854986], [112.72647858, -7.31787014], [112.7232666, -7.30768394], [112.73522186, -7.31116724], [112.72931671, -7.33950377], [112.73775482, -7.34494734], [112.7256012, -7.34820986], [112.71568298, -7.34181118]
      ]
    },
    {
      id: "jambangan",
      name: "Jambangan",
      riskLevel: "sedang",
      affectedHomes: 4,
      totalHomes: 10,
      description:
        "Jambangan memiliki banyak area hijau dan dekat dengan sungai. Kelembaban dari area hijau dan sungai meningkatkan risiko rayap.",
      coordinates: { x: 55, y: 80 },
      path: "M50,75 L55,80 L50,85 L45,80 L50,75 Z",
      region: "selatan",
      geoJsonPolygon: [
        [112.70471954, -7.3361001], [112.71030426, -7.32910633], [112.71134949, -7.31274986], [112.71388245, -7.30773163], [112.72080231, -7.30800009], [112.7232666, -7.30768394], [112.72647858, -7.31787014], [112.71800995, -7.32854986], [112.7161026, -7.33993292], [112.70471954, -7.3361001]
      ]
    },
    {
      id: "karangpilang",
      name: "Karangpilang",
      riskLevel: "sedang",
      affectedHomes: 4,
      totalHomes: 10,
      description:
        "Karangpilang memiliki campuran area industri dan pemukiman. Beberapa area dekat sungai memiliki risiko rayap yang lebih tinggi.",
      coordinates: { x: 45, y: 85 },
      path: "M40,75 L45,80 L50,85 L45,90 L35,85 Z",
      region: "selatan",
      geoJsonPolygon: [
        [112.66456604, -7.35144043], [112.66525269, -7.34040356], [112.67499542, -7.33310366], [112.69532013, -7.32636833], [112.70165253, -7.31530428], [112.71134949, -7.31274986], [112.71030426, -7.32910633], [112.70471954, -7.3361001], [112.67835999, -7.35043097], [112.66456604, -7.35144043]
      ]
    },
    {
      id: "dukuh-pakis",
      name: "Dukuh Pakis",
      riskLevel: "sedang",
      affectedHomes: 4,
      totalHomes: 10,
      description:
        "Dukuh Pakis memiliki banyak perumahan kelas menengah. Beberapa area memiliki sejarah sebagai lahan basah yang meningkatkan risiko rayap.",
      coordinates: { x: 50, y: 70 },
      path: "M45,70 L50,75 L55,65 L50,60 L45,70 Z",
      region: "selatan",
      geoJsonPolygon: [
        [112.71388245, -7.30773163], [112.67573547, -7.29424953], [112.67858887, -7.28373337], [112.68412018, -7.27687073], [112.68447113, -7.27502775], [112.70220947, -7.28479767], [112.70860291, -7.27571535], [112.71737671, -7.27953911], [112.71343994, -7.29033184], [112.7249527, -7.2922101], [112.72080231, -7.30800009], [112.71388245, -7.30773163]
      ]
    },
    {
      id: "wiyung",
      name: "Wiyung",
      riskLevel: "tinggi",
      affectedHomes: 6,
      totalHomes: 10,
      description:
        "Wiyung memiliki banyak area hijau dan perumahan baru yang dibangun di atas lahan pertanian. Kondisi tanah yang sebelumnya digunakan untuk pertanian menciptakan risiko rayap yang tinggi.",
      coordinates: { x: 40, y: 75 },
      path: "M35,65 L40,75 L45,70 L40,60 Z",
      region: "selatan",
      geoJsonPolygon: [
        [112.67499542, -7.33310366], [112.67160797, -7.31753016], [112.67193604, -7.29252338], [112.67858887, -7.28373337], [112.67573547, -7.29424953], [112.71388245, -7.30773163], [112.71134949, -7.31274986], [112.70165253, -7.31530428], [112.69532013, -7.32636833], [112.67499542, -7.33310366]
      ]
    },
  ]

  // --- START OF NEW GPS LOGIC ---
  const findKecamatanByCoords = (lat: number, lon: number): KecamatanData | null => {
    console.log(`Checking real coordinates: Lat ${lat}, Lon ${lon}`);
    const userLocation = [lon, lat]; // GeoJSON format is [longitude, latitude]

    // Loop through all your kecamatans
    for (const kecamatan of kecamatanData) {
      // Check if the kecamatan has polygon data and if the user's location is inside it
      if (kecamatan.geoJsonPolygon && pointInPolygon(userLocation, kecamatan.geoJsonPolygon)) {
        // If it's a match, return that kecamatan object
        return kecamatan;
      }
    }

    // If the loop finishes without finding a match, the user is outside all defined areas.
    return null;
  };

  useEffect(() => {
    // This part of the code remains exactly the same.
    // It will now correctly use your new, non-random findKecamatanByCoords function.
    if (navigator.geolocation) {
      console.log("Requesting user location...");
      setLocationStatus("loading");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`Location acquired: Lat: ${latitude}, Lon: ${longitude}`);

          const detectedKecamatan = findKecamatanByCoords(latitude, longitude);

          if (detectedKecamatan) {
            console.log("Lokasi terdeteksi di dalam peta:", detectedKecamatan.name);
            setGpsLockedKecamatan(detectedKecamatan);
            setSelectedKecamatan(detectedKecamatan);
            setLocationStatus("detected");
          } else {
            console.log("Lokasi GPS berada di luar area peta Surabaya.");
            setLocationStatus("outside_map");
          }
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              console.log("Izin lokasi ditolak oleh pengguna.");
              break;
            case error.POSITION_UNAVAILABLE:
              console.log("Informasi lokasi tidak tersedia.");
              break;
            case error.TIMEOUT:
              console.log("Permintaan lokasi timeout.");
              break;
            default:
              console.log("Terjadi kesalahan saat mengambil lokasi.");
              break;
          }
          setLocationStatus("permission_denied");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      console.log("Geolocation tidak didukung oleh browser ini.");
      setLocationStatus("permission_denied");
    }
  }, []);

  // --- END OF NEW GPS LOGIC ---

  const majorRoads = [
    "M10,50 L90,50",
    "M50,10 L50,90",
    "M20,20 Q50,10 80,20 Q90,50 80,80 Q50,90 20,80 Q10,50 20,20",
    "M30,30 Q50,25 70,30 Q75,50 70,70 Q50,75 30,70 Q25,50 30,30",
  ]
  const waterBodies = [
    { path: "M85,5 Q95,15 95,30 L90,40 L85,45 L80,35 L85,5 Z", name: "Selat Madura", type: "sea" },
    { path: "M60,45 Q65,50 60,55 L55,53 L52,50 L55,47 Z", name: "Danau Kota", type: "lake" },
    { path: "M40,30 L45,35 L43,40 L38,38 L35,35 Z", name: "Waduk Barat", type: "lake" },
    { path: "M15,40 Q25,45 15,50 L10,45 Z", name: "Sungai Barat", type: "river" },
    { path: "M70,70 L75,75 L73,80 L68,78 L65,75 Z", name: "Waduk Timur", type: "lake" },
  ]
  const landmarks = [
    { x: 65, y: 45, name: "Tugu Pahlawan", icon: "🏛️" },
    { x: 75, y: 25, name: "Pelabuhan Tanjung Perak", icon: "🚢" },
    { x: 55, y: 55, name: "Kebun Binatang", icon: "🦁" },
    { x: 45, y: 65, name: "Stadion", icon: "🏟️" },
    { x: 85, y: 65, name: "Kampus ITS", icon: "🎓" },
    { x: 35, y: 45, name: "Universitas", icon: "🏫" },
    { x: 70, y: 85, name: "Bandara Juanda", icon: "✈️" },
    { x: 25, y: 30, name: "Hutan Mangrove", icon: "🌳" },
  ]

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.2, 3))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.2, 0.5))
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }
  const handleMouseUp = () => setIsDragging(false)
  const handleMouseLeave = () => setIsDragging(false)
  const resetMapPosition = () => {
    setPanOffset({ x: 0, y: 0 })
    setZoomLevel(1)
  }

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!mapRef.current?.contains(e.target as Node)) return
      e.preventDefault()
      const delta = -Math.sign(e.deltaY) * 0.1
      setZoomLevel((prev) => Math.min(Math.max(prev + delta, 0.5), 3))
    }
    const mapElement = mapRef.current
    if (mapElement) {
      mapElement.addEventListener("wheel", handleWheel, { passive: false })
    }
    return () => {
      if (mapElement) {
        mapElement.removeEventListener("wheel", handleWheel)
      }
    }
  }, [])

  const getRiskColor = (riskLevel: string, isHovered = false, isSelected = false) => {
    if (isSelected) {
      return riskLevel === "tinggi"
        ? "fill-red-600 stroke-white stroke-[0.5]"
        : riskLevel === "sedang"
          ? "fill-yellow-600 stroke-white stroke-[0.5]"
          : "fill-green-600 stroke-white stroke-[0.5]"
    }
    if (isHovered) {
      return riskLevel === "tinggi"
        ? "fill-red-500 stroke-white stroke-[0.5]"
        : riskLevel === "sedang"
          ? "fill-yellow-500 stroke-white stroke-[0.5]"
          : "fill-green-500 stroke-white stroke-[0.5]"
    }
    return riskLevel === "tinggi"
      ? "fill-red-700/70 hover:fill-red-600"
      : riskLevel === "sedang"
        ? "fill-yellow-700/70 hover:fill-yellow-600"
        : "fill-green-700/70 hover:fill-green-600"
  }

  // MODIFIED: Clicking a kecamatan now only changes the *view*, not the locked location.
  const handleKecamatanClick = (kecamatan: KecamatanData) => {
    setSelectedKecamatan(kecamatan)
  }

  // MODIFIED: The confirmation button uses the GPS-locked location if available.
  const handleConfirmSelection = () => {
    const finalSelection = gpsLockedKecamatan || selectedKecamatan
    if (finalSelection) {
      onKecamatanSelected(finalSelection)
    }
  }

  const filteredKecamatan = kecamatanData.filter((kecamatan) => {
    const matchesSearch = kecamatan.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRegion = filterRegion === "all" || kecamatan.region === filterRegion
    const matchesRisk = filterRisk === "all" || kecamatan.riskLevel === filterRisk
    return matchesSearch && matchesRegion && matchesRisk
  })

  const getMapBackground = () => {
    switch (mapTheme) {
      case "satellite":
        return "bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 opacity-90"
      case "dark":
        return "bg-gray-900"
      default:
        return "bg-blue-100"
    }
  }
  const getWaterColor = () => {
    switch (mapTheme) {
      case "satellite":
        return "fill-blue-900/70"
      case "dark":
        return "fill-blue-800/50"
      default:
        return "fill-blue-500/70"
    }
  }

  const riskCounts = {
    tinggi: kecamatanData.filter((k) => k.riskLevel === "tinggi").length,
    sedang: kecamatanData.filter((k) => k.riskLevel === "sedang").length,
    rendah: kecamatanData.filter((k) => k.riskLevel === "rendah").length,
  }

  return (
    <Card className="p-6 bg-black/90 border-l-4 border-yellow-500 text-white shadow-lg relative">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="h-6 w-6 text-amber-500" />
        <h2 className="text-xl md:text-2xl font-bold headline">PILIH LOKASI RUMAH ANDA DI PETA</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3">
          <div className="mb-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari kecamatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-black/50 border-amber-600 text-white"
              />
              {searchQuery && filteredKecamatan.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-black/95 border border-amber-800/50 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredKecamatan.map((kecamatan) => (
                    <div
                      key={kecamatan.id}
                      className="p-2 hover:bg-amber-900/30 cursor-pointer flex items-center gap-2"
                      onClick={() => {
                        handleKecamatanClick(kecamatan) // Use the modified click handler
                        setSearchQuery("")
                      }}
                    >
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full",
                          kecamatan.riskLevel === "tinggi"
                            ? "bg-red-500"
                            : kecamatan.riskLevel === "sedang"
                              ? "bg-yellow-500"
                              : "bg-green-500",
                        )}
                      ></div>
                      <span>{kecamatan.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger className="w-[130px] bg-black/50 border-amber-600 text-white">
                  <SelectValue placeholder="Wilayah" />
                </SelectTrigger>
                <SelectContent className="bg-black text-white border-amber-600">
                  <SelectItem value="all">Semua Wilayah</SelectItem>
                  <SelectItem value="utara">Surabaya Utara</SelectItem>
                  <SelectItem value="selatan">Surabaya Selatan</SelectItem>
                  <SelectItem value="timur">Surabaya Timur</SelectItem>
                  <SelectItem value="barat">Surabaya Barat</SelectItem>
                  <SelectItem value="pusat">Surabaya Pusat</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="w-[130px] bg-black/50 border-amber-600 text-white">
                  <SelectValue placeholder="Risiko" />
                </SelectTrigger>
                <SelectContent className="bg-black text-white border-amber-600">
                  <SelectItem value="all">Semua Risiko</SelectItem>
                  <SelectItem value="tinggi">Risiko Tinggi</SelectItem>
                  <SelectItem value="sedang">Risiko Sedang</SelectItem>
                  <SelectItem value="rendah">Risiko Rendah</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-black/50 rounded-lg p-4 border border-amber-800/30 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-amber-400 font-bold">Peta Risiko Rayap Kota Surabaya</h3>
              <div className="flex items-center gap-2">
                <Select
                  value={mapTheme}
                  onValueChange={(value: "standard" | "satellite" | "dark") => setMapTheme(value)}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-black/50 border-amber-600 text-white">
                    <SelectValue placeholder="Tema Peta" />
                  </SelectTrigger>
                  <SelectContent className="bg-black text-white border-amber-600">
                    <SelectItem value="standard">Standar</SelectItem>
                    <SelectItem value="satellite">Satelit</SelectItem>
                    <SelectItem value="dark">Gelap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              ref={mapRef}
              className="relative w-full aspect-square max-w-[600px] mx-auto overflow-hidden rounded-md border border-amber-800/20"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
            >
              <svg
                ref={svgRef}
                viewBox="0 0 100 100"
                className="w-full h-full"
                style={{
                  filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5))",
                  transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                  transformOrigin: "center",
                  transition: isDragging ? "none" : "transform 0.2s ease-out",
                }}
              >
                {/* Map layers (background, water, roads etc.) remain unchanged */}
                <rect x="0" y="0" width="100" height="100" className={getMapBackground()} />
                {mapTheme !== "satellite" && (
                  <g className="opacity-20">
                    {[...Array(10)].map((_, i) => (
                      <line
                        key={`grid-h-${i}`}
                        x1="0"
                        y1={i * 10}
                        x2="100"
                        y2={i * 10}
                        stroke="white"
                        strokeWidth="0.2"
                        strokeDasharray="1,1"
                      />
                    ))}
                    {[...Array(10)].map((_, i) => (
                      <line
                        key={`grid-v-${i}`}
                        x1={i * 10}
                        y1="0"
                        x2={i * 10}
                        y2="100"
                        stroke="white"
                        strokeWidth="0.2"
                        strokeDasharray="1,1"
                      />
                    ))}
                  </g>
                )}
                {showWaterBodies && (
                  <g>
                    {waterBodies.map((water, index) => (
                      <path
                        key={`water-${index}`}
                        d={water.path}
                        className={`${getWaterColor()} stroke-blue-600/30 stroke-[0.3]`}
                      />
                    ))}
                  </g>
                )}
                <path
                  d="M5,5 L95,5 L95,95 L5,95 Z"
                  className={
                    mapTheme === "satellite"
                      ? "fill-gray-700/50"
                      : mapTheme === "dark"
                        ? "fill-gray-800/50"
                        : "fill-amber-100/10"
                  }
                />
                {showRoads && (
                  <g>
                    {majorRoads.map((road, index) => (
                      <path
                        key={`road-${index}`}
                        d={road}
                        className={mapTheme === "dark" ? "stroke-amber-700/70" : "stroke-amber-600/70"}
                        strokeWidth="0.7"
                        strokeLinecap="round"
                        fill="none"
                      />
                    ))}
                  </g>
                )}
                <g>
                  {kecamatanData.map((kecamatan) => {
                    const isFiltered =
                      (filterRegion !== "all" && kecamatan.region !== filterRegion) ||
                      (filterRisk !== "all" && kecamatan.riskLevel !== filterRisk)
                    return (
                      <path
                        key={kecamatan.id}
                        d={kecamatan.path}
                        className={cn(
                          "cursor-pointer transition-all duration-300",
                          isFiltered ? "opacity-30" : "opacity-100",
                          searchQuery
                            ? filteredKecamatan.includes(kecamatan)
                              ? getRiskColor(kecamatan.riskLevel, true, selectedKecamatan?.id === kecamatan.id)
                              : getRiskColor(kecamatan.riskLevel, false, false) + " opacity-30"
                            : getRiskColor(
                              kecamatan.riskLevel,
                              hoveredKecamatan === kecamatan.id,
                              selectedKecamatan?.id === kecamatan.id,
                            ),
                        )}
                        onMouseEnter={() => setHoveredKecamatan(kecamatan.id)}
                        onMouseLeave={() => setHoveredKecamatan(null)}
                        onClick={() => handleKecamatanClick(kecamatan)}
                      />
                    )
                  })}
                </g>
                <g>
                  {kecamatanData.map((kecamatan) => (
                    <path
                      key={`border-${kecamatan.id}`}
                      d={kecamatan.path}
                      className="fill-none stroke-white/30 stroke-[0.2]"
                    />
                  ))}
                </g>
                {showLandmarks && (
                  <g>
                    {landmarks.map((landmark, index) => (
                      <g key={`landmark-${index}`}>
                        <circle
                          cx={landmark.x}
                          cy={landmark.y}
                          r="1.2"
                          className="fill-amber-500/80 stroke-white/50 stroke-[0.2]"
                        />
                        <text
                          x={landmark.x}
                          y={landmark.y - 2}
                          textAnchor="middle"
                          className="fill-white text-[2px] font-bold"
                        >
                          {landmark.icon}
                        </text>
                        {zoomLevel > 1.5 && (
                          <text
                            x={landmark.x}
                            y={landmark.y + 2.5}
                            textAnchor="middle"
                            className="fill-white/80 text-[1.5px]"
                          >
                            {landmark.name}
                          </text>
                        )}
                      </g>
                    ))}
                  </g>
                )}
                {showLabels && (
                  <g>
                    {kecamatanData.map((kecamatan) => {
                      const isFiltered =
                        (filterRegion !== "all" && kecamatan.region !== filterRegion) ||
                        (filterRisk !== "all" && kecamatan.riskLevel !== filterRisk)
                      return (
                        <g key={`label-${kecamatan.id}`} className={isFiltered ? "opacity-30" : "opacity-100"}>
                          <text
                            x={kecamatan.coordinates.x}
                            y={kecamatan.coordinates.y}
                            textAnchor="middle"
                            className={cn(
                              "fill-white text-[2px] font-bold pointer-events-none",
                              hoveredKecamatan === kecamatan.id || selectedKecamatan?.id === kecamatan.id
                                ? "opacity-100"
                                : "opacity-70",
                            )}
                          >
                            {kecamatan.name}
                          </text>
                        </g>
                      )
                    })}
                  </g>
                )}

                {/* NEW: Visual indicator for GPS locked location */}
                {isGpsLocked && (
                  <g>
                    <circle
                      cx={gpsLockedKecamatan.coordinates.x}
                      cy={gpsLockedKecamatan.coordinates.y}
                      r="2.5"
                      className="fill-blue-500/30 stroke-white stroke-[0.3]"
                    >
                      <animate
                        attributeName="r"
                        from="2.5"
                        to="4"
                        dur="1.5s"
                        begin="0s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="1"
                        to="0"
                        dur="1.5s"
                        begin="0s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      cx={gpsLockedKecamatan.coordinates.x}
                      cy={gpsLockedKecamatan.coordinates.y}
                      r="1.5"
                      className="fill-blue-400 stroke-white stroke-[0.4]"
                    />
                  </g>
                )}

                {/* Map decorations (compass, scale, legend) remain unchanged */}
                <g transform="translate(85, 15)">
                  <circle cx="0" cy="0" r="5" className="fill-black/40 stroke-amber-500/70 stroke-[0.3]" />
                  <path d="M0,-4 L1,-1 L0,0 L-1,-1 Z" className="fill-red-500" />
                  <path d="M0,4 L1,1 L0,0 L-1,1 Z" className="fill-white" />
                  <path d="M4,0 L1,1 L0,0 L1,-1 Z" className="fill-white" />
                  <path d="M-4,0 L-1,1 L0,0 L-1,-1 Z" className="fill-white" />
                  <text x="0" y="-2.5" textAnchor="middle" className="fill-white text-[1.8px] font-bold">
                    U
                  </text>
                  <text x="0" y="3.5" textAnchor="middle" className="fill-white text-[1.8px] font-bold">
                    S
                  </text>
                  <text x="2.5" y="0.5" textAnchor="middle" className="fill-white text-[1.8px] font-bold">
                    T
                  </text>
                  <text x="-2.5" y="0.5" textAnchor="middle" className="fill-white text-[1.8px] font-bold">
                    B
                  </text>
                </g>
                <g transform="translate(10, 90)">
                  <rect width="20" height="1" className="fill-white" />
                  <rect x="0" y="1" width="1" height="1" className="fill-white" />
                  <rect x="5" y="1" width="1" height="1" className="fill-white" />
                  <rect x="10" y="1" width="1" height="1" className="fill-white" />
                  <rect x="15" y="1" width="1" height="1" className="fill-white" />
                  <rect x="20" y="1" width="1" height="1" className="fill-white" />
                  <text x="10" y="4" textAnchor="middle" className="fill-white text-[1.8px]">
                    0 5 10 km
                  </text>
                </g>
                <g transform="translate(2, 75)">
                  <rect width="20" height="13" rx="1" fill="#000000" fillOpacity="0.7" />
                  <text x="2" y="3" className="fill-white text-[2px]">
                    Legenda:
                  </text>
                  <rect x="2" y="5" width="3" height="2" rx="0.5" className="fill-red-700/70" />
                  <text x="6" y="6.5" className="fill-white text-[1.8px]">
                    Risiko Tinggi
                  </text>
                  <rect x="2" y="8" width="3" height="2" rx="0.5" className="fill-yellow-700/70" />
                  <text x="6" y="9.5" className="fill-white text-[1.8px]">
                    Risiko Sedang
                  </text>
                  <rect x="2" y="11" width="3" height="2" rx="0.5" className="fill-green-700/70" />
                  <text x="6" y="12.5" className="fill-white text-[1.8px]">
                    Risiko Rendah
                  </text>
                </g>
              </svg>

              <div className="absolute top-2 right-2 flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 bg-black/70 border-amber-600/50 text-amber-500"
                  onClick={handleZoomIn}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 bg-black/70 border-amber-600/50 text-amber-500"
                  onClick={handleZoomOut}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 bg-black/70 border-amber-600/50 text-amber-500"
                  onClick={resetMapPosition}
                >
                  <Compass className="h-4 w-4" />
                </Button>
              </div>

              <div className="absolute bottom-2 left-2">
                <div className="bg-black/70 rounded-md p-1 border border-amber-600/30">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("w-7 h-7 p-1", showLayers ? "text-amber-500" : "text-white/50")}
                    onClick={() => setShowLayers(!showLayers)}
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                </div>
                <AnimatePresence>
                  {showLayers && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: 10, height: 0 }}
                      className="bg-black/70 mt-1 rounded-md p-2 border border-amber-600/30 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="show-labels"
                            checked={showLabels}
                            onChange={() => setShowLabels(!showLabels)}
                            className="rounded border-amber-600"
                          />
                          <label htmlFor="show-labels">Label Kecamatan</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="show-roads"
                            checked={showRoads}
                            onChange={() => setShowRoads(!showRoads)}
                            className="rounded border-amber-600"
                          />
                          <label htmlFor="show-roads">Jalan Utama</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="show-water"
                            checked={showWaterBodies}
                            onChange={() => setShowWaterBodies(!showWaterBodies)}
                            className="rounded border-amber-600"
                          />
                          <label htmlFor="show-water">Badan Air</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="show-landmarks"
                            checked={showLandmarks}
                            onChange={() => setShowLandmarks(!showLandmarks)}
                            className="rounded border-amber-600"
                          />
                          <label htmlFor="show-landmarks">Landmark</label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {hoveredKecamatan && !selectedKecamatan && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute bottom-2 right-2 bg-black/80 text-white text-xs p-2 rounded-md border border-amber-600/30"
                  >
                    {kecamatanData.find((k) => k.id === hoveredKecamatan)?.name}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute top-2 left-2 bg-black/70 rounded px-2 py-1 text-xs text-amber-400 border border-amber-600/30">
                Kota Surabaya
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-xs text-white/60">
                <span className="mr-2">Zoom: {Math.round(zoomLevel * 100)}%</span>
                <span>Geser peta dengan mouse</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-amber-600/50 text-amber-500"
                  onClick={resetMapPosition}
                >
                  Reset Peta
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-amber-600/50 text-amber-500"
                  onClick={() => {
                    setFilterRegion("all")
                    setFilterRisk("all")
                    setSearchQuery("")
                  }}
                >
                  <Filter className="h-3 w-3 mr-1" />
                  Reset Filter
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-red-900/30 p-3 rounded-md border border-red-900/50 text-center">
              <div className="text-red-400 font-bold headline text-lg">TINGGI</div>
              <div className="text-white/80 text-sm">{riskCounts.tinggi} Kecamatan</div>
            </div>
            <div className="bg-yellow-900/30 p-3 rounded-md border border-yellow-900/50 text-center">
              <div className="text-yellow-400 font-bold headline text-lg">SEDANG</div>
              <div className="text-white/80 text-sm">{riskCounts.sedang} Kecamatan</div>
            </div>
            <div className="bg-green-900/30 p-3 rounded-md border border-green-900/50 text-center">
              <div className="text-green-400 font-bold headline text-lg">RENDAH</div>
              <div className="text-white/80 text-sm">{riskCounts.rendah} Kecamatan</div>
            </div>
          </div>
        </div>

        <div className="lg:w-1/3">
          {/* MODIFIED: The entire right panel is now driven by the new logic */}
          {selectedKecamatan ? (
            <div className="bg-black/50 rounded-lg p-4 border border-amber-800/30 h-full relative">
              {!isGpsLocked && (
                <button
                  onClick={() => setSelectedKecamatan(null)}
                  className="absolute top-2 right-2 text-white/60 hover:text-white"
                  aria-label="Tutup"
                >
                  <X className="h-5 w-5" />
                </button>
              )}

              {isGpsLocked && (
                <>
                  <div className="bg-blue-900/30 text-blue-300 border border-blue-800/50 text-xs p-2 rounded-md mb-2 flex items-center gap-2">
                    <LocateFixed className="h-5 w-5 flex-shrink-0" />
                    <span>
                      Lokasi Anda terdeteksi di <strong>{gpsLockedKecamatan.name}</strong> dan telah dipilihkan secara
                      otomatis.
                    </span>
                  </div>

                  <div className="text-center text-xs text-white/70 mb-4">
                    Bukan lokasi Anda?
                    <Button
                      variant="link"
                      className="text-amber-400 p-1 h-auto"
                      onClick={() => {
                        setGpsLockedKecamatan(null);
                        setLocationStatus("idle");
                      }}
                    >
                      Pilih Manual
                    </Button>
                  </div>
                </>
              )}

              <div
                className={cn(
                  "text-center mb-4 p-2 rounded-md",
                  selectedKecamatan.riskLevel === "tinggi"
                    ? "bg-red-900/30 border border-red-900/50"
                    : selectedKecamatan.riskLevel === "sedang"
                      ? "bg-yellow-900/30 border border-yellow-900/50"
                      : "bg-green-900/30 border border-green-900/50",
                )}
              >
                <h3 className="font-bold headline text-xl">{selectedKecamatan.name}</h3>
                <div
                  className={cn(
                    "text-sm mt-1",
                    selectedKecamatan.riskLevel === "tinggi"
                      ? "text-red-400"
                      : selectedKecamatan.riskLevel === "sedang"
                        ? "text-yellow-400"
                        : "text-green-400",
                  )}
                >
                  Risiko {selectedKecamatan.riskLevel.toUpperCase()}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-4">
                <AlertTriangle
                  className={cn(
                    "h-5 w-5",
                    selectedKecamatan.riskLevel === "tinggi"
                      ? "text-red-500"
                      : selectedKecamatan.riskLevel === "sedang"
                        ? "text-yellow-500"
                        : "text-green-500",
                  )}
                />
                <div className="text-lg font-bold headline">
                  {selectedKecamatan.affectedHomes} dari {selectedKecamatan.totalHomes} Rumah
                </div>
              </div>

              <div className="text-center mb-4">
                <div className="text-white/80">di kecamatan ini terdampak rayap!</div>
              </div>

              <div className="space-y-4 mt-6">
                <div className="bg-amber-900/20 p-3 rounded-md">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-amber-400">Karakteristik Area</h4>
                      <p className="mt-1 text-white/80 text-sm">{selectedKecamatan.description}</p>
                    </div>
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={handleConfirmSelection}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold mt-4 disabled:bg-amber-800/50 disabled:text-white/50 disabled:cursor-not-allowed"
                    disabled={!isGpsLocked && !selectedKecamatan}
                    aria-label={
                      isGpsLocked ? `Pilih Lokasi Ini (${gpsLockedKecamatan.name})` : "Pilih Lokasi Ini"
                    }
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {isGpsLocked
                      ? `Pilih ${gpsLockedKecamatan.name}`
                      : selectedKecamatan
                        ? `Pilih ${selectedKecamatan.name}`
                        : "Pilih Lokasi"}
                  </Button>
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="bg-black/50 rounded-lg p-4 border border-amber-800/30 h-full flex flex-col items-center justify-center text-center">
              <MapPin className="h-12 w-12 text-amber-500/50 mb-4" />
              <h3 className="text-lg font-bold text-amber-400">
                {locationStatus === "loading" && "Mendeteksi Lokasi Anda..."}
                {locationStatus !== "loading" && "Pilih Kecamatan"}
              </h3>
              <div className="text-white/70 mt-2">
                {locationStatus === "loading" && (
                  <p>Harap tunggu, kami sedang mencoba menentukan lokasi Anda secara otomatis.</p>
                )}
                {locationStatus === "permission_denied" && (
                  <p>Anda menolak izin lokasi. Silakan pilih kecamatan secara manual di peta.</p>
                )}
                {locationStatus === "outside_map" && (
                  <p>Lokasi Anda berada di luar jangkauan peta. Silakan pilih kecamatan terdekat secara manual.</p>
                )}
                {(locationStatus === "idle" || (!isGpsLocked && !selectedKecamatan)) && (
                  <p>Klik pada salah satu kecamatan di peta untuk memilih lokasi rumah Anda.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-amber-900/20 p-4 rounded-md border border-amber-800/30">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-amber-400 headline">Tentang Peta Risiko Rayap Surabaya</h3>
            <p className="mt-2 text-white/80 text-sm">
              Peta ini menunjukkan tingkat risiko serangan rayap di berbagai kecamatan di Surabaya berdasarkan data yang
              dikumpulkan oleh tim SnC Pest Control. Pilih kecamatan tempat rumah Anda berada untuk analisis yang lebih
              akurat.
            </p>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-black/30 p-2 rounded-md">
                <h4 className="font-bold text-amber-400 mb-1">Faktor Risiko Tinggi:</h4>
                <ul className="list-disc list-inside space-y-0.5 text-white/80">
                  <li>Kelembaban tinggi</li>
                  <li>Dekat dengan badan air</li>
                  <li>Bangunan tua ({">"}15 tahun)</li>
                  <li>Riwayat serangan rayap</li>
                </ul>
              </div>
              <div className="bg-black/30 p-2 rounded-md">
                <h4 className="font-bold text-amber-400 mb-1">Faktor Risiko Sedang:</h4>
                <ul className="list-disc list-inside space-y-0.5 text-white/80">
                  <li>Kelembaban moderat</li>
                  <li>Bangunan 5-15 tahun</li>
                  <li>Campuran material kayu</li>
                  <li>Drainase kurang baik</li>
                </ul>
              </div>
              <div className="bg-black/30 p-2 rounded-md">
                <h4 className="font-bold text-amber-400 mb-1">Faktor Risiko Rendah:</h4>
                <ul className="list-disc list-inside space-y-0.5 text-white/80">
                  <li>Kelembaban rendah</li>
                  <li>Bangunan baru ({"<"}5 tahun)</li>
                  <li>Material dominan beton</li>
                  <li>Sistem drainase baik</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}