import { jsPDF } from 'jspdf';
import { Analysis, Severity } from '../types';

export function parseRecommendationPoints(raw: string): string[] {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const points: string[] = [];

  for (const line of lines) {
    let clean = line.replace(/^\*\*.*?\*\*:\s*/, '').trim();
    if (!clean) continue;

    const bulletMatch = clean.match(/^[-*•\d\.\)]+\s*(.*)$/);
    if (bulletMatch && bulletMatch[1].trim()) {
      clean = bulletMatch[1].trim();
    }

    if (clean.includes('. ') && clean.length > 90) {
      const sentences = clean
        .split(/(?<=[.?!])\s+(?=[A-Z0-9\u0900-\u0DFF])/g)
        .map(s => s.trim().replace(/^[-*•\d\.\)]+\s*/, ''))
        .filter(s => s.length > 5);
      if (sentences.length > 1) {
        points.push(...sentences);
        continue;
      }
    }

    if (clean.length > 0) {
      points.push(clean);
    }
  }

  if (points.length === 0) {
    return raw
      .split(/(?<=[.?!])\s+/g)
      .map(s => s.replace(/^[-*•\d\.\)]+\s*/, '').trim())
      .filter(s => s.length > 5);
  }

  return points;
}

export async function generatePDFReport(
  analysis: Analysis,
  image: string,
  patientName: string = "Anonymous Patient",
  timestamp: string = new Date().toLocaleString(),
  language: string = "English"
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2); // 182mm
  let y = 14;

  // Language normalizer
  const normalizeLang = (l: string): string => {
    const map: Record<string, string> = {
      'en-IN': 'English',
      'hi-IN': 'Hindi',
      'te-IN': 'Telugu',
      'kn-IN': 'Kannada',
      'ta-IN': 'Tamil',
      'mr-IN': 'Marathi',
      'bn-IN': 'Bengali'
    };
    return map[l] || l || 'English';
  };

  const resolvedLang = normalizeLang(language);

  // Localization Strings
  const translations: Record<string, any> = {
    "English": {
      title: "DermAI Clinical Screening Report",
      subtitle: "AI-Assisted Dermatological Analysis & Triage Summary",
      generated: "Generated Date",
      patient: "Patient Reference",
      finding: "Clinical Finding",
      confidence: "Confidence",
      severity: "Severity Priority",
      localization: "Localization",
      advice: "Clinical Recommendations & Action Plan",
      features: "Observed Diagnostic Features",
      disclaimer: "ETHICAL DISCLAIMER: This system is for educational & preliminary triage assistance only. It is not a substitute for formal clinical laboratory diagnosis.",
      warning: "Clinical Safety Note: Always consult a registered medical practitioner or dermatologist for medical diagnosis and treatment plans."
    },
    "Hindi": {
      title: "DermAI नैदानिक त्वचा जांच रिपोर्ट",
      subtitle: "एआई-सहायता प्राप्त त्वचा विश्लेषण और प्राथमिक परामर्श",
      generated: "दिनांक एवं समय",
      patient: "रोगी का नाम",
      finding: "नैदानिक निष्कर्ष",
      confidence: "सटीकता",
      severity: "गंभीरता स्तर",
      localization: "प्रभावित स्थान",
      advice: "प्राथमिक सिफारिशें एवं आवश्यक कदम",
      features: "प्रमुख नैदानिक लक्षण",
      disclaimer: "नैतिक अस्वीकरण: यह रिपोर्ट केवल प्रारंभिक मार्गदर्शन और शैक्षिक सहायता के लिए है। यह औपचारिक चिकित्सा निदान का विकल्प नहीं है।",
      warning: "चिकित्सा सुरक्षा नोट: कृपया किसी योग्य त्वचा रोग विशेषज्ञ या चिकित्सक से परामर्श अवश्य करें।"
    },
    "Telugu": {
      title: "DermAI క్లినికల్ చర్మ పరీక్ష నివేదిక",
      subtitle: "AI ఆధారిత చర్మ విశ్లేషణ మరియు ప్రాథమిక మార్గదర్శకత్వం",
      generated: "తేదీ మరియు సమయం",
      patient: "రోగి వివరాలు",
      finding: "క్లినికల్ నిర్ధారణ",
      confidence: "ఖచ్చితత్వం",
      severity: "తీవ్రత స్థాయి",
      localization: "శరీర భాగం",
      advice: "సిఫార్సులు మరియు తదుపరి చర్యలు",
      features: "గమనించిన చర్మ లక్షణాలు",
      disclaimer: "నైతిక నిరాకరణ: ఇది విద్యా మరియు ప్రాథమిక అవగాహన కొరకు మాత్రమే. ఇది పూర్తి స్థాయి వైద్య నిర్ధారణ కాదు.",
      warning: "వైద్య హెచ్చరిక: దయచేసి అర్హత కలిగిన చర్మ నిపుణుడిని సంప్రదించి సలహా పొందండి."
    },
    "Kannada": {
      title: "DermAI ವೈದ್ಯಕೀಯ ಚರ್ಮ ತಪಾಸಣೆ ವರದಿ",
      subtitle: "AI-ಆಧಾರಿತ ಚರ್ಮದ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಪ್ರಾಥಮಿಕ ಮಾರ್ಗದರ್ಶನ",
      generated: "ದಿನಾಂಕ ಮತ್ತು ಸಮಯ",
      patient: "ರೋಗಿಯ ಉಲ್ಲೇಖ",
      finding: "ವೈದ್ಯಕೀಯ ಶೋಧನೆ",
      confidence: "ಆತ್ಮವಿಶ್ವಾಸ",
      severity: "ತೀವ್ರತೆಯ ಮಟ್ಟ",
      localization: "ಪೀಡಿತ ಭಾಗ",
      advice: "ಪ್ರಾಥಮಿಕ ಶಿಫಾರಸುಗಳು ಮತ್ತು ಮುಂದಿನ ಕ್ರಮಗಳು",
      features: "ಗಮನಿಸಿದ ವೈದ್ಯಕೀಯ ಲಕ್ಷಣಗಳು",
      disclaimer: "ನೈತಿಕ ಹಕ್ಕು ನಿರಾಕರಣೆ: ಇದು ಶೈಕ್ಷಣಿಕ ಮತ್ತು ಪ್ರಾಥಮಿಕ ಮಾರ್ಗದರ್ಶನಕ್ಕಾಗಿ ಮಾತ್ರ. ಇದು ಅಂತಿಮ ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯವಲ್ಲ.",
      warning: "ವೈದ್ಯಕೀಯ ಎಚ್ಚರಿಕೆ: ದಯವಿಟ್ಟು ಚಿಕಿತ್ಸೆಗಾಗಿ ಅರ್ಹ ವೈದ್ಯರು ಅಥವಾ ಚರ್ಮರೋಗ ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಿ."
    },
    "Tamil": {
      title: "DermAI மருத்துவ தோல் பரிசோதனை அறிக்கை",
      subtitle: "AI அடிப்படையிலான தோல் பகுப்பாய்வு மற்றும் ஆரம்ப வழிகாட்டுதல்",
      generated: "தேதி மற்றும் நேரம்",
      patient: "நோயாளி குறிப்பு",
      finding: "மருத்துவ முடிவு",
      confidence: "நம்பகத்தன்மை",
      severity: "தீவிர நிலை",
      localization: "பாதிக்கப்பட்ட பகுதி",
      advice: "முதன்மை பரிந்துரைகள் மற்றும் வழிகாட்டுதல்கள்",
      features: "கண்டறியப்பட்ட அறிகுறிகள்",
      disclaimer: "முக்கிய மறுப்பு: இது கல்வி மற்றும் ஆரம்ப வழிகாட்டலுக்கு மட்டுமே. முறையான மருத்துவ பரிசோதனைக்கு மாற்றாகாது.",
      warning: "மருத்துவ எச்சரிக்கை: தகுதிவாய்ந்த மருத்துவரிடம் உறுதிசெய்து சிகிச்சை பெறவும்."
    },
    "Marathi": {
      title: "DermAI क्लिनिकल त्वचा तपासणी अहवाल",
      subtitle: "AI-आधारित त्वचा विश्लेषण आणि प्राथमिक सल्ला",
      generated: "तारीख आणि वेळ",
      patient: "रुग्ण संदर्भ",
      finding: "क्लिनिकल निष्कर्ष",
      confidence: "अचूकता",
      severity: "तीव्रता",
      localization: "प्रभावित भाग",
      advice: "प्राथमिक शिफारसी आणि पुढील पावले",
      features: "निरीक्षण केलेली लक्षणे",
      disclaimer: "नैतिक अस्वीकरण: हा अहवाल केवळ शैक्षणिक व प्राथमिक मार्गदर्शनासाठी आहे. हे अंतिम वैद्यकीय निदान नाही.",
      warning: "वैद्यकीय चेतावणी: उपचारासाठी कृपया तज्ञ डॉक्टरांचा सल्ला घ्या."
    },
    "Bengali": {
      title: "DermAI ক্লিনিকাল ত্বক পরীক্ষা রিপোর্ট",
      subtitle: "AI-ভিত্তিক ত্বক বিশ্লেষণ এবং প্রাথমিক পরামর্শ",
      generated: "তারিখ ও সময়",
      patient: "রোগীর বিবরণ",
      finding: "ক্লিনিকাল ফলাফল",
      confidence: "নির্ভুলতা",
      severity: "তীব্রতার মাত্রা",
      localization: "আক্রান্ত স্থান",
      advice: "প্রাথমিক পরামর্শ ও প্রয়োজনীয় পদক্ষেপ",
      features: "পর্যবেক্ষিত লক্ষণসমূহ",
      disclaimer: "নৈতিক দাবিত্যাগ: এটি কেবল শিক্ষামূলক এবং প্রাথমিক ট্রায়াজ সহায়তার জন্য। এটি চূড়ান্ত চিকিৎসা রিপোর্ট নয়।",
      warning: "চিকিৎসা সতর্কতা: সঠিক চিকিৎসার জন্য সর্বদা বিশেষজ্ঞ চিকিৎসকের পরামর্শ নিন।"
    }
  };

  const t = translations[resolvedLang] || translations["English"];

  // Ultra-crisp Canvas Renderer for Indic & Multilingual text
  const renderTextToImage = (
    text: string, 
    fontSizePt: number, 
    isBold: boolean = false, 
    maxWidthMm: number = 180,
    textColor: string = '#1e293b'
  ): { data: string; width: number; height: number } | null => {
    if (!text || typeof text !== 'string') return null;
    const cleanText = text.replace(/[*#`_]/g, '').trim();
    if (!cleanText) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // High resolution scaling (3x scale)
    const scale = 3;
    const pxPerMm = 3.779528;
    const targetWidthPx = Math.max(10, Math.round(maxWidthMm * pxPerMm * scale));
    const fontPx = Math.round(fontSizePt * 1.3333 * scale);
    
    // Clean font stack prioritizing native Indic fonts
    const fontStack = `${isBold ? 'bold' : 'normal'} ${fontPx}px "Noto Sans Kannada", "Noto Sans Devanagari", "Noto Sans Telugu", "Noto Sans Tamil", "Noto Sans Bengali", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif`;
    ctx.font = fontStack;

    // Word wrapping with punctuation break support
    const paragraphs = cleanText.split('\n');
    const lines: string[] = [];

    for (const para of paragraphs) {
      if (!para.trim()) continue;
      const words = para.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > (targetWidthPx - (8 * scale)) && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
    }

    if (lines.length === 0) return null;

    const lineSpacingPx = Math.round(fontPx * 1.45);
    const topPaddingPx = Math.round(3 * scale);
    const bottomPaddingPx = Math.round(3 * scale);
    const targetHeightPx = lines.length * lineSpacingPx + topPaddingPx + bottomPaddingPx;

    canvas.width = targetWidthPx;
    canvas.height = targetHeightPx;

    // Canvas resize resets context state, so reapply font
    ctx.font = fontStack;
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'top';

    lines.forEach((line, idx) => {
      ctx.fillText(line.trim(), 2 * scale, topPaddingPx + (idx * lineSpacingPx));
    });

    const renderedHeightMm = (canvas.height / canvas.width) * maxWidthMm;

    return {
      data: canvas.toDataURL('image/png'),
      width: maxWidthMm,
      height: renderedHeightMm
    };
  };

  // 1. TOP BRAND HEADER
  doc.setFillColor(15, 118, 110); // Primary Teal (#0f766e)
  doc.rect(margin, y, 3.5, 14, 'F');

  // Title Image
  const titleImg = renderTextToImage(t.title, 16, true, contentWidth - 8, '#0f766e');
  if (titleImg) {
    doc.addImage(titleImg.data, 'PNG', margin + 6, y, titleImg.width, titleImg.height);
    y += titleImg.height + 1;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 118, 110);
    doc.text(t.title, margin + 6, y + 5);
    y += 7;
  }

  // Subtitle Image
  const subImg = renderTextToImage(t.subtitle, 8.5, false, contentWidth - 8, '#64748b');
  if (subImg) {
    doc.addImage(subImg.data, 'PNG', margin + 6, y, subImg.width, subImg.height);
    y += subImg.height + 4;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(t.subtitle, margin + 6, y + 3);
    y += 5;
  }

  // 2. METADATA ROW (Date & Patient)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'FD');

  const halfWidth = (contentWidth - 6) / 2;
  const metaDateImg = renderTextToImage(`${t.generated}: ${timestamp}`, 8, false, halfWidth, '#475569');
  if (metaDateImg) {
    doc.addImage(metaDateImg.data, 'PNG', margin + 4, y + 2, metaDateImg.width, metaDateImg.height);
  }

  const metaPatImg = renderTextToImage(`${t.patient}: ${patientName}`, 8, false, halfWidth, '#475569');
  if (metaPatImg) {
    doc.addImage(metaPatImg.data, 'PNG', margin + halfWidth + 6, y + 2, metaPatImg.width, metaPatImg.height);
  }

  y += 14;

  // 3. MAIN SPECIMEN & DIAGNOSTIC CARD
  const cardStartY = y;
  const imageDim = 46; // 46mm square image

  // Left Column: Specimen Image
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, cardStartY, imageDim, imageDim, 3, 3, 'FD');

  try {
    doc.addImage(image, 'JPEG', margin + 1.5, cardStartY + 1.5, imageDim - 3, imageDim - 3);
  } catch (err) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("[Specimen Image]", margin + 8, cardStartY + 23);
  }

  // Right Column: Findings
  const rightColX = margin + imageDim + 8;
  const rightColWidth = contentWidth - imageDim - 8;
  let rightY = cardStartY;

  // Condition Name
  const conditionImg = renderTextToImage(analysis.condition, 13.5, true, rightColWidth, '#0f172a');
  if (conditionImg) {
    doc.addImage(conditionImg.data, 'PNG', rightColX, rightY, conditionImg.width, conditionImg.height);
    rightY += conditionImg.height + 2;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(analysis.condition, rightColX, rightY + 4);
    rightY += 8;
  }

  // Confidence & Severity Pill Row
  const probPercent = Math.round(analysis.probability * 100);
  const metaBadgeText = `${t.confidence}: ${probPercent}%  |  ${t.severity}: ${analysis.severity}`;
  const badgeImg = renderTextToImage(metaBadgeText, 9, true, rightColWidth, '#0f766e');
  if (badgeImg) {
    doc.addImage(badgeImg.data, 'PNG', rightColX, rightY, badgeImg.width, badgeImg.height);
    rightY += badgeImg.height + 2;
  } else {
    rightY += 5;
  }

  // Anatomical Localization
  if (analysis.localization) {
    const locText = `${t.localization}: ${analysis.localization}`;
    const locImg = renderTextToImage(locText, 8.5, false, rightColWidth, '#334155');
    if (locImg) {
      doc.addImage(locImg.data, 'PNG', rightColX, rightY, locImg.width, locImg.height);
      rightY += locImg.height + 2;
    }
  }

  // Key Clinical Features
  if (analysis.features && analysis.features.length > 0) {
    const feats = analysis.features.slice(0, 3);
    for (const feat of feats) {
      const featImg = renderTextToImage(`• ${feat}`, 8, false, rightColWidth, '#64748b');
      if (featImg) {
        doc.addImage(featImg.data, 'PNG', rightColX, rightY, featImg.width, featImg.height);
        rightY += featImg.height + 1;
      }
    }
  }

  // Calculate safe next Y coordinate
  y = Math.max(cardStartY + imageDim + 8, rightY + 6);

  // 4. RECOMMENDATIONS & ACTION PLAN SECTION
  doc.setFillColor(240, 253, 250); // teal-50
  doc.setDrawColor(204, 251, 241); // teal-100
  
  // Section Header
  const adviceHeaderImg = renderTextToImage(t.advice, 11, true, contentWidth, '#0f766e');
  if (adviceHeaderImg) {
    doc.addImage(adviceHeaderImg.data, 'PNG', margin, y, adviceHeaderImg.width, adviceHeaderImg.height);
    y += adviceHeaderImg.height + 3;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 118, 110);
    doc.text(t.advice, margin, y + 4);
    y += 7;
  }

  // Divider under advice header
  doc.setDrawColor(204, 251, 241);
  doc.line(margin, y, margin + contentWidth, y);
  y += 4;

  // Numbered points
  const points = parseRecommendationPoints(analysis.recommendation);
  const pointWidth = contentWidth - 4;

  if (points.length > 0) {
    points.forEach((point, idx) => {
      const pointText = `${idx + 1}. ${point}`;
      const itemImg = renderTextToImage(pointText, 9.5, false, pointWidth, '#1e293b');

      if (itemImg) {
        // Page overflow check
        if (y + itemImg.height > pageHeight - 34) {
          doc.addPage();
          y = 16;
        }

        doc.addImage(itemImg.data, 'PNG', margin + 2, y, itemImg.width, itemImg.height);
        y += itemImg.height + 3;
      }
    });
  } else {
    const fallbackImg = renderTextToImage(analysis.recommendation, 9.5, false, pointWidth, '#1e293b');
    if (fallbackImg) {
      if (y + fallbackImg.height > pageHeight - 34) {
        doc.addPage();
        y = 16;
      }
      doc.addImage(fallbackImg.data, 'PNG', margin + 2, y, fallbackImg.width, fallbackImg.height);
      y += fallbackImg.height + 4;
    }
  }

  // 5. PROFESSIONAL FOOTER (Anchored at page bottom)
  const drawFooter = () => {
    const footerY = pageHeight - 24;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY, margin + contentWidth, footerY);

    const discImg = renderTextToImage(t.disclaimer, 7.5, true, contentWidth, '#dc2626');
    if (discImg) {
      doc.addImage(discImg.data, 'PNG', margin, footerY + 2, discImg.width, discImg.height);
    }

    const warnImg = renderTextToImage(t.warning, 7, false, contentWidth, '#64748b');
    if (warnImg) {
      doc.addImage(warnImg.data, 'PNG', margin, footerY + 9, warnImg.width, warnImg.height);
    }
  };

  drawFooter();

  // Save the PDF
  const safeCondition = (analysis.condition || "Skin_Report").replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `DermAI_Report_${safeCondition}_${Date.now()}.pdf`;
  doc.save(filename);
}
