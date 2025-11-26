"use client";

import { useState, useRef } from "react";
import { FaUpload, FaDownload, FaCompressAlt, FaChartLine, FaImage, FaRegImages } from "react-icons/fa";

export default function ImageCompressor() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [compressedSrc, setCompressedSrc] = useState<string | null>(null);
  const [quality, setQuality] = useState(70);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setOriginalSize(Number((file.size / 1024).toFixed(2)));
    setIsCompressing(true);

    const reader = new FileReader();
    reader.onload = (event: any) => {
      setImageSrc(event.target.result);
      compressImage(event.target.result, quality);
    };
    reader.readAsDataURL(file);
  };

  const compressImage = (src: string, qualityPercent: number) => {
    const img = new Image();
    img.src = src;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0, img.width, img.height);

      const compressed = canvas.toDataURL("image/jpeg", qualityPercent / 100);
      setCompressedSrc(compressed);

      const fileSize = Math.round((compressed.length * 3) / 4 / 1024);
      setCompressedSize(fileSize);
      setIsCompressing(false);
    };

    img.onerror = () => {
      setIsCompressing(false);
      alert('Error loading image');
    };
  };

  const compressionRatio = originalSize > 0 ? ((originalSize - compressedSize) / originalSize * 100).toFixed(1) : 0;
  const savedSize = originalSize - compressedSize;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) {
      handleFile({ target: { files: e.dataTransfer.files } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <FaCompressAlt className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Image Compressor
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Compress images without losing quality
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-8 border border-white/20">
          {/* Upload Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-3 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 hover:border-blue-400 hover:bg-blue-25 mb-8"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="p-4 bg-blue-100 rounded-2xl">
                <FaUpload className="text-blue-500 text-3xl" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Drop your image here
                </h3>
                <p className="text-gray-600">or click to browse files</p>
                <p className="text-gray-500 text-sm mt-2">
                  Supports JPG, PNG, WebP, GIF
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          {/* Quality Controls */}
          {imageSrc && (
            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <label className="font-semibold text-gray-800 text-lg flex items-center gap-2">
                  <FaChartLine className="text-blue-500" />
                  Compression Quality: {quality}%
                </label>
                <span className="text-sm text-gray-600">
                  {quality >= 80 ? 'High' : quality >= 50 ? 'Medium' : 'Low'}
                </span>
              </div>
              
              <input
                type="range"
                min="1"
                max="100"
                value={quality}
                onChange={(e) => {
                  const newQuality = Number(e.target.value);
                  setQuality(newQuality);
                  if (imageSrc) {
                    setIsCompressing(true);
                    compressImage(imageSrc, newQuality);
                  }
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Smaller File</span>
                <span>Better Quality</span>
              </div>
            </div>
          )}

          {/* Compression Stats */}
          {compressedSrc && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-4 text-center border border-green-200">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {compressionRatio}%
                </div>
                <div className="text-sm text-green-700 font-medium">
                  Size Reduced
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-2xl p-4 text-center border border-blue-200">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {savedSize.toFixed(1)} KB
                </div>
                <div className="text-sm text-blue-700 font-medium">
                  Space Saved
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl p-4 text-center border border-purple-200">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {((compressedSize / originalSize) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-purple-700 font-medium">
                  Final Size
                </div>
              </div>
            </div>
          )}

          {/* Image Previews */}
          {(imageSrc || compressedSrc) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Original Image */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <FaImage className="text-blue-500" />
                  <h3 className="font-semibold text-gray-800">Original Image</h3>
                </div>
                <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
                  <img 
                    src={imageSrc!} 
                    alt="Original" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Size: {originalSize} KB</span>
                  <span className="text-red-500 font-medium">Original</span>
                </div>
              </div>

              {/* Compressed Image */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <FaRegImages className="text-green-500" />
                  <h3 className="font-semibold text-gray-800">Compressed Image</h3>
                  {isCompressing && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full ml-2">
                      Compressing...
                    </span>
                  )}
                </div>
                <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
                  <img 
                    src={compressedSrc!} 
                    alt="Compressed" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Size: {compressedSize} KB
                    <span className="text-green-500 font-medium ml-2">
                      (-{savedSize.toFixed(1)} KB)
                    </span>
                  </div>
                  <a
                    download="compressed.jpg"
                    href={compressedSrc!}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold px-4 py-2 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <FaDownload />
                    Download
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Why Compress Images?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FaChartLine className="text-blue-600 text-xl" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Faster Loading</h4>
              <p className="text-gray-600 text-sm">
                Smaller images load faster on websites and apps
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FaCompressAlt className="text-green-600 text-xl" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Save Storage</h4>
              <p className="text-gray-600 text-sm">
                Reduce storage space and bandwidth usage
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FaUpload className="text-purple-600 text-xl" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Better Performance</h4>
              <p className="text-gray-600 text-sm">
                Optimized images improve user experience
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
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