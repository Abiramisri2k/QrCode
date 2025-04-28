import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import QRCode from 'qrcode';
import { toast } from "sonner";
import { Download, X } from "lucide-react";
import { jsPDF } from "jspdf";

export default function QRCodeGenerator() {
  const [url, setUrl] = useState('');
  const [logo, setLogo] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [qrCodeSvg, setQrCodeSvg] = useState('');
  const [fillColor, setFillColor] = useState('#000000');
  const [quality, setQuality] = useState('medium');
  const [newQrGenerated, setNewQrGenerated] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const fileInputRef = useRef(null);
  const downloadOptionsRef = useRef(null);

  const qualityMap = {
    low: 600,
    medium: 1200,
    high: 2400,
  };

  useEffect(() => {
    generateDefaultQRCode();
  }, []);

  useEffect(() => {
    if (newQrGenerated && !url && !logo) {
      generateDefaultQRCode();
    }
  }, [url, logo, newQrGenerated]);

  useEffect(() => {
    // Only add the event listener if the dropdown is showing
    if (showDownloadOptions) {
      const handleClickOutside = (event) => {
        // Check if we clicked outside the dropdown AND outside the button that opened it
        if (
          downloadOptionsRef.current && 
          !downloadOptionsRef.current.contains(event.target) &&
          // Make sure we're not clicking the button itself
          !event.target.closest('button[data-download-btn="true"]')
        ) {
          setShowDownloadOptions(false);
        }
      };
      
      // Use mousedown instead of click for better UX
      document.addEventListener('mousedown', handleClickOutside);
      
      // Cleanup function
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDownloadOptions]);

  const generateDefaultQRCode = async () => {
    try {
      const qrOptions = {
        color: {
          dark: fillColor,
          light: "#ffffff",
        },
        width: qualityMap[quality] || qualityMap.medium,
        margin: 1,
        errorCorrectionLevel: "M",
      };

      // Generate PNG version
      const qrDataUrl = await QRCode.toDataURL(
        "https://qr-code-pearl-xi.vercel.app/",
        qrOptions
      );
      setQrCode(qrDataUrl);

      // Generate SVG version
      const svgString = await QRCode.toString(
        "https://qr-code-pearl-xi.vercel.app/",
        {
          type: "svg",
          color: {
            dark: fillColor,
            light: "#ffffff",
          },
          width: qualityMap[quality] || qualityMap.medium,
          margin: 1,
          errorCorrectionLevel: "M",
        }
      );
      setQrCodeSvg(
        "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgString)
      );

      setNewQrGenerated(false);
    } catch (error) {
      console.error("Default QR generation error:", error);
      toast.error("Failed to generate default QR code");
    }
  };

  // Function to validate and format URL
  const validateAndFormatUrl = (inputUrl) => {
    // If input is empty, return empty string
    if (!inputUrl || inputUrl.trim() === '') {
      return '';
    }
    
    try {
      // Check if it's a valid URL by trying to construct a URL object
      // If it doesn't have a protocol, add https://
      let formattedUrl = inputUrl;
      if (!inputUrl.match(/^[a-zA-Z]+:\/\//)) {
        formattedUrl = 'https://' + inputUrl;
      }
      
      // This will throw an error if URL is malformed
      new URL(formattedUrl);
      return formattedUrl;
    } catch (error) {
      // If it's not a URL, treat it as text
      console.log("Not a valid URL, treating as text");
      return inputUrl;
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // Accept SVG files and common image formats
      if (!file.type.includes("svg")) {
        toast.error("Only SVG files are supported for logo upload");
        return;
      }
      setLogo(file);

      try {
        const logoDataUrl = await readFileAsDataURL(file);
        const urlToUse = url || "https://qr-code-pearl-xi.vercel.app/";
        generateQRCodeWithLogo(urlToUse, logoDataUrl);
      } catch (error) {
        console.error("Logo processing error:", error);
        toast.error("Failed to process the logo");
      }
    }
  };

  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generateQRCodeWithLogo = async (contentToEncode, logoDataUrl) => {
    try {
      if (!contentToEncode) {
        throw new Error("No URL provided");
      }

      const qrOptions = {
        color: {
          dark: fillColor,
          light: "#ffffff",
        },
        width: qualityMap[quality] || qualityMap.medium,
        margin: 1,
        errorCorrectionLevel: "H",
      };

      const qrDataUrl = await QRCode.toDataURL(contentToEncode, qrOptions);

      const svgString = await QRCode.toString(contentToEncode, {
        type: "svg",
        color: {
          dark: fillColor,
          light: "#ffffff",
        },
        width: qualityMap[quality] || qualityMap.medium,
        margin: 1,
        errorCorrectionLevel: "H",
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const qrImg = new Image();
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });

      canvas.width = qrImg.width;
      canvas.height = qrImg.height;
      ctx.drawImage(qrImg, 0, 0);

      const logoImg = new Image();
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = (e) => {
          console.error("Logo load error:", e);
          reject(e);
        };
        logoImg.src = logoDataUrl;
      });

      const maxLogoSize = qrImg.width * 0.40;
      const aspectRatio = logoImg.naturalWidth / logoImg.naturalHeight;

      let logoWidth, logoHeight;

      if (aspectRatio >= 1) {
        logoWidth = maxLogoSize;
        logoHeight = maxLogoSize / aspectRatio;
      } else {
        logoHeight = maxLogoSize;
        logoWidth = maxLogoSize * aspectRatio;
      }

      const logoX = (qrImg.width - logoWidth) / 2;
      const logoY = (qrImg.height - logoHeight) / 2;
      const logoPadding = qrImg.width * 0.02;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        logoX - logoPadding,
        logoY - logoPadding,
        logoWidth + logoPadding * 2,
        logoHeight + logoPadding * 2
      );

      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);

      const finalQrDataUrl = canvas.toDataURL();
      setQrCode(finalQrDataUrl);
      setQrCodeSvg(
        "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgString)
      );

      setNewQrGenerated(true);
      toast.success("QR code with logo created successfully");
    } catch (error) {
      console.error("QR code with logo generation error:", error);
      toast.error("Failed to generate QR code with logo");
    }
  };
  
  const generateQRCode = async () => {
    const hasUrl = !!url.trim();
    const hasLogo = !!logo;
  
    // If no URL but logo exists — show error
    if (!hasUrl && hasLogo) {
      toast.error("Please provide the URL");
      return;
    }
  
    // If both are missing — fallback to default
    if (!hasUrl && !hasLogo) {
      generateDefaultQRCode();
      toast.error("Please provide the URL");
      return;
    }
  
    try {
      const contentToEncode = validateAndFormatUrl(url);
  
      const qrOptions = {
        color: {
          dark: fillColor,
          light: "#ffffff",
        },
        width: qualityMap[quality] || qualityMap.medium,
        margin: 1,
        errorCorrectionLevel: "H", // Always use high error correction
      };
  
      if (hasLogo) {
        const logoDataUrl = await readFileAsDataURL(logo);
        await generateQRCodeWithLogo(contentToEncode, logoDataUrl);
        return;
      }
  
      // Generate QR without logo
      const qrDataUrl = await QRCode.toDataURL(contentToEncode, qrOptions);
      setQrCode(qrDataUrl);
  
      const svgString = await QRCode.toString(contentToEncode, {
        type: "svg",
        color: {
          dark: fillColor,
          light: "#ffffff",
        },
        width: qualityMap[quality] || qualityMap.medium,
        margin: 1,
        errorCorrectionLevel: "H",
      });
  
      setQrCodeSvg(
        "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgString)
      );
  
      setNewQrGenerated(true);
    } catch (error) {
      console.error("QR code generation error:", error);
      toast.error("Failed to generate QR code. Please check your input.");
    }
  };

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    // The QR code will be updated by the useEffect hook
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!url) generateDefaultQRCode();
    toast.success("Logo removed");
  };

  const handleDownloadFormat = async (chosenFormat) => {
    setShowDownloadOptions(false);
    await downloadQRCode(chosenFormat);
  };

  const downloadQRCode = async (formatToUse) => {
    if (!qrCode) return;

    try {
      if (formatToUse === 'pdf') {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const qrSize = pageWidth * 0.8;
        const xPos = (pageWidth - qrSize) / 2;
        const yPos = 20;

        pdf.addImage(qrCode, 'PNG', xPos, yPos, qrSize, qrSize);
        pdf.setFontSize(16);
        pdf.text('QR Code', pageWidth / 2, yPos + qrSize + 10, { align: 'center' });
        pdf.save('qr-code.pdf');
        toast.success("PDF downloaded successfully");
        return;
      }

      // For SVG format, use the SVG data
      const dataUrl = formatToUse === 'svg' ? qrCodeSvg : qrCode;
      
      const link = document.createElement('a');
      link.download = `qr-code.${formatToUse}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`QR code downloaded as ${formatToUse.toUpperCase()}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(`Failed to download QR code as ${formatToUse.toUpperCase()}`);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-sm max-w-6xl w-full">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2">
            <h1 className="text-3xl font-bold mb-8 text-indigo-500">
              QR Code Generator
            </h1>

            <div className="mb-6">
              <label className="block text-gray-800 mb-2 text-lg font-medium">
                Data for QR code:
              </label>
              <input
                type="text"
                placeholder="Enter your URL here"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={url}
                onChange={handleUrlChange}
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-800 mb-2 text-lg font-medium">
                Add logo:
              </label>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".svg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload file
                </Button>
                {logo && (
                  <div className="mt-2 flex items-center justify-between bg-gray-100 px-3 py-2 rounded">
                    <p className="text-sm text-gray-700 truncate max-w-[200px]">
                      {logo.name}
                    </p>
                    <X
                      className="w-4 h-4 text-red-500 cursor-pointer"
                      onClick={handleRemoveLogo}
                    />
                  </div>
                )}
                <p className="text-sm text-gray-500">
                  Only SVG files are supported.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-800 mb-2 text-lg font-medium">
                Choose fill color:
              </label>
              <div className="relative">
                <Input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="h-12 w-full"
                />
                <Input
                  type="text"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="mt-2"
                  placeholder="Hex code"
                />
              </div>
            </div>
          </div>

          <div className="md:w-1/2">
            <div className="border rounded-lg p-4 bg-white mb-6 flex justify-center items-center min-h-64">
              {qrCode && (
                <img src={qrCode} alt="QR Code Preview" className="w-64 h-64" />
              )}
            </div>

            <div className="mb-6">
              <Label className="block text-gray-800 mb-2 text-lg font-medium">
                Choose quality:
              </Label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger className="w-full border border-gray-300 rounded-lg px-4 py-3">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (600×600)</SelectItem>
                  <SelectItem value="medium">Medium (1200×1200)</SelectItem>
                  <SelectItem value="high">High (2400×2400)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={generateQRCode}
              className="w-full bg-indigo-500 text-white font-medium py-3 px-4 rounded-lg hover:bg-indigo-600 mb-4"
            >
              Generate QR Code
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                className="w-full border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 flex justify-center items-center"
                disabled={!newQrGenerated} 
                onClick={() => {if (!url.trim()) {
                  toast.error("Please provide the URL to enable download.");
                  return;
                } setShowDownloadOptions((prev) => !prev);
              }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download QR Code
              </Button>

              {showDownloadOptions && (
                <div  ref={downloadOptionsRef} className="absolute mt-2 w-full rounded-lg shadow-lg bg-white border z-10">
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-lg"
                    onClick={() => handleDownloadFormat("png")}
                  >
                    Download as PNG
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                    onClick={() => handleDownloadFormat("svg")}
                  >
                    Download as SVG
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-b-lg"
                    onClick={() => handleDownloadFormat("pdf")}
                  >
                    Download as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
