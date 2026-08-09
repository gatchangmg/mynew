const { chromium } = require('playwright');

(async ()=>{
  const url = 'file:///D:/COMPUTER%20SCIENCE/YEAR%204/Exit%20Exam%202019/exit-exam-blueprint.html';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  try{
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    // ensure helper UI functions available
    await page.waitForTimeout(400);
    await page.evaluate(()=>{ if(typeof populateCourseSelect==='function') populateCourseSelect(); if(typeof renderNotesCatalog==='function') renderNotesCatalog(); });

    // --- Test 1: Full exam produces 100 items (call generator directly) ---
    const buildPreview = await page.evaluate(()=>{
      try{
        const q = typeof buildFullExamQuestions === 'function' ? buildFullExamQuestions() : null;
        return {ok:true, qLen: q ? q.length : null, sample: q ? q.slice(0,3).map(x=>x.id) : null};
      }catch(e){ return {ok:false, error: e && e.message ? e.message : String(e)}; }
    });
    console.log('buildFullExamQuestions preview:', buildPreview);
    if(!buildPreview.ok || buildPreview.qLen !== 100) throw new Error('Full exam expected 100 questions, got '+String(buildPreview.qLen));

    // --- Test 2: Single-course quiz is randomized on each launch ---
    // Run two fresh page loads to avoid state carry
    // --- Test 2: Single-course quiz is randomized on each launch (call generator directly twice) ---
    await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);
      await page.selectOption('#course-select', { label: 'Software Engineering' });
      await page.evaluate(()=>{ if(typeof setQuizMode==='function') setQuizMode('single'); if(typeof startQuiz==='function') startQuiz(); });
      await page.waitForFunction(()=> typeof currentQuizQuestions !== 'undefined' && Array.isArray(currentQuizQuestions) && currentQuizQuestions.length>0, {timeout:5000});
      const first = await page.evaluate(()=> currentQuizQuestions.map(q=>q.id));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);
      await page.selectOption('#course-select', { label: 'Software Engineering' });
      await page.evaluate(()=>{ if(typeof setQuizMode==='function') setQuizMode('single'); if(typeof startQuiz==='function') startQuiz(); });
      await page.waitForFunction(()=> typeof currentQuizQuestions !== 'undefined' && Array.isArray(currentQuizQuestions) && currentQuizQuestions.length>0, {timeout:5000});
      const second = await page.evaluate(()=> currentQuizQuestions.map(q=>q.id));

    console.log('Single-course first ids:', first.slice(0,5));
    console.log('Single-course second ids:', second.slice(0,5));
    const identical = first.length===second.length && first.every((v,i)=>v===second[i]);
    if(identical){ throw new Error('Single-course quiz produced identical question order on two launches (unlikely)'); }

    // --- Test 3: Read buttons open the reader ---
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.evaluate(()=>{ if(typeof populateCourseSelect==='function') populateCourseSelect(); if(typeof renderNotesCatalog==='function') renderNotesCatalog(); });
    // click the first Read button we find
    const readBtn = await page.$('#notes-catalog-grid .catalog-card .catalog-card-footer button');
    if(!readBtn) throw new Error('No Read Note button found in catalog');
    await readBtn.click();
    // give the page a moment to create the doc entry and attempt load
    await page.waitForTimeout(800);
    const readerInfo = await page.evaluate(()=>{
      const rd = document.getElementById('reader-active');
      return {
        activeDocId: typeof activeDocId !== 'undefined' ? activeDocId : null,
        docsLen: typeof docs !== 'undefined' ? docs.length : null,
        readerText: rd ? rd.innerText.slice(0,300) : null
      };
    });
    console.log('Reader info after click:', readerInfo);
    // Accept either an activeDocId or an explanatory error message in the reader HTML (CORS preview blocked)
    if(!readerInfo.activeDocId && !(readerInfo.readerText && (readerInfo.readerText.includes('Could not preview') || readerInfo.readerText.includes('Loading')))){
      throw new Error('Reader did not open or show an expected error message');
    }
    console.log('Reader opened (or preview error shown) successfully');

    console.log('ALL TESTS PASSED');
    await browser.close();
    process.exit(0);
  }catch(err){
    console.error('TEST FAILED:', err);
    await browser.close();
    process.exit(1);
  }
})();
