import assert from 'assert';
import paperService from '../services/paperService.js';
import classifierService, { QUESTION_TYPES } from '../services/classifierService.js';
import ragService from '../services/ragService.js';
import deepAnalysisService from '../services/deepAnalysisService.js';
import reportService from '../services/reportService.js';
import { parseDocument, calculateFileHash } from '../utils/documentParser.js';
import { chunkPaperText } from '../utils/chunker.js';
import { generateDeterministicEmbedding, cosineSimilarity } from '../utils/embeddings.js';

async function runTests() {
  console.log('\n=============================================================');
  console.log('  NEXUS AI ENGINE & RESEARCH RAG AUTOMATED TEST SUITE');
  console.log('=============================================================\n');

  const testUserId = 'test_user_' + Date.now();

  // Test 1: File Hashing & Universal Parser
  console.log('[Test 1] Universal Document Parser & SHA-256 Duplicate Hashing...');
  const samplePdfText = 'Sample research paper on full stack microservices.\n\nAbstract\nThis paper evaluates React and Node.js microservices on MongoDB.\n\nMethodology\nEmpirical benchmarking on cluster.\n\nResults\nReduced latency by 35%.\n\nLimitations\nTested only on single-cloud deployment.';
  const hash1 = calculateFileHash(samplePdfText);
  const hash2 = calculateFileHash(samplePdfText);
  assert.strictEqual(hash1, hash2, 'File hash must be deterministic');
  
  const parsedDoc = await parseDocument(samplePdfText, 'paper_microservices.pdf');
  assert.strictEqual(parsedDoc.fileHash, hash1);
  assert.ok(parsedDoc.sections.length > 0, 'Sections should be extracted');
  console.log('✓ Document parser and duplicate hashing passed.');

  // Test 2: Ingest 5 Research Papers
  console.log('\n[Test 2] Ingesting 5 Structured Research Papers for Multi-Paper Synthesis...');
  const mockPapers = [
    {
      filename: 'paper1_fullstack_react.pdf',
      title: 'Scalable Microservices Architecture with React and Node.js',
      authors: 'A. Sharma, B. Patel',
      year: 2024,
      pages: 12,
      methodology: 'Decoupled Microservices Pipeline',
      dataset: 'E-Commerce Transaction Benchmark',
      evaluationMetric: 'Throughput (req/s), Latency (ms)',
      mainResult: 'Achieved 4,200 req/s throughput with p99 latency under 45ms.',
      limitation: 'Evaluated exclusively on AWS Cloud infrastructure.',
    },
    {
      filename: 'paper2_angular_java.pdf',
      title: 'Monolithic vs Microservice Trade-offs in Enterprise Java Systems',
      authors: 'K. Anderson, L. Chen',
      year: 2023,
      pages: 16,
      methodology: 'Monolithic Spring Boot Benchmark',
      dataset: 'Enterprise ERP Workload Dataset',
      evaluationMetric: 'CPU Utilization, Query Time',
      mainResult: 'Monolith achieved 18% lower CPU overhead on simple transactional queries.',
      limitation: 'Scalability degraded under high concurrent write operations.',
    },
    {
      filename: 'paper3_fastapi_python.pdf',
      title: 'High-Throughput Asynchronous Web Frameworks for ML Inference',
      authors: 'M. Gomez, J. Smith',
      year: 2024,
      pages: 10,
      methodology: 'Asynchronous AsyncIO Event Loop',
      dataset: 'Transformer Embedding Inference Corpus',
      evaluationMetric: 'Inference Latency (ms), Concurrency',
      mainResult: 'FastAPI with UVicorn handled 3.4x concurrent requests compared to Flask.',
      limitation: 'Memory footprint scaled linearly with active WebSocket connections.',
    },
    {
      filename: 'paper4_vector_db_eval.pdf',
      title: 'Empirical Evaluation of Vector Indexing in PostgreSQL with pgvector',
      authors: 'D. Miller, E. Brown',
      year: 2025,
      pages: 14,
      methodology: 'HNSW vs IVFFlat Indexing Comparison',
      dataset: '1 Million 768-dim Vector Benchmark',
      evaluationMetric: 'Recall@10, QPS, Build Time',
      mainResult: 'HNSW achieved 99.1% recall@10 at 450 QPS with 2x memory usage.',
      limitation: 'Index build time requires dedicated high-memory RAM.',
    },
    {
      filename: 'paper5_edge_react_native.pdf',
      title: 'Offline-First Mobile Research Data Collection with SQLite',
      authors: 'T. Wilson, R. Taylor',
      year: 2024,
      pages: 8,
      methodology: 'Optimistic Local Storage with CRDT Sync',
      dataset: 'Mobile Field Survey Dataset',
      evaluationMetric: 'Sync Conflict Rate, Battery Drain',
      mainResult: 'Zero data loss achieved with sub-second background delta synchronization.',
      limitation: 'Battery drain increased during continuous peer-to-peer sync.',
    },
  ];

  for (const paper of mockPapers) {
    const uploadRes = await paperService.uploadPaper(testUserId, paper);
    assert.strictEqual(uploadRes.success, true);
  }

  const { papers: storedPapers } = await paperService.getPapers(testUserId);
  assert.strictEqual(storedPapers.length, 5, 'All 5 papers should be stored for test user');
  console.log(`✓ Successfully indexed ${storedPapers.length} papers in isolated workspace.`);

  // Test 3: Duplicate Paper Rejection
  console.log('\n[Test 3] Testing Duplicate Paper Detection (Req 65, 66)...');
  const duplicateRes = await paperService.uploadPaper(testUserId, mockPapers[0]);
  assert.strictEqual(duplicateRes.duplicate, true, 'Duplicate paper must be recognized');
  console.log('✓ Duplicate paper correctly detected and not re-indexed.');

  // Test 4: Question Classification & Out-of-Scope Detection (Req 20, 22)
  console.log('\n[Test 4] Testing Question Classifier & Out-of-Scope Detection...');
  const outOfScopeQuery = 'Who is the current president of India?';
  const classifiedOOS = classifierService.classify(outOfScopeQuery);
  assert.strictEqual(classifiedOOS.isOutOfScope, true);
  assert.strictEqual(classifiedOOS.type, QUESTION_TYPES.OUT_OF_SCOPE);

  const oosAnswer = await ragService.groundedQuery(testUserId, outOfScopeQuery);
  assert.ok(
    oosAnswer.answer.includes('outside the scope of the uploaded research papers'),
    'Out-of-scope query must be politely rejected'
  );
  console.log('✓ Out-of-scope rejection test passed:', oosAnswer.answer);

  // Test 5: Direct Factual Query (Req 18, 19)
  console.log('\n[Test 5] Testing Direct Factual Query on Specific Paper...');
  const methodQuery = 'What methodology does Paper 1 use?';
  const methodAnswer = await ragService.groundedQuery(testUserId, methodQuery);
  assert.ok(
    methodAnswer.answer.toLowerCase().includes('microservices') ||
    methodAnswer.answer.toLowerCase().includes('decoupled'),
    'Answer must state Paper 1 methodology'
  );
  console.log('✓ Direct factual query returned grounded response:', methodAnswer.answer);

  // Test 6: Cross-Paper Comparison Query (Req 30)
  console.log('\n[Test 6] Testing Cross-Paper Comparison Query...');
  const compareQuery = 'Compare the methodologies of the uploaded papers.';
  const compareAnswer = await ragService.groundedQuery(testUserId, compareQuery);
  assert.ok(compareAnswer.answer.length > 30);
  console.log('✓ Cross-paper comparison generated successfully.');

  // Test 7: Missing Information Refusal (Req 15, 16)
  console.log('\n[Test 7] Testing Missing Information Refusal (Zero Hallucination Priority)...');
  const missingInfoQuery = 'What brand of GPU did Paper 3 use for training?';
  const missingInfoAnswer = await ragService.groundedQuery(testUserId, missingInfoQuery);
  assert.ok(
    missingInfoAnswer.answer.includes('not provide sufficient information') ||
    missingInfoAnswer.answer.includes('does not specify') ||
    missingInfoAnswer.answer.includes('not explicitly state') ||
    missingInfoAnswer.answer.includes('outside the scope'),
    'Must refuse to invent missing GPU facts'
  );
  console.log('✓ Zero-hallucination refusal verified for missing information.');

  // Test 8: Precomputed Deep Multi-Paper Analysis (Req 26-37, 61)
  console.log('\n[Test 8] Precomputing Deep Multi-Paper Structured Analysis...');
  const analysisResult = await deepAnalysisService.runFullAnalysis(testUserId, storedPapers);
  assert.strictEqual(analysisResult.status, 'completed');
  assert.strictEqual(analysisResult.papersCount, 5);

  const structured = analysisResult.structuredAnalysis;
  assert.ok(structured.papers.length === 5, '5 paper-by-paper analyses');
  assert.ok(structured.commonFindings.length > 0, 'Common findings identified');
  assert.ok(structured.researchGaps.length > 0, 'Research gaps identified');
  assert.ok(structured.researchQuestions.length > 0, 'Research questions formulated');
  assert.ok(structured.researchStrategy.objectives.length > 0, 'Research strategy formulated');
  assert.ok(structured.fullPaperText.length > 1000, '20-section paper text generated');
  console.log('✓ Deep structured multi-paper synthesis generated and cached.');

  // Test 9: Complete 20-Section Academic Paper Report & PDF Generation (Req 38, 41, 54, 55)
  console.log('\n[Test 9] Testing Report Generation & High-Fidelity PDF Generation...');
  const report = await reportService.getLatestReport(testUserId);
  assert.ok(report, 'Report should be retrievable');
  assert.ok(report.content.includes('## ABSTRACT'));
  assert.ok(report.content.includes('## 1. INTRODUCTION'));
  assert.ok(report.content.includes('## 5. PAPER-BY-PAPER ANALYSIS'));
  assert.ok(report.content.includes('## 14. RESEARCH GAPS'));
  assert.ok(report.content.includes('## 17. PROPOSED RESEARCH STRATEGY'));
  assert.ok(report.content.includes('## 20. CONCLUSION'));

  const pdfBuffer = await reportService.generatePdfBuffer(report);
  assert.ok(Buffer.isBuffer(pdfBuffer), 'Must return valid PDF buffer');
  assert.ok(pdfBuffer.length > 1000, 'PDF buffer should be multi-kilobyte binary');
  assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF', 'Must have valid PDF magic bytes');
  console.log(`✓ Authentic 20-Section PDF generated successfully (${pdfBuffer.length} bytes).`);

  // Cleanup test user data
  await paperService.resetPapers(testUserId);
  deepAnalysisService.clearCache(testUserId);

  console.log('\n=============================================================');
  console.log('  ALL NEXUS AI & RESEARCH INTELLIGENCE TESTS PASSED (100%)');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
