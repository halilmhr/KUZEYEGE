
import { AppData } from './types';

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


export const generatePdf = (title: string, head: string[][], body: (string|number)[][]) => {
  const { jsPDF } = jspdf;
  const doc = new jsPDF();

  doc.text(title, 14, 16);
  doc.autoTable({
    startY: 20,
    head: head,
    body: body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
    },
    headStyles: {
      fillColor: [22, 160, 133],
      textColor: 255,
      fontStyle: 'bold',
    },
  });

  doc.save(`${title.toLowerCase().replace(/\s/g, '_')}.pdf`);
};
