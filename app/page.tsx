"use client";

import { useState, useRef, useCallback, useMemo, ChangeEvent, DragEvent } from "react";
import { 
  FaUpload, FaDownload, FaCompressAlt, FaChartLine, FaImage, 
  FaRegImages, FaSpinner, FaInfoCircle, FaTrash, FaFileDownload, FaEye
} from "react-icons/fa";

// =============================================================================
// TYPES & HELPERS
// =============================================================================

// Estado individual de la imagen en el array
type ImageCompressionState = {
  id: string; // ID único para las claves de React
  file: File; // Referencia al objeto File original
  originalSize: number; // Size in KB
  originalSrc: string; // Data URL del original
  compressedSrc: string | null; // Data URL del comprimido
  compressedSize: number; // Size in KB
  isCompressing: boolean;
  error: string | null;
};

/**
 * Calcula un tamaño de archivo más preciso desde la Data URL (KB)
 */
const getFileSizeFromDataURL = (dataurl: string): number => {
  try {
    const base64 = dataurl.split(',')[1];
    if (!base64) return 0;
    const binary = atob(base64);
    return Number((binary.length / 1024).toFixed(2));
  } catch (error) {
    return 0;
  }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function MultiImageCompressor() {
  const [images, setImages] = useState<ImageCompressionState[]>([]);
  const [quality, setQuality] = useState(70);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_TOTAL_SIZE_MB = 50;

  // Obtenemos la primera imagen para usarla en la vista previa
  const previewImage = images[0];

  // ---------------------------------------------------------------------------
  // LÓGICA DE COMPRESIÓN INDIVIDUAL
  // ---------------------------------------------------------------------------
  
  const compressImage = useCallback((imgId: string, src: string, qualityPercent: number) => {
    
    setImages(prev => prev.map(img => img.id === imgId ? { ...img, isCompressing: true, error: null } : img));

    const img = new Image();
    img.src = src;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        setImages(prev => prev.map(img => img.id === imgId ? { ...img, isCompressing: false, error: "Canvas error." } : img));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);

      const compressedDataURL = canvas.toDataURL("image/jpeg", qualityPercent / 100);
      const fileSize = getFileSizeFromDataURL(compressedDataURL); 

      setImages(prev => prev.map(img => 
        img.id === imgId ? { 
          ...img, 
          compressedSrc: compressedDataURL, 
          compressedSize: fileSize,
          isCompressing: false 
        } : img
      ));
    };

    img.onerror = () => {
      setImages(prev => prev.map(i => i.id === imgId ? { ...i, isCompressing: false, error: 'Image load failed.' } : i));
    };
  }, []);


  // ---------------------------------------------------------------------------
  // MANEJO DE ARCHIVOS Y RECOMPRESIÓN
  // ---------------------------------------------------------------------------

  const handleFileProcessing = useCallback((fileList: FileList) => {
    
    const newImages: ImageCompressionState[] = [];
    let totalSize = images.reduce((sum, img) => sum + img.originalSize, 0);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const sizeInKB = Number((file.size / 1024).toFixed(2));
      totalSize += sizeInKB;

      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} ignored: Not an image.`);
        continue;
      }

      if (totalSize > MAX_TOTAL_SIZE_MB * 1024) {
        alert(`File ${file.name} ignored: Total batch size exceeds ${MAX_TOTAL_SIZE_MB}MB.`);
        break; 
      }

      const id = crypto.randomUUID();

      newImages.push({
        id,
        file,
        originalSize: sizeInKB,
        originalSrc: '', // Se llenará después de FileReader
        compressedSrc: null,
        compressedSize: 0,
        isCompressing: false, // Inicializar como falso hasta que se lea
        error: null,
      });

      // Leer el archivo
      const reader = new FileReader();
      reader.onloadstart = () => {
         setImages(prev => prev.map(img => img.id === id ? { ...img, isCompressing: true } : img));
      };
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const src = event.target?.result as string;
        setImages(prev => prev.map(img => img.id === id ? { ...img, originalSrc: src, isCompressing: true } : img));
        compressImage(id, src, quality);
      };
      reader.onerror = () => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, isCompressing: false, error: 'Read error.' } : img));
      };
      reader.readAsDataURL(file);
    }

    setImages(prev => [...prev, ...newImages]);
  }, [images, quality, compressImage]);


  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileProcessing(e.target.files);
      e.target.value = ''; 
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
      handleFileProcessing(e.dataTransfer.files);
    }
  };

  const handleQualityChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newQuality = Number(e.target.value);
    setQuality(newQuality);
    
    // Recomprimir todas las imágenes cargadas al cambiar la calidad
    if (images.length > 0) {
      setIsProcessingAll(true);
      
      // La primera imagen se re-comprime inmediatamente para la vista previa en vivo
      if (previewImage?.originalSrc) {
        compressImage(previewImage.id, previewImage.originalSrc, newQuality);
      }
      
      // El resto de imágenes se re-comprimen asíncronamente
      images.slice(1).forEach(img => {
        if (img.originalSrc) {
          setTimeout(() => compressImage(img.id, img.originalSrc, newQuality), 50); 
        }
      });

      setTimeout(() => setIsProcessingAll(false), 500); 
    }
  };
  
  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };
  
  // ---------------------------------------------------------------------------
  // CÁLCULOS DERIVADOS (USEMEMO)
  // ---------------------------------------------------------------------------

  const globalStats = useMemo(() => {
    const originalTotal = images.reduce((sum, img) => sum + img.originalSize, 0);
    const compressedTotal = images.reduce((sum, img) => sum + img.compressedSize, 0);
    const saved = originalTotal - compressedTotal;
    const ratio = originalTotal > 0 ? (saved / originalTotal) * 100 : 0;
    
    // Todas las imágenes deben tener una fuente comprimida o un error para considerarse "terminadas"
    const allCompressed = images.every(img => (img.compressedSrc || img.error) && !img.isCompressing);

    return {
      originalTotal: originalTotal.toFixed(1),
      compressedTotal: compressedTotal.toFixed(1),
      saved: saved > 0 ? saved.toFixed(1) : '0.0',
      ratio: ratio > 0 ? ratio.toFixed(1) : '0.0',
      allCompressed: allCompressed && images.length > 0,
    };
  }, [images]);


  // ---------------------------------------------------------------------------
  // LÓGICA DE DESCARGA POR LOTES (ZIP)
  // ---------------------------------------------------------------------------

  const handleBatchDownload = async () => {
    if (!globalStats.allCompressed) {
      alert("Please wait for all images to finish compressing.");
      return;
    }

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      images.forEach((img) => {
        if (img.compressedSrc) {
          const base64 = img.compressedSrc.split(',')[1];
          const originalName = img.file.name.replace(/\.[^/.]+$/, ""); 
          const fileName = `${originalName}_Q${quality}.jpg`; // Añadir calidad al nombre
          zip.file(fileName, base64, { base64: true });
        }
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `compressed_images_Q${quality}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Error creating ZIP file. Please check console.");
      console.error(error);
    }
  };


  // ---------------------------------------------------------------------------
  // RENDERIZADO
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header (Mismo que antes) */}
        <div className="text-center mb-10 pt-8">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-xl">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <FaRegImages className="text-white text-2xl" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Batch Image Compressor
            </h1>
          </div>
          <p className="text-gray-600 text-md mt-3">
            Load up to <b>{MAX_TOTAL_SIZE_MB}MB</b> of images to compress them all at once.
          </p>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-8 border border-white/20">
          
          {/* Upload Zone (Mismo que antes) */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.currentTarget.classList.add('border-blue-500', 'bg-blue-50')}
            onDragLeave={(e) => e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50')}
            className="border-3 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 hover:border-blue-400 hover:bg-blue-50 mb-8"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="p-4 bg-blue-100 rounded-2xl">
                <FaUpload className="text-blue-500 text-3xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">
                Drag and Drop Multiple Images Here
              </h3>
              <p className="text-gray-600">or click to browse files</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {images.length > 0 && (
            <>
              {/* Quality Controls */}
              <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <label htmlFor="quality-slider" className="font-semibold text-gray-800 text-lg flex items-center gap-2">
                    <FaChartLine className="text-blue-500" />
                    Global Compression Quality: {quality}%
                    {(isProcessingAll || images.some(img => img.isCompressing)) && (
                        <FaSpinner className="animate-spin text-blue-500 text-base" />
                    )}
                  </label>
                  <span className={`text-sm font-medium ${quality >= 80 ? 'text-green-600' : quality >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {quality >= 80 ? 'High Quality' : quality >= 50 ? 'Medium Quality' : 'Max Compression'}
                  </span>
                </div>
                
                <input
                  id="quality-slider"
                  type="range"
                  min="1"
                  max="100"
                  value={quality}
                  onChange={handleQualityChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Higher Compression (Smaller File)</span>
                  <span>Lower Compression (Better Quality)</span>
                </div>
              </div>

              {/* 🆕 LIVE PREVIEW SECTION */}
              {previewImage && (
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-blue-200">
                  <div className="flex items-center gap-2 mb-4">
                    <FaEye className="text-purple-500 text-xl" />
                    <h3 className="font-bold text-gray-800">Live Preview: {previewImage.file.name}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Original */}
                    <div className="text-center">
                        <p className="font-semibold text-gray-600 mb-2">Original ({previewImage.originalSize} KB)</p>
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-4 border-dashed border-red-300">
                            {previewImage.originalSrc ? (
                                <img src={previewImage.originalSrc} alt="Original Preview" className="w-full h-full object-contain" />
                            ) : <div className="p-4 text-sm text-gray-500">Loading original...</div>}
                        </div>
                    </div>
                    {/* Compressed */}
                    <div className="text-center">
                        <p className="font-semibold text-gray-600 mb-2 flex items-center justify-center gap-2">
                            Compressed ({previewImage.compressedSize} KB) 
                            {previewImage.isCompressing && <FaSpinner className="animate-spin text-sm text-yellow-600" />}
                        </p>
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-4 border-dashed border-green-300">
                            {previewImage.compressedSrc ? (
                                <img src={previewImage.compressedSrc} alt="Compressed Preview" className="w-full h-full object-contain" />
                            ) : <div className="p-4 text-sm text-gray-500">Compressing...</div>}
                        </div>
                        {previewImage.compressedSize > 0 && (
                            <p className="text-sm mt-2 text-green-600 font-medium">
                                Size Reduction: -{((previewImage.originalSize - previewImage.compressedSize) / previewImage.originalSize * 100).toFixed(1)}%
                            </p>
                        )}
                    </div>
                  </div>
                </div>
              )}
              {/* 🆕 END LIVE PREVIEW SECTION */}


              {/* Global Stats and Batch Download (Mismo que antes) */}
              <div className="flex flex-col md:flex-row justify-between items-center bg-blue-100/50 rounded-2xl p-5 mb-8 border border-blue-200">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center w-full md:w-auto">
                    <div>
                        <div className="text-xl font-bold text-gray-800">{images.length}</div>
                        <div className="text-sm text-gray-600">Files Loaded</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-red-600">{globalStats.originalTotal} KB</div>
                        <div className="text-sm text-gray-600">Original Total Size</div>
                    </div>
                    <div>
                        <div className={`text-xl font-bold ${globalStats.ratio > '0.0' ? 'text-green-600' : 'text-gray-500'}`}>
                            -{globalStats.ratio}%
                        </div>
                        <div className="text-sm text-gray-600">Total Reduction</div>
                    </div>
                </div>
                
                <button
                    onClick={handleBatchDownload}
                    disabled={!globalStats.allCompressed}
                    className={`
                        mt-4 md:mt-0 flex items-center gap-2 font-semibold px-6 py-3 rounded-xl shadow-lg transition-all duration-300
                        ${globalStats.allCompressed 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700' 
                            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        }
                    `}
                >
                    <FaFileDownload />
                    Download All ({globalStats.compressedTotal} KB ZIP)
                </button>
              </div>

              {/* Individual Image List (Mismo que antes, mejorado para consistencia) */}
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaImage className="text-purple-500" />
                Processing Queue
              </h3>
              
              <div className="space-y-4">
                {images.map(img => {
                  const saved = img.originalSize - img.compressedSize;
                  const ratio = img.originalSize > 0 ? (saved / img.originalSize) * 100 : 0;
                  
                  return (
                    <div key={img.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex items-center justify-between gap-4">
                        
                        {/* File Info */}
                        <div className="flex items-center gap-4 min-w-0 flex-grow">
                            <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                                {img.compressedSrc ? (
                                    <img src={img.compressedSrc} alt={img.file.name} className="w-full h-full object-cover" />
                                ) : (
                                    <FaRegImages className="text-gray-400 text-2xl" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-gray-800 truncate" title={img.file.name}>
                                    {img.file.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Original: {img.originalSize} KB
                                </p>
                            </div>
                        </div>

                        {/* Status / Stats */}
                        <div className="flex items-center gap-6 flex-shrink-0">
                            {img.error ? (
                                <span className="flex items-center text-red-500 font-medium text-sm">
                                    <FaInfoCircle className="mr-1" /> Error
                                </span>
                            ) : img.isCompressing ? (
                                <span className="flex items-center text-yellow-600 font-medium text-sm">
                                    <FaSpinner className="animate-spin mr-1" /> Compressing...
                                </span>
                            ) : (
                                img.compressedSrc && (
                                    <>
                                        <div className="text-center">
                                            <p className={`font-bold text-lg ${ratio > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                -{ratio.toFixed(1)}%
                                            </p>
                                            <p className="text-xs text-gray-500">Reduced</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-lg text-blue-600">
                                                {img.compressedSize} KB
                                            </p>
                                            <p className="text-xs text-gray-500">Final</p>
                                        </div>
                                    </>
                                )
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {img.compressedSrc && (
                                <a
                                    download={`${img.file.name.replace(/\.[^/.]+$/, "")}_Q${quality}.jpg`}
                                    href={img.compressedSrc}
                                    className="p-2 text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                                    title="Download Single Image"
                                >
                                    <FaDownload />
                                </a>
                            )}
                            <button
                                onClick={() => handleRemoveImage(img.id)}
                                className="p-2 text-red-500 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                                title="Remove Image"
                            >
                                <FaTrash />
                            </button>
                        </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Prompt to upload when the list is empty */}
          {images.length === 0 && (
            <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-gray-200">
                <FaRegImages className="text-4xl mx-auto mb-3" />
                <p>Start by dropping or browsing image files above.</p>
            </div>
          )}

          {/* Reset button (visible when images are present) */}
          {images.length > 0 && (
            <div className="mt-8 text-center">
                <button
                    onClick={() => setImages([])}
                    className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors border border-red-300 px-4 py-2 rounded-xl"
                >
                    Clear All Images and Reset
                </button>
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        .border-3 { border-width: 3px; }
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}