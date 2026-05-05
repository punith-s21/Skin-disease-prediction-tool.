import { jsPDF } from 'jspdf';
import { Analysis } from '../types';

export async function generatePDFReport(
  analysis: Analysis,
  image: string,
  patientName: string = "Anonymous Patient",
  timestamp: string = new Date().toLocaleString()
) {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 30;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(19, 78, 74); // teal-900
  doc.text("DermAl Clinical Analysis Report", margin, y);
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${timestamp}`, margin, y);
  doc.text(`Patient Reference: ${patientName}`, margin + 100, y);

  y += 15;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);

  // Condition & Confidence
  y += 20;
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Clinical Finding:", margin, y);
  
  doc.setFont("helvetica", "normal");
  doc.text(analysis.condition, margin + 40, y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Confidence Score:", margin, y);
  
  const prob = (analysis.probability * 100).toFixed(1);
  doc.setFont("helvetica", "normal");
  doc.text(`${prob}%`, margin + 45, y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Severity Level:", margin, y);
  doc.text(analysis.severity, margin + 40, y);

  // Image Section
  y += 15;
  try {
    // Add captured image
    // We assume image is a dataURL
    doc.addImage(image, 'JPEG', margin, y, 80, 80);
    y += 90;
  } catch (e) {
    console.error("Error adding image to PDF", e);
    y += 10;
    doc.text("[Image processing failed]", margin, y);
    y += 10;
  }

  // Advice Section
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Medical Advice & Next Steps:", margin, y);
  
  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  // Split long recommendations into multiple lines
  const lines = doc.splitTextToSize(analysis.recommendation, pageWidth - (margin * 2));
  doc.text(lines, margin, y);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100);
  const footerY = doc.internal.pageSize.getHeight() - 25;
  
  const ethicalDisclaimer = "ETHICAL DISCLAIMER (MANDATORY): This system is for educational and research purposes only. It is not a medical diagnostic tool. Please consult a qualified healthcare professional.";
  const wrappedEthical = doc.splitTextToSize(ethicalDisclaimer, pageWidth - (margin * 2));
  doc.text(wrappedEthical, margin, footerY);

  doc.setTextColor(150);
  doc.text("Clinical Warning: This is an AI-assisted analysis and should be verified by a board-certified dermatologist.", margin, footerY + 10);

  // Save the PDF
  const filename = `Dermal_Report_${analysis.condition.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
  doc.save(filename);
}
