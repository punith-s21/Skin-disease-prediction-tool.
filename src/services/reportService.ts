import { jsPDF } from 'jspdf';
import { Analysis } from '../types';

export async function generatePDFReport(
  analysis: Analysis,
  image: string,
  patientName: string = "Anonymous Patient",
  timestamp: string = new Date().toLocaleString(),
  language: string = "English"
) {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 30;

  // Normalize language identifier (supports 'en-IN', 'hi-IN', 'English', etc.)
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

  // Translation Map
  const translations: Record<string, any> = {
    "English": {
      title: "DermAl Clinical Analysis Report",
      generated: "Generated on",
      patient: "Patient Reference",
      finding: "Clinical Finding",
      confidence: "Confidence Score",
      severity: "Severity Level",
      advice: "Medical Advice & Next Steps",
      features: "Observed Clinical Features",
      disclaimer: "ETHICAL DISCLAIMER (MANDATORY): This system is for educational and research purposes only. It is not a medical diagnostic tool. Please consult a qualified healthcare professional.",
      warning: "Clinical Warning: This is an AI-assisted analysis and should be verified by a board-certified dermatologist."
    },
    "Hindi": {
      title: "DermAl नैदानिक विश्लेषण रिपोर्ट",
      generated: "दिनांक",
      patient: "रोगी संदर्भ",
      finding: "नैदानिक निष्कर्ष",
      confidence: "आत्मविश्वास स्कोर",
      severity: "गंभीरता का स्तर",
      advice: "चिकित्सा सलाह और अगले चरण",
      features: "मुख्य नैदानिक विशेषताएं",
      disclaimer: "नैतिक अस्वीकरण (अनिवार्य): यह प्रणाली केवल शैक्षिक और अनुसंधान उद्देश्यों के लिए है। यह एक चिकित्सा नैदानिक उपकरण नहीं है। कृपया एक योग्य स्वास्थ्य देखभाल पेशेवर से परामर्श लें।",
      warning: "नैदानिक चेतावनी: यह एक एआई-सहायता प्राप्त विश्लेषण है और इसे बोर्ड-प्रमाणित त्वचा विशेषज्ञ द्वारा सत्यापित किया जाना चाहिए।"
    },
    "Telugu": {
      title: "DermAl క్లినికల్ అనాలిసిస్ రిపోర్ట్",
      generated: "తేదీ",
      patient: "పేషెంట్ రిఫరెన్స్",
      finding: "క్లినికల్ ఫైండింగ్",
      confidence: "కాన్ఫిడెన్స్ స్కోర్",
      severity: "తీవ్రత స్థాయి",
      advice: "వైద్య సలహా & తదుపరి చర్యలు",
      features: "గమనించిన క్లినికల్ లక్షణాలు",
      disclaimer: "నైతిక నిరాకరణ (తప్పనిసరి): ఈ వ్యవస్థ విద్యా మరియు పరిశోధన ప్రయోజనాల కోసం మాత్రమే. ఇది వైద్య రోగనిర్ధారణ సాధనం కాదు. దయచేసి అర్హత కలిగిన ఆరోగ్య సంరక్షణ నిపుణులను సంప్రదించండి.",
      warning: "క్లినికల్ హెచ్చరిక: ఇది AI-నేతృత్వంలోని విశ్లేషణ మరియు బోర్డ్-సర్టిఫైడ్ చర్మవ్యాధి నిపుణుడిచే ధృవీకరించబడాలి."
    },
    "Kannada": {
      title: "DermAl ವೈದ್ಯಕೀಯ ವಿಶ್ಲೇಷಣೆ ವರದಿ",
      generated: "ದಿನಾಂಕ",
      patient: "ರೋಗಿಯ ಉಲ್ಲೇಖ",
      finding: "ವೈದ್ಯಕೀಯ ಶೋಧನೆ",
      confidence: "ಆತ್ಮವಿಶ್ವಾಸದ ಅಂಕ",
      severity: "ತೀವ್ರತೆಯ ಮಟ್ಟ",
      advice: "ವೈದ್ಯಕೀಯ ಸಲಹೆ ಮತ್ತು ಮುಂದಿನ ಕ್ರಮಗಳು",
      features: "ಗಮನಿಸಿದ ವೈದ್ಯಕೀಯ ಲಕ್ಷಣಗಳು",
      disclaimer: "ನೈತಿಕ ಹಕ್ಕು ನಿರಾಕರಣೆ (ಕಡ್ಡಾಯ): ಈ ವ್ಯವಸ್ಥೆಯು ಶೈಕ್ಷಣಿಕ ಮತ್ತು ಸಂಶೋಧನಾ ಉದ್ದೇಶಗಳಿಗಾಗಿ ಮಾತ್ರ. ಇದು ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಧರಣಾ ಸಾಧನವಲ್ಲ. ದಯವಿಟ್ಟು ಅರ್ಹ ಆರೋಗ್ಯ ವೃತ್ತಿಪರರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
      warning: "ವೈದ್ಯಕೀಯ ಎಚ್ಚರಿಕೆ: ಇದು AI-ಚಾಲಿತ ವಿಶ್ಲೇಷಣೆಯಾಗಿದ್ದು, ಇದನ್ನು ಮಂಡಳಿ-ಪ್ರಮಾಣೀಕೃತ ಚರ್ಮರೋಗ ತಜ್ಞರು ಪರಿಶೀಲಿಸಬೇಕು."
    },
    "Tamil": {
      title: "DermAl மருத்துவ பகுப்பாய்வு அறிக்கை",
      generated: "தேதி",
      patient: "நோயாளி குறிப்பு",
      finding: "மருத்துவ கண்டுபிடிப்பு",
      confidence: "நம்பகத்தன்மை மதிப்பீடு",
      severity: "தீவிர நிலை",
      advice: "மருத்துவ ஆலோசனை மற்றும் அடுத்த கட்டங்கள்",
      features: "கண்டறியப்பட்ட மருத்துவ அம்சங்கள்",
      disclaimer: "முக்கிய மறுப்பு: இந்த அமைப்பு கல்வி மற்றும் ஆராய்ச்சி நோக்கங்களுக்காக மட்டுமே. இது ஒரு முழுமையான மருத்துவக் கருவி அல்ல.",
      warning: "மருத்துவ எச்சரிக்கை: இது ஒரு AI-உதவி பகுப்பாய்வு மற்றும் தகுதிவாய்ந்த மருத்துவரிடம் உறுதிப்படுத்தப்பட வேண்டும்."
    },
    "Marathi": {
      title: "DermAl क्लिनिकल विश्लेषण अहवाल",
      generated: "तारीख",
      patient: "रुग्ण संदर्भ",
      finding: "क्लिनिकल निष्कर्ष",
      confidence: "आत्मविश्वास स्कोअर",
      severity: "तीव्रता पातळी",
      advice: "वैद्यकीय सल्ला आणि पुढील पावले",
      features: "निरीक्षण केलेली वैशिष्ट्ये",
      disclaimer: "नैतिक अस्वीकरण: ही प्रणाली केवळ शैक्षणिक आणि संशोधन हेतूंसाठी आहे. कृपया तज्ञ डॉक्टरांचा सल्ला घ्या.",
      warning: "वैद्यकीय चेतावणी: हे AI-सहाय्यित विश्लेषण आहे आणि त्वचारोगतज्ज्ञांकडून सत्यापित केले जावे."
    },
    "Bengali": {
      title: "DermAl ক্লিনিকাল বিশ্লেষণ রিপোর্ট",
      generated: "তারিখ",
      patient: "রোগীর তথ্য",
      finding: "ক্লিনিকাল ফলাফল",
      confidence: "কনফিডেন্স স্কোর",
      severity: "তীব্রতার মাত্রা",
      advice: "চিকিৎসা পরামর্শ ও পরবর্তী পদক্ষেপ",
      features: "পর্যবেক্ষিত লক্ষণসমূহ",
      disclaimer: "নৈতিক দাবিত্যাগ: এই সিস্টেমটি কেবল শিক্ষামূলক এবং গবেষণামূলক উদ্দেশ্যে তৈরি। ডাক্তারের পরামর্শ নিন।",
      warning: "ক্লিনিক্যাল সতর্কতা: এটি একটি এআই-সহায়তা প্রাপ্ত বিশ্লেষণ।"
    }
  };

  const t = translations[resolvedLang] || translations["English"];
  const isIndic = ["Hindi", "Telugu", "Kannada", "Tamil", "Marathi", "Bengali"].includes(resolvedLang);

  // Helper for rendering Indic text as image (jsPDF fallback for non-Latin)
  const renderIndicText = (text: string, fontSize: number, isBold: boolean = false, maxWidth: number = 500) => {
    // Clean markdown for basic canvas rendering
    const cleanText = text.replace(/[*#`_]/g, '');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // High resolution factor
    const scale = 3;
    const fontStack = `${isBold ? 'bold' : 'normal'} ${fontSize * scale}px "Noto Sans Kannada", "Noto Sans Telugu", "Noto Sans Devanagari", "Segoe UI", Tahoma, sans-serif`;
    ctx.font = fontStack;
    
    // Split into intentional paragraphs first
    const paragraphs = cleanText.split('\n');
    const allLines: string[] = [];
    
    paragraphs.forEach(paragraph => {
      const words = paragraph.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth * scale && currentLine) {
          allLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      allLines.push(currentLine);
    });
    
    const lineHeight = fontSize * scale * 1.5;
    canvas.width = maxWidth * scale;
    canvas.height = allLines.length * lineHeight + (20 * scale); // Add padding
    
    // Re-apply styles after resizing
    ctx.font = fontStack;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    
    allLines.forEach((line, i) => {
      ctx.fillText(line.trim(), 10, i * lineHeight + (10 * scale));
    });
    
    return {
      data: canvas.toDataURL('image/png'),
      width: maxWidth,
      height: (canvas.height / canvas.width) * maxWidth
    };
  };

  // Header
  doc.setFontSize(22);
  doc.setTextColor(19, 78, 74); // teal-900
  if (isIndic) {
    const titleImg = renderIndicText(t.title, 22, true, 160);
    if (titleImg) doc.addImage(titleImg.data, 'PNG', margin, y - 12, titleImg.width, titleImg.height);
    y += 5;
  } else {
    doc.text(t.title, margin, y);
  }
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100);
  if (isIndic) {
    const genImg = renderIndicText(`${t.generated}: ${timestamp}`, 10, false, 85);
    if (genImg) doc.addImage(genImg.data, 'PNG', margin, y - 5, genImg.width, genImg.height);
    
    const patImg = renderIndicText(`${t.patient}: ${patientName}`, 10, false, 85);
    if (patImg) doc.addImage(patImg.data, 'PNG', margin + 95, y - 5, patImg.width, patImg.height);
    y += 5;
  } else {
    doc.text(`${t.generated}: ${timestamp}`, margin, y);
    doc.text(`${t.patient}: ${patientName}`, margin + 100, y);
  }

  y += 15;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);

  // Condition & Confidence
  y += 20;
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  
  // Since Gemini now provides condition in localized language with English in brackets, 
  // we can use it directly.
  const displayCondition = analysis.condition;

  if (isIndic) {
    const findLabelImg = renderIndicText(`${t.finding}:`, 14, true, 50);
    if (findLabelImg) doc.addImage(findLabelImg.data, 'PNG', margin, y - 8, findLabelImg.width, findLabelImg.height);
    
    const findValImg = renderIndicText(displayCondition, 14, false, 120);
    if (findValImg) doc.addImage(findValImg.data, 'PNG', margin + 45, y - 8, findValImg.width, findValImg.height);
  } else {
    doc.text(`${t.finding}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(displayCondition, margin + 45, y);
  }

  y += 12;
  doc.setFont("helvetica", "bold");
  const prob = (analysis.probability * 100).toFixed(1);
  if (isIndic) {
    const confLabelImg = renderIndicText(`${t.confidence}:`, 14, true, 50);
    if (confLabelImg) doc.addImage(confLabelImg.data, 'PNG', margin, y - 8, confLabelImg.width, confLabelImg.height);
    const confValImg = renderIndicText(`${prob}%`, 14, false, 40);
    if (confValImg) doc.addImage(confValImg.data, 'PNG', margin + 50, y - 8, confValImg.width, confValImg.height);
  } else {
    doc.text(`${t.confidence}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${prob}%`, margin + 50, y);
  }

  y += 12;
  doc.setFont("helvetica", "bold");
  if (isIndic) {
    const sevLabelImg = renderIndicText(`${t.severity}:`, 14, true, 50);
    if (sevLabelImg) doc.addImage(sevLabelImg.data, 'PNG', margin, y - 8, sevLabelImg.width, sevLabelImg.height);
    const sevValImg = renderIndicText(analysis.severity, 14, false, 50);
    if (sevValImg) doc.addImage(sevValImg.data, 'PNG', margin + 45, y - 8, sevValImg.width, sevValImg.height);
  } else {
    doc.text(`${t.severity}:`, margin, y);
    doc.text(analysis.severity, margin + 45, y);
  }

  // Clinical Features Section
  if (analysis.features && analysis.features.length > 0) {
    y += 18;
    doc.setFont("helvetica", "bold");
    if (isIndic) {
      const featLabelImg = renderIndicText(`${t.features}:`, 14, true, 120);
      if (featLabelImg) doc.addImage(featLabelImg.data, 'PNG', margin, y - 8, featLabelImg.width, featLabelImg.height);
    } else {
      doc.text(`${t.features}:`, margin, y);
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const featuresToDisplay = analysis.features.slice(0, 5);
    featuresToDisplay.forEach((feature) => {
      y += 8;
      if (isIndic) {
        const featItemImg = renderIndicText(`• ${feature}`, 10, false, 160);
        if (featItemImg) doc.addImage(featItemImg.data, 'PNG', margin + 5, y - 5, featItemImg.width, featItemImg.height);
      } else {
        doc.text(`• ${feature}`, margin + 5, y);
      }
    });
  }

  // Image Section
  y += 15;
  try {
    // Prominent image size (adjusting Y to avoid overlap)
    doc.addImage(image, 'JPEG', margin, y, 85, 85);
    y += 95;
  } catch (e) {
    console.error("Error adding image to PDF", e);
    y += 10;
    doc.text("[Image processing failed]", margin, y);
    y += 10;
  }

  // Advice Section
  y += 10;
  doc.setFont("helvetica", "bold");
  if (isIndic) {
    const advLabelImg = renderIndicText(`${t.advice}:`, 14, true, 120);
    if (advLabelImg) doc.addImage(advLabelImg.data, 'PNG', margin, y - 8, advLabelImg.width, advLabelImg.height);
  } else {
    doc.text(`${t.advice}:`, margin, y);
  }
  
  y += 12;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  if (isIndic) {
    const advValImg = renderIndicText(analysis.recommendation, 11, false, pageWidth - (margin * 2));
    if (advValImg) {
      doc.addImage(advValImg.data, 'PNG', margin, y - 5, advValImg.width, advValImg.height);
      y += advValImg.height;
    }
  } else {
    const lines = doc.splitTextToSize(analysis.recommendation, pageWidth - (margin * 2));
    doc.text(lines, margin, y);
    y += lines.length * 6;
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(220, 38, 38); // Red color for urgency
  doc.setFont("helvetica", "bold");
  const footerY = doc.internal.pageSize.getHeight() - 40;
  
  if (isIndic) {
    const discImg = renderIndicText(t.disclaimer, 9, true, pageWidth - (margin * 2));
    if (discImg) doc.addImage(discImg.data, 'PNG', margin, footerY, discImg.width, discImg.height);
  } else {
    const wrappedEthical = doc.splitTextToSize(t.disclaimer, pageWidth - (margin * 2));
    doc.text(wrappedEthical, margin, footerY);
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150);
  if (isIndic) {
    const warnImg = renderIndicText(t.warning, 8, false, pageWidth - (margin * 2));
    if (warnImg) doc.addImage(warnImg.data, 'PNG', margin, footerY + 20, warnImg.width, warnImg.height);
  } else {
    doc.text(t.warning, margin, footerY + 18);
  }

  // Save the PDF
  const filename = `Dermal_Report_${analysis.condition.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
  doc.save(filename);
}
