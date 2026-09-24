import http from 'http';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000${path}`);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            const parsed = raw ? JSON.parse(raw) : {};
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const timestamp = Date.now();
const userA = {
  fullName: 'Researcher Alice',
  email: `alice_${timestamp}@testnexus.org`,
  password: 'Password123!',
  confirmPassword: 'Password123!',
};

const userB = {
  fullName: 'Researcher Bob',
  email: `bob_${timestamp}@testnexus.org`,
  password: 'Password456!',
  confirmPassword: 'Password456!',
};

let tokenA = null;
let tokenB = null;
let passedSteps = 0;
let totalSteps = 21;

function assert(condition, message, stepNum) {
  if (condition) {
    console.log(`[PASS] Step ${stepNum}: ${message}`);
    passedSteps++;
  } else {
    console.error(`[FAIL] Step ${stepNum}: ${message}`);
    process.exitCode = 1;
  }
}

async function run21Steps() {
  console.log('======================================================');
  console.log(' NEXUS 21-STEP END-TO-END VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  // Step 1: Register User A
  const res1 = await makeRequest('POST', '/api/auth/register', userA);
  assert(
    res1.status === 201 && res1.data.success === true && res1.data.user && !res1.data.otp,
    'Register User A (Status 201, User created, Zero OTP)',
    1
  );

  // Step 2: Login User A
  const res2 = await makeRequest('POST', '/api/auth/login', {
    email: userA.email,
    password: userA.password,
  });
  tokenA = res2.data.token;
  assert(
    res2.status === 200 && res2.data.success === true && tokenA && res2.data.user.email === userA.email,
    'Login User A (Status 200, JWT returned, User verified)',
    2
  );

  // Step 3: Fetch dashboard User A (Initially 0)
  const res3Papers = await makeRequest('GET', '/api/papers', null, tokenA);
  const res3Findings = await makeRequest('GET', '/api/research/findings', null, tokenA);
  const res3Gaps = await makeRequest('GET', '/api/research/gaps', null, tokenA);
  const res3Directions = await makeRequest('GET', '/api/research/directions', null, tokenA);
  const userAEmpty =
    (res3Papers.data.papers?.length || 0) === 0 &&
    (res3Findings.data.findings?.length || 0) === 0 &&
    (res3Gaps.data.gaps?.length || 0) === 0 &&
    (res3Directions.data.directions?.length || 0) === 0;
  assert(userAEmpty, 'Fetch dashboard User A (Zero papers, zero findings, zero gaps, zero directions)', 3);

  // Step 4: Upload Paper 1 for User A
  const res4 = await makeRequest(
    'POST',
    '/api/papers/upload',
    {
      title: 'Attention Is All You Need',
      filename: 'attention_paper.pdf',
      authors: 'Vaswani et al.',
      publicationYear: 2017,
      pages: 15,
      methodology: 'Transformer architecture with multi-head self-attention',
      dataset: 'WMT 2014 English-to-German',
      mainResult: 'State-of-the-art BLEU score of 28.4 on translation benchmark',
      limitation: 'Quadratic computational complexity with sequence length',
    },
    tokenA
  );
  assert(res4.status === 201 && res4.data.success && res4.data.paper.code === 'P1', 'Upload Paper 1 for User A (Status 201, assigned P1)', 4);

  // Step 5: Upload Paper 2 for User A
  const res5 = await makeRequest(
    'POST',
    '/api/papers/upload',
    {
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      filename: 'bert_paper.pdf',
      authors: 'Devlin et al.',
      publicationYear: 2018,
      pages: 16,
      methodology: 'Bidirectional Transformer encoder pre-training',
      dataset: 'GLUE Benchmark',
      mainResult: 'New state-of-the-art across 11 NLP benchmarks',
      limitation: 'High computational requirements during pre-training phase',
    },
    tokenA
  );
  assert(res5.status === 201 && res5.data.success && res5.data.paper.code === 'P2', 'Upload Paper 2 for User A (Status 201, assigned P2)', 5);

  // Step 6: Fetch Papers for User A (Count = 2)
  const res6 = await makeRequest('GET', '/api/papers', null, tokenA);
  assert(
    res6.status === 200 && res6.data.papers?.length === 2 && res6.data.count === 2,
    `Fetch Papers User A (Count = 2, retrieved [${res6.data.papers.map((p) => p.code).join(', ')}])`,
    6
  );

  // Step 7: Ask Question User A (Grounded query)
  const res7 = await makeRequest(
    'POST',
    '/api/analyzer/ask',
    {
      query: 'What are the main architectures proposed in the studies?',
    },
    tokenA
  );
  assert(
    res7.status === 200 && res7.data.citations?.length > 0 && res7.data.firewall?.verifiedGrounding === true,
    'Ask Question User A (Status 200, Grounded citations & Hallucination Firewall verified)',
    7
  );

  // Step 8: Logout User A
  const res8 = await makeRequest('POST', '/api/auth/logout', {}, tokenA);
  assert(res8.status === 200 && res8.data.success === true, 'Logout User A (Status 200, Session terminated)', 8);

  // Step 9: Register User B
  const res9 = await makeRequest('POST', '/api/auth/register', userB);
  assert(
    res9.status === 201 && res9.data.success === true && res9.data.user && !res9.data.otp,
    'Register User B (Status 201, User created, Zero OTP)',
    9
  );

  // Step 10: Login User B
  const res10 = await makeRequest('POST', '/api/auth/login', {
    email: userB.email,
    password: userB.password,
  });
  tokenB = res10.data.token;
  assert(
    res10.status === 200 && res10.data.success === true && tokenB && res10.data.user.email === userB.email,
    'Login User B (Status 200, JWT returned, User verified)',
    10
  );

  // Step 11: Fetch dashboard User B (MUST be completely clean with 0 records!)
  const res11Papers = await makeRequest('GET', '/api/papers', null, tokenB);
  const res11Findings = await makeRequest('GET', '/api/research/findings', null, tokenB);
  const res11Gaps = await makeRequest('GET', '/api/research/gaps', null, tokenB);
  const res11Directions = await makeRequest('GET', '/api/research/directions', null, tokenB);
  const userBEmpty =
    (res11Papers.data.papers?.length || 0) === 0 &&
    (res11Findings.data.findings?.length || 0) === 0 &&
    (res11Gaps.data.gaps?.length || 0) === 0 &&
    (res11Directions.data.directions?.length || 0) === 0;
  assert(
    userBEmpty,
    'Fetch dashboard User B (Zero records - User B does NOT see User A papers or findings)',
    11
  );

  // Step 12: Upload Paper 1 for User B
  const res12 = await makeRequest(
    'POST',
    '/api/papers/upload',
    {
      title: 'ResNet: Deep Residual Learning for Image Recognition',
      filename: 'resnet_paper.pdf',
      authors: 'He et al.',
      publicationYear: 2016,
      pages: 12,
      methodology: 'Residual skip connections for ultra-deep networks',
      dataset: 'ImageNet classification',
      mainResult: '3.57% top-5 error on ImageNet test set',
      limitation: 'High parameter count on 152-layer variants',
    },
    tokenB
  );
  assert(res12.status === 201 && res12.data.success && res12.data.paper.code === 'P1', 'Upload Paper 1 for User B (Status 201, assigned P1)', 12);

  // Step 13: Fetch Papers for User B (Count = 1, NOT 3!)
  const res13 = await makeRequest('GET', '/api/papers', null, tokenB);
  assert(
    res13.status === 200 && res13.data.papers?.length === 1 && res13.data.count === 1 && res13.data.papers[0].title.includes('ResNet'),
    'Fetch Papers User B (Count = 1, User B sees ONLY ResNet, strictly isolated from User A)',
    13
  );

  // Step 14: Logout User B
  const res14 = await makeRequest('POST', '/api/auth/logout', {}, tokenB);
  assert(res14.status === 200 && res14.data.success === true, 'Logout User B (Status 200, Session terminated)', 14);

  // Step 15: Login User A again
  const res15 = await makeRequest('POST', '/api/auth/login', {
    email: userA.email,
    password: userA.password,
  });
  tokenA = res15.data.token;
  assert(res15.status === 200 && res15.data.success === true && tokenA, 'Login User A again (Status 200, Re-authenticated)', 15);

  // Step 16: Fetch Papers for User A (Still Count = 2, does NOT see ResNet from User B)
  const res16 = await makeRequest('GET', '/api/papers', null, tokenA);
  const titlesA = res16.data.papers?.map((p) => p.title) || [];
  const onlyA = titlesA.includes('Attention Is All You Need') && !titlesA.some((t) => t.includes('ResNet'));
  assert(
    res16.status === 200 && res16.data.papers?.length === 2 && onlyA,
    'Fetch Papers User A (Count = 2, User A still sees their 2 papers and NOT User B data)',
    16
  );

  // Step 17: Negative Test - Login with wrong password
  const res17 = await makeRequest('POST', '/api/auth/login', {
    email: userA.email,
    password: 'WrongPassword999!',
  });
  assert(
    (res17.status === 401 || res17.status === 400) && res17.data.success === false,
    `Negative Test: Login with wrong password (Rejected with status ${res17.status}, success: false)`,
    17
  );

  // Step 18: Negative Test - Register with existing email
  const res18 = await makeRequest('POST', '/api/auth/register', userA);
  assert(
    (res18.status === 409 || res18.status === 422 || res18.status === 400) && res18.data.success === false,
    `Negative Test: Register with duplicate email (Rejected with status ${res18.status}, success: false)`,
    18
  );

  // Step 19: Negative Test - Register with password mismatch
  const res19 = await makeRequest('POST', '/api/auth/register', {
    fullName: 'Test Mismatch',
    email: `mismatch_${Date.now()}@testnexus.org`,
    password: 'Password123!',
    confirmPassword: 'MismatchPassword999!',
  });
  assert(
    res19.status === 400 && res19.data.success === false,
    `Negative Test: Register with password mismatch (Rejected with status 400, message: "${res19.data.message}")`,
    19
  );

  // Step 20: Negative Test - Access protected route without token
  const res20 = await makeRequest('GET', '/api/papers');
  assert(
    res20.status === 401 && res20.data.success === false,
    `Negative Test: Access /api/papers without token (Rejected with status 401 Unauthorized)`,
    20
  );

  // Step 21: Health Check GET /api/health
  const res21 = await makeRequest('GET', '/api/health');
  assert(
    res21.status === 200 && (res21.data.status === 'ok' || res21.data.status === 'healthy'),
    `Health Check GET /api/health (Status 200, status: "${res21.data.status}", uptime: ${Math.round(res21.data.uptime)}s)`,
    21
  );

  console.log('\n======================================================');
  console.log(` RESULT: ${passedSteps}/${totalSteps} STEPS PASSED SUCCESSFULLY`);
  console.log('======================================================');

  if (passedSteps === totalSteps) {
    console.log('>>> ALL 21 END-TO-END SPECIFICATION CHECKS VERIFIED 100% <<<');
  } else {
    process.exit(1);
  }
}

run21Steps().catch((err) => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
