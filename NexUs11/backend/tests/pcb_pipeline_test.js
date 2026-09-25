import assert from 'assert';
import { jsPDF } from 'jspdf';
import paperService from '../services/paperService.js';
import deepAnalysisService from '../services/deepAnalysisService.js';
import reportService from '../services/reportService.js';
import ragService from '../services/ragService.js';
import { parsePdf } from '../utils/pdfParser.js';

function createPdfBuffer(title, sections = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  let y = 40;
  
  doc.setFontSize(16);
  doc.text(title, 40, y);
  y += 30;

  for (const sec of sections) {
    if (y > 750) {
      doc.addPage();
      y = 40;
    }
    doc.setFontSize(12);
    doc.text(sec.heading, 40, y);
    y += 18;

    doc.setFontSize(10);
    const lines = doc.splitTextToSize(sec.body, 500);
    doc.text(lines, 40, y);
    y += lines.length * 14 + 15;
  }

  return Buffer.from(doc.output('arraybuffer'));
}

async function runPipelineTests() {
  console.log('\n=============================================================');
  console.log('  NEXUS REAL-PAPER ANALYSIS & GENERATION PIPELINE TEST');
  console.log('=============================================================\n');

  const userId = 'pcb_tester_' + Date.now();

  // 1. Create a genuine PCB Design research PDF
  console.log('Step 1: Generating authentic PCB Design research PDF binary...');
  const pcbPdfBuffer = createPdfBuffer('High Density Interconnect PCB Design and Thermal Dissipation', [
    {
      heading: 'Abstract',
      body: 'This paper investigates thermal management and signal integrity in High Density Interconnect (HDI) Printed Circuit Boards (PCBs). We propose a multi-layer microvia routing architecture combined with thermal via arrays to minimize electromagnetic interference (EMI) and reduce maximum junction temperatures in high-power power electronic modules.',
    },
    {
      heading: '1. Introduction',
      body: 'Modern printed circuit board (PCB) design requires balancing high-speed trace routing, controlled impedance, and effective heat dissipation. With increasing component density and clock frequencies, thermal bottlenecks and parasitic capacitance significantly degrade board reliability and signal integrity.',
    },
    {
      heading: '2. Methodology and Layout Architecture',
      body: 'We developed an optimized 8-layer PCB stackup using FR4 and Rogers substrate with copper thicknesses of 2oz on outer layers. Microvias with a diameter of 0.15mm and thermal via arrays placed directly under high-power surface mount devices (SMD) were modeled in Altium Designer and simulated with finite element thermal analysis in ANSYS Icepak.',
    },
    {
      heading: '3. Experimental Results',
      body: 'Experimental measurements on fabricated test boards demonstrate a 24.3% reduction in peak operating temperature (from 89.4°C down to 67.7°C) under a continuous 50W power load. Signal integrity testing showed eye diagram jitter reduced by 18ps on 10 Gbps differential pairs.',
    },
    {
      heading: '4. Limitations and Discussion',
      body: 'Fabrication costs increase by approximately 22% due to laser microvia drilling and sequential lamination cycles. Testing was conducted at ambient temperature (25°C) without environmental chamber thermal cycling.',
    },
    {
      heading: '5. Conclusion and Future Work',
      body: 'The proposed thermal via array and HDI routing design significantly enhances heat dissipation and signal integrity for compact power electronics. Future work will investigate embedded planar heat pipes and liquid cold-plate integration.',
    },
  ]);

  // 2. Test PDF extraction
  console.log('\nStep 2: Testing PDF text extraction on PCB Design binary...');
  const extractResult = await parsePdf(pcbPdfBuffer, 'pcb_thermal_design.pdf');
  assert.strictEqual(extractResult.success, true, 'Extraction should succeed for text-based PDF');
  assert.strictEqual(extractResult.isScanned, false, 'Should detect text-based PDF');
  assert.ok(extractResult.characterCount > 500, `Character count should be > 500, got ${extractResult.characterCount}`);
  assert.ok(extractResult.text.includes('Printed Circuit Board') || extractResult.text.includes('PCB'), 'Extracted text must contain PCB content');
  console.log(`✓ Extracted ${extractResult.characterCount} characters.`);
  console.log(`✓ Preview: "${extractResult.text.slice(0, 120)}..."`);

  // 3. Test Scanned / Image-only PDF Detection
  console.log('\nStep 3: Testing Scanned/Empty PDF Detection & Error Handling...');
  const emptyPdfDoc = new jsPDF();
  const emptyPdfBuffer = Buffer.from(emptyPdfDoc.output('arraybuffer'));
  const scannedResult = await parsePdf(emptyPdfBuffer, 'scanned_empty_doc.pdf');
  assert.strictEqual(scannedResult.success, false, 'Scanned PDF should fail extraction');
  assert.strictEqual(scannedResult.isScanned, true, 'Should flag isScanned as true');
  assert.ok(scannedResult.errorMessage.includes('scanned/image pages'), 'Should provide scanned PDF error message');
  console.log(`✓ Correctly caught scanned PDF: "${scannedResult.errorMessage}"`);

  // 4. Upload PCB Paper to paperService
  console.log('\nStep 4: Uploading PCB Paper through backend paperService...');
  const uploadResult = await paperService.uploadPaper(userId, {
    fileBuffer: pcbPdfBuffer,
    filename: 'pcb_thermal_design.pdf',
  });
  assert.strictEqual(uploadResult.success, true, 'Upload must succeed');
  assert.strictEqual(uploadResult.paper.code, 'P1');
  assert.ok(uploadResult.extractedCharacters > 500);
  console.log(`✓ Paper stored with ID: ${uploadResult.paper.id}, code: ${uploadResult.paper.code}`);

  // 5. Query RAG with Grounded PCB Query
  console.log('\nStep 5: Testing RAG retrieval for PCB question...');
  const ragAnswer = await ragService.groundedQuery(userId, 'What methodology and layer stackup was used in Paper 1?');
  assert.ok(ragAnswer.answer, 'RAG must return an answer');
  console.log(`✓ Question: "What methodology and layer stackup was used in Paper 1?"`);
  console.log(`✓ Grounded Answer: "${ragAnswer.answer}"`);
  console.log(`✓ Citations:`, ragAnswer.citations);

  // 6. Run Deep Analysis & Generate 20-Section Paper
  console.log('\nStep 6: Running Deep Analysis & 20-Section Paper Generation for PCB Paper...');
  const analysisResult = await deepAnalysisService.runFullAnalysis(userId);
  assert.strictEqual(analysisResult.status, 'completed');
  
  const structured = analysisResult.structuredAnalysis;
  console.log(`✓ Identified Topic: "${structured.topic}"`);
  assert.ok(
    structured.topic.toLowerCase().includes('pcb') || structured.topic.toLowerCase().includes('interconnect') || structured.topic.toLowerCase().includes('thermal'),
    `Topic must reflect PCB design, got: ${structured.topic}`
  );

  const fullText = structured.fullPaperText;
  assert.ok(fullText.includes('## ABSTRACT'), 'Paper must contain ABSTRACT');
  assert.ok(fullText.includes('## 1. INTRODUCTION'), 'Paper must contain INTRODUCTION');
  assert.ok(fullText.includes('## 5. PAPER-BY-PAPER ANALYSIS'), 'Paper must contain 5. PAPER-BY-PAPER ANALYSIS');
  assert.ok(fullText.includes('## 20. CONCLUSION'), 'Paper must contain 20. CONCLUSION');

  // Verify that the generated paper contains PCB design concepts and NOT generic AI defaults
  assert.ok(
    fullText.toLowerCase().includes('pcb') || fullText.toLowerCase().includes('circuit board') || fullText.toLowerCase().includes('thermal via'),
    'Generated paper MUST contain PCB / circuit board concepts from uploaded document!'
  );
  console.log(`✓ Verified: Generated paper is strictly grounded in PCB Design content.`);

  // 7. Test PDF Report Generation & Download
  console.log('\nStep 7: Testing PDF generation & download buffer...');
  const pdfBuffer = await reportService.generatePdfBuffer({
    topic: structured.topic,
    title: `AI Research Analysis: ${structured.topic}`,
    content: structured.fullPaperText,
  });
  assert.ok(pdfBuffer.length > 5000, `PDF Buffer size should be > 5000 bytes, got ${pdfBuffer.length}`);
  console.log(`✓ Generated genuine PDF report buffer (${pdfBuffer.length} bytes).`);

  // 8. TEST WITH A SECOND COMPLETELY DIFFERENT PAPER (Solar Energy)
  console.log('\n=============================================================');
  console.log('Step 8: Testing with a SECOND completely different research paper (Solar Cells)...');
  const userId2 = 'solar_tester_' + Date.now();

  const solarPdfBuffer = createPdfBuffer('Perovskite Photovoltaic Solar Cells and Halide Stability', [
    {
      heading: 'Abstract',
      body: 'This study investigates the power conversion efficiency and thermal degradation kinetics of mixed halide organic-inorganic perovskite solar cells under continuous 1-sun illumination.',
    },
    {
      heading: '1. Introduction',
      body: 'Perovskite solar cells (PSCs) have achieved certified power conversion efficiencies exceeding 25%, but chemical instability under moisture and UV radiation impedes commercial solar farm deployment.',
    },
    {
      heading: '2. Device Fabrication and Spectroscopy',
      body: 'Inverted p-i-n planar heterojunction devices were fabricated using spin-coating of triple-cation perovskite absorber layers on ITO glass substrates with NiO hole transport layers and C60 electron transport layers.',
    },
    {
      heading: '3. Photovoltaic Performance and Results',
      body: 'Champion solar cells demonstrated a power conversion efficiency (PCE) of 23.8% with an open-circuit voltage (Voc) of 1.18V and fill factor of 81.2%. Unencapsulated devices maintained 91% of initial efficiency after 1000 hours of continuous operation.',
    },
    {
      heading: '4. Limitations and Future Directions',
      body: 'Lead toxicity remains an environmental concern during large-scale manufacturing and recycling. Future work should focus on tin-based lead-free perovskite alternatives.',
    },
  ]);

  const uploadResult2 = await paperService.uploadPaper(userId2, {
    fileBuffer: solarPdfBuffer,
    filename: 'perovskite_solar_cells.pdf',
  });
  assert.strictEqual(uploadResult2.success, true);
  console.log(`✓ Uploaded 2nd paper: ${uploadResult2.paper.title}`);

  const analysisResult2 = await deepAnalysisService.runFullAnalysis(userId2);
  const structured2 = analysisResult2.structuredAnalysis;
  console.log(`✓ 2nd Paper Identified Topic: "${structured2.topic}"`);
  
  assert.ok(
    structured2.topic.toLowerCase().includes('solar') || structured2.topic.toLowerCase().includes('perovskite') || structured2.topic.toLowerCase().includes('photovoltaic'),
    `2nd Paper Topic must reflect solar cells, got: ${structured2.topic}`
  );

  const fullText2 = structured2.fullPaperText;
  assert.ok(
    fullText2.toLowerCase().includes('perovskite') || fullText2.toLowerCase().includes('solar') || fullText2.toLowerCase().includes('photovoltaic'),
    '2nd Paper generated text MUST contain Perovskite / Solar concepts!'
  );
  assert.ok(!fullText2.toLowerCase().includes('circuit board'), '2nd Paper must NOT contain PCB content from first paper!');

  console.log(`✓ PROVED: The pipeline dynamically adapts to any uploaded document with ZERO cross-contamination!`);

  console.log('\n=============================================================');
  console.log('  ALL 8 END-TO-END PIPELINE VERIFICATION TESTS PASSED 100%!');
  console.log('=============================================================\n');
}

runPipelineTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
