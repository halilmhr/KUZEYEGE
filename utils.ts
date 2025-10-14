
import { AppData } from './types';
import html2canvas from 'html2canvas';

declare const jspdf: any;

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const exportDataAsJSON = (data: AppData) => {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const link = document.createElement("a");
  link.href = jsonString;
  link.download = "ders-programi-verileri.json";
  link.click();
};


export const generatePdf = async (title: string, head: string[][], body: (string|number)[][]) => {
  // Geçici bir HTML tablo elementi oluştur
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.padding = '20px';
  tempDiv.style.fontFamily = 'Arial, sans-serif';
  
  // HTML içeriği oluştur
  let htmlContent = `
    <div style="width: 1200px; background: white; padding: 20px;">
      <h2 style="text-align: center; color: #16a085; margin-bottom: 20px; font-size: 24px;">${title}</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background-color: #16a085; color: white;">
            ${head[0].map(h => `<th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${body.map(row => `
            <tr>
              ${row.map((cell, idx) => `
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center; ${idx === 0 ? 'font-weight: bold; background-color: #f8f9fa;' : ''}">${cell}</td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);
  
  try {
    // HTML'i canvas'a çevir
    const canvas = await html2canvas(tempDiv, {
      scale: 2, // Yüksek çözünürlük için
      backgroundColor: '#ffffff',
      logging: false,
    });
    
    // Canvas'ı PDF'e ekle
    const { jsPDF } = jspdf;
    const imgWidth = 297; // A4 landscape width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const doc = new jsPDF({
      orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    doc.save(`${title.toLowerCase().replace(/\s/g, '_')}.pdf`);
    
  } finally {
    // Geçici elementi temizle
    document.body.removeChild(tempDiv);
  }
};
