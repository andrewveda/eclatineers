// ═══════════════════════════════════════════════════════
// GLOBAL APP ARCHITECTURE CONFIGURATION
// ═══════════════════════════════════════════════════════
const CONFIG = {
    // Shared Google Spreadsheet ID
    SHEET_ID: '1CnPHtSxSDl3EvsfewstH2ZPHG78nrnJ1ARmOQkrjWNs',
    
    // Tab names inside your Google Sheet
    SHEETS: {
        ISSUES: 'Issues',
        ARTICLES: 'Articles',
        PATRONS: 'Patrons',
        EDITORIAL: 'Editorial'
    },
    
    // Institutional Footer & Layout Context Data
    COLLEGE: 'SRM Valliammai Engineering College',
    DEPARTMENT: 'Department of English',
    WEBSITE: 'https://www.eclatineers.in/',
    FOOTER_NOTE: 'For private circulation only'
};

// Application State Memory Cache Engine
const Cache = { issues: null, articles: null, patrons: null, editorial: null };

// ═══════════════════════════════════════════════════════
// DATA PIPELINE INTERACTION LAYER (gviz API)
// ═══════════════════════════════════════════════════════
async function fetchSheet(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Network failure requesting dataset: ${sheetName}`);
    
    const text = await res.text();
    // Safely extract payload clean boundaries from the JSONP response envelope wrap
    const jsonStr = text.replace(/\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\(/, '').replace(/\);?\s*$/, '');
    const data = JSON.parse(jsonStr);
    
    // Auto-normalize sheet cell structural indices using matching data tokens
    const cols = data.table.cols.map(c => c.label.toLowerCase().replace(/[^a-z0-9]/g, '_').trim());
    
    return data.table.rows.map(row => {
        const obj = {};
        cols.forEach((col, i) => { 
            let val = row.c[i]?.v ?? '';
            
            // FIX: Normalize ID value matching fields to absolute lower-case to avoid case matching failure bugs
            if (typeof val === 'string' && (col === 'id' || col === 'issueid')) {
                val = val.toLowerCase().trim();
            }
            obj[col] = val;
        });
        return obj;
    });
}

async function loadAllData() {
    const [issues, articles, patrons, editorial] = await Promise.all([
        fetchSheet(CONFIG.SHEETS.ISSUES),
        fetchSheet(CONFIG.SHEETS.ARTICLES),
        fetchSheet(CONFIG.SHEETS.PATRONS),
        fetchSheet(CONFIG.SHEETS.EDITORIAL)
    ]);
    Cache.issues = issues;
    Cache.articles = articles;
    Cache.patrons = patrons;
    Cache.editorial = editorial;
}

const CoreData = {
    getIssue: (id) => Cache.issues.find(i => String(i.id) === String(id).toLowerCase()),
    getArticles: (issueId) => Cache.articles.filter(a => String(a.issueid) === String(issueId).toLowerCase()).sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0)),
    getArticle: (issueId, slug) => Cache.articles.find(a => String(a.issueid) === String(issueId).toLowerCase() && a.slug === slug),
    getPatrons: (issueId) => Cache.patrons.filter(p => String(p.issueid) === String(issueId).toLowerCase()),
    getEditorial: (issueId) => Cache.editorial.filter(e => String(e.issueid) === String(issueId).toLowerCase())
};

function getRouterParams() {
    const params = new URLSearchParams(window.location.search);

    return {
        issue: params.get('issue'),
        article: params.get('article'),
        section: params.get('section')
    };
}

function handleRouting() {
    const { issue, article, section } = getRouterParams();

    if (issue && article) {
        renderArticlePage(issue, article);
    } else if (issue && section === 'patrons') {
        renderPatronsPage(issue);
    } else if (issue && section === 'editorial') {
        renderEditorialPage(issue);
    } else if (issue) {
        renderIssuePage(issue);
    } else {
        renderHomePage();
    }
}

// Complex Linear Gold Pattern Ornament Injector
function renderGoldOrnament() {
    return `
        <div class="ornament-frame">
            <div class="ornament-line-complex"></div>
            <div class="ornament-crest">✦ ⚜ ✦</div>
            <div class="ornament-line-complex"></div>
        </div>`;
}

// ═══════════════════════════════════════════════════════
// DYNAMIC TEXT & ELEMENT CONTENT PARSER
// ═══════════════════════════════════════════════════════
function parseContent(text, category) {
    if (!text) return '';

    // Interactive Riddle Render Loop
    if (category === 'Riddles') {
        let html = '';
        const qas = text.split('>>').map(item => item.trim()).filter(Boolean);
        
        for (let i = 0; i < qas.length; i++) {
            if (qas[i].startsWith('??')) {
                const question = qas[i].slice(2).trim().replace(/\n/g, '<br>');
                const answer = (qas[i + 1] && !qas[i + 1].startsWith('??')) ? qas[i + 1].trim() : '...';
                
                html += `
                    <div class="riddle-card">
                        <div class="riddle-text">${question}</div>
                        <button class="riddle-btn" onclick="toggleRiddle(this)">Reveal Answer</button>
                        <div class="riddle-answer">${escHtml(answer)}</div>
                    </div>`;
            }
        }
        return html;
    }

    // Cryptic Clue Parser Injection
    if (category && category.includes('Cryptic')) {
        const lines = text.split('\n');
        let html = '<div style="display:grid; gap:20px;">';
        
        lines.forEach(line => {
            if (line.trim().startsWith('!!')) {
                const clean = line.replace(/^\s*!!/, '').trim();
                const parts = clean.split(':');
                if (parts.length >= 3) {
                    const num = parts[0].trim();
                    const clue = parts[1].trim();
                    // FIX: Recombine everything following the second token partition boundary cleanly
                    const hint = parts.slice(2).join(':').trim(); 
                    
                    html += `
                        <div class="clue-card">
                            <div class="clue-number">Clue ${num}</div>
                            <div class="clue-text">${escHtml(clue)}</div>
                            <div class="clue-hint">${escHtml(hint)}</div>
                        </div>`;
                }
            }
        });
        html += '</div>';
        return html;
    }

    // Traditional Structure Document Parser (Paragraphs, Quotes, Highlighting, Images)
    let html = '';
    const blocks = text.split('\n\n').map(b => b.trim()).filter(Boolean);
    let inBox = false;

    blocks.forEach(block => {
        // Image parsing mapping sequence (!Caption:SourceURL)
        if (block.startsWith('!') && block.includes(':')) {
            if (inBox) { html += '</div>'; inBox = false; }
            const parts = block.substring(1).split(':');
            const caption = parts[0].trim();
            const src = parts.slice(1).join(':').trim();
            html += `<div class="article-image"><img src="${escHtml(src)}" alt="${escHtml(caption)}" loading="lazy"><div class="image-caption">${escHtml(caption)}</div></div>`;
            return;
        }

        // Pull Quotes
        if (block.startsWith('>>')) {
            if (inBox) { html += '</div>'; inBox = false; }
            const quote = block.slice(2).trim();
            html += `<div class="article-quote">${escHtml(quote)}</div>`;
            return;
        }

        // Highlight Container Box Title Header
        if (block.startsWith('##')) {
            if (inBox) { html += '</div>'; inBox = false; }
            const title = block.slice(2).trim();
            html += `<div class="highlight-box"><h3>${escHtml(title)}</h3>`;
            inBox = true;
            return;
        }

        // Internal List Element Generation Loops
        if (inBox && block.startsWith('- ')) {
            const items = block.split('\n').filter(l => l.trim().startsWith('- '));
            html += '<ul>' + items.map(i => `<li>${escHtml(i.trim().slice(2))}</li>`).join('') + '</ul>';
            return;
        }

        if (inBox && !block.startsWith('- ')) {
            html += '</div>';
            inBox = false;
        }

        // Standard Editorial Paragraph Normalization
        const formatted = escHtml(block).replace(/\n/g, '<br>');
        html += `<p>${formatted}</p>`;
    });

    if (inBox) html += '</div>';
    return html;
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.toggleRiddle = function(btn) {
    const answer = btn.nextElementSibling;
    answer.classList.toggle('show');
    btn.textContent = answer.classList.contains('show') ? 'Hide Answer' : 'Reveal Answer';
};

// ═══════════════════════════════════════════════════════
// UI RENDERING SECTIONS
// ═══════════════════════════════════════════════════════
function renderHomePage() {
    let html = `
        <header class="header">
            <div class="container">
                <div class="college-name">${CONFIG.COLLEGE}</div>
                <h1 class="magazine-title">Eclatineers</h1>
                ${renderGoldOrnament()}
                <div class="magazine-subtitle">${CONFIG.DEPARTMENT}</div>
            </div>
        </header>
        <section style="padding: 40px 0 80px;">
            <div class="container">
                <div class="editorial-canvas-grid">`;

    Cache.issues.forEach(issue => {
        const imgSrc = issue.cover || `https://picsum.photos/seed/${issue.id}/800/400.jpg`;
        html += `
            <a class="issue-card" href="?issue=${issue.id}">
                <img class="issue-card-img" src="${escHtml(imgSrc)}" alt="${escHtml(issue.title)}" loading="lazy">
                <div class="issue-card-body">
                    <div class="issue-card-date">${escHtml(issue.date)}</div>
                    <div class="issue-card-title">${escHtml(issue.title)}</div>
                    <div class="issue-card-tagline">${escHtml(issue.tagline || '')}</div>
                </div>
            </a>`;
    });

    html += `</div></div></section>${renderFooter()}`;
    document.getElementById('app').innerHTML = html;
    updateNavBarState(false);
    window.scrollTo(0, 0);
}

function renderIssuePage(issueId) {
    const issue = CoreData.getIssue(issueId);
    if (!issue) { displayApplicationError('Target issue reference context absent.'); return; }

    const articles = CoreData.getArticles(issueId);
    const imgSrc = issue.cover || `https://picsum.photos/seed/${issue.id}/800/560.jpg`;

    let html = `
        <header class="header">
            <div class="container">
                <div class="college-name">${CONFIG.COLLEGE}</div>
                <h1 class="magazine-title">${escHtml(issue.title)}</h1>
                ${renderGoldOrnament()}
                <div class="magazine-subtitle">${CONFIG.DEPARTMENT}</div>
                <div class="issue-info">${escHtml(issue.date)} Folio</div>
            </div>
        </header>
        <section class="cover-section" style="margin-bottom: 60px;">
            <div class="container">
                <div class="cover-image-container" style="border: 1px solid var(--gold); padding: 12px; background: var(--cream-light)">
                    <img src="${escHtml(imgSrc)}" alt="Cover Master Asset" class="cover-image" style="width:100%; height:auto; display:block;" loading="lazy">
                </div>
            </div>
        </section>`;

    if (issue.about) {
        html += `
        <section class="intro-section" style="margin-bottom: 80px;">
            <div class="container">
                <p class="intro-text" style="font-size:22px; font-style:italic; text-align:center; margin-bottom:40px; color:var(--text-medium); line-height:1.6;">"${escHtml(issue.about)}"</p>
                <div class="definition-box">
                    <div class="definition-term">Eclatineers</div>
                    <div class="definition-pronunciation">/ˌek-lə-ˈnīrz/</div>
                    <div class="definition-text">The architectural bridge connecting human artistic brilliance with technical synthesis. Built on human computation, execution, and aesthetics.</div>
                </div>
            </div>
        </section>`;
    }

    html += `
        <section class="toc-section" style="padding-bottom:80px;">
            <div class="container">
                <h2 class="section-title">Index of Work</h2>
                <ul class="toc-list">`;
    
    articles.forEach((art, i) => {
        const num = String(i + 1).padStart(2, '0');
        html += `
            <li class="toc-item">
                <a class="toc-link" href="?issue=${issueId}&article=${art.slug}">
                    <div class="toc-number">${num}</div>
                    <div class="toc-content">
                        <div class="toc-title">${escHtml(art.title)}</div>
                        <div class="toc-meta">${escHtml(art.author).toUpperCase()} — ${escHtml(art.category).toUpperCase()}</div>
                    </div>
                    <div class="toc-arrow">→</div>
                </a>
            </li>`;
    });

    html += `
            <li class="toc-item">
                <a class="toc-link" href="?issue=${issueId}&section=patrons">
                    <div class="toc-number">✦</div>
                    <div class="toc-content">
                        <div class="toc-title">Our Patrons</div>
                        <div class="toc-meta">INSTITUTIONAL DIRECTORY</div>
                    </div>
                    <div class="toc-arrow">→</div>
                </a>
            </li>
            <li class="toc-item">
                <a class="toc-link" href="?issue=${issueId}&section=editorial">
                    <div class="toc-number">✦</div>
                    <div class="toc-content">
                        <div class="toc-title">Editorial Board</div>
                        <div class="toc-meta">FACULTY EDITORS</div>
                    </div>
                    <div class="toc-arrow">→</div>
                </a>
            </li>`;
            
    html += `</ul></div></section>${renderFooter()}`;

    document.getElementById('app').innerHTML = html;
    updateNavBarState(true, issue.title, '?');
    buildDynamicSlideoutMenu(issueId, articles);
    window.scrollTo(0, 0);
}

function renderArticlePage(issueId, slug) {
    const article = CoreData.getArticle(issueId, slug);
    if (!article) { displayApplicationError('Article structure could not be mapped.'); return; }

    const category = article.category || '';
    const rawContent = article.content || '';

    // Handle special structural block logic parsed values smoothly
    let finalBodyHtml = '';
    if (category === 'Riddles' || (category && category.includes('Cryptic'))) {
        finalBodyHtml = parseContent(rawContent, category);
    } else {
        // Construct natural premium paragraphs layout strings
        const paragraphs = rawContent.split('\n\n').map(p => p.trim()).filter(Boolean);
        finalBodyHtml = paragraphs.map((p, idx) => {
            if (idx === 0) return `<p class="drop-cap-p">${escHtml(p)}</p>`;
            return `<p>${escHtml(p).replace(/\n/g, '<br>')}</p>`;
        }).join('');
    }

    // Layout Composition Base Frame Mount
    let html = `
        <div class="reader-container">
            <div class="reader-canvas-viewport" id="readerViewport">
                <div class="reader-fluid-book" id="readerBook">
                    
                    <!-- Single Continuous Multi-Column Folio Page -->
                    <div class="reader-folio-page">
                        <div class="article-category" style="margin-bottom:1.5vh; text-align:left; color:var(--gold-dark); font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase;">${escHtml(category)}</div>
                        <h2>${escHtml(article.title)}</h2>
                        
                        <div class="article-author-signature" style="text-align:left; margin-bottom:4vh; border-bottom:1px solid rgba(var(--gold-raw), 0.15); padding-bottom:2vh;">
                            <div class="author-name" style="font-family:'Montserrat',sans-serif; font-size:11px; text-transform:uppercase; font-weight:600;">${escHtml(article.author)}</div>
                            ${article.authorbio ? `<div class="author-bio" style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:14px; color:var(--text-light); margin-top:2px;">${escHtml(article.authorbio)}</div>` : ''}
                        </div>

                        <div class="reader-text-flow">
                            ${finalBodyHtml}
                        </div>
                    </div>

                </div>
            </div>

            <!-- Kindle Bottom Navigation Dashboard Ribbon -->
            <div class="page-footer-strip" style="margin-top:2vh;">
                <div style="cursor:pointer;" onclick="turnEbookPage(-1)">‹ PREV</div>
                <div id="ebookProgressIndicator" style="font-weight:600; font-family:'Montserrat',sans-serif; font-size:10px; color:var(--gold-dark);">PAGE 1</div>
                <div style="cursor:pointer;" onclick="turnEbookPage(1)">NEXT ›</div>
            </div>
        </div>

        <!-- Global Collapsible Persistent Giscus Forum Sheet Overlay -->
        <button class="drawer-toggle-trigger-btn" id="commentDrawerBtn" onclick="toggleCommentDrawer(true)">Reviews & Thoughts</button>
        
        <div class="reader-comments-drawer" id="commentDrawer">
            <div class="drawer-header-bar">
                <span style="font-family:'Playfair Display',serif; font-size:15px; font-weight:600;">Contributions & Analysis</span>
                <span style="cursor:pointer; font-family:'Montserrat',sans-serif; font-size:11px; letter-spacing:1px;" onclick="toggleCommentDrawer(false)">✕ CLOSE</span>
            </div>
            <div style="padding: 20px 40px; height: calc(100% - 50px); overflow-y: auto;">
                <div id="giscus-container"></div>
            </div>
        </div>`;

    document.getElementById('app').innerHTML = html;
    updateNavBarState(true, article.title, `?issue=${issueId}`);
    buildDynamicSlideoutMenu(issueId, CoreData.getArticles(issueId));

    // Bootstrap E-Reader Pagination & Virtual Matrix Calculation Parameters 
    window.currentEbookPage = 0;
    setTimeout(() => { calculateEbookPaginationMetrics(); }, 150);

    // Initialize Global Interactive Comment Systems asynchronously
    initGiscusComments(article.title, article.author);
}

// ═══════════════════════════════════════════════════════
// E-READER ENGINE CALCULATION MATRIX
// ═══════════════════════════════════════════════════════
function calculateEbookPaginationMetrics() {
    const viewport = document.getElementById('readerViewport');
    const book = document.getElementById('readerBook');
    if (!viewport || !book) return;

    // Read dynamic horizontal layout dimensions mapped inside the client browser context
    const viewWidth = viewport.clientWidth;
    const totalScrollWidth = book.scrollWidth;

    // Total virtual pages matches the physical width of contents divided by visible viewport slices
    window.totalEbookPages = Math.max(1, Math.round(totalScrollWidth / viewWidth));
    updateEbookNavigationFeedbackStrip();
}

// ═══════════════════════════════════════════════════════
// E-READER ENGINE NAVIGATION CONTROLS
// ═══════════════════════════════════════════════════════
window.turnEbookPage = function(direction) {
    const book = document.getElementById('readerBook');
    const viewport = document.getElementById('readerViewport');
    if (!book || !viewport) return;

    let targetPage = window.currentEbookPage + direction;
    if (targetPage < 0 || targetPage >= window.totalEbookPages) return;

    window.currentEbookPage = targetPage;
    
    // Shift horizontally using seamless, hardware-accelerated translations
    const shiftOffset = targetPage * viewport.clientWidth;
    book.style.transform = `translateX(-${shiftOffset}px)`;
    
    updateEbookNavigationFeedbackStrip();
};

function updateEbookNavigationFeedbackStrip() {
    const indicator = document.getElementById('ebookProgressIndicator');
    if (indicator) {
        indicator.textContent = `LOC ${window.currentEbookPage + 1} OF ${window.totalEbookPages}`;
    }
}

// ═══════════════════════════════════════════════════════
// GESTURE & KEYBOARD EVENTS INTERACTION LAYER
// ═══════════════════════════════════════════════════════

/* A. Desktop Trackpad & Mouse Wheel Horizontal Hook */
document.removeEventListener('wheel', handleEbookWheelGestures);
document.addEventListener('wheel', handleEbookWheelGestures, { passive: false });

function handleEbookWheelGestures(e) {
    const book = document.getElementById('readerBook');
    if (!book) return;

    // Prevent standard structural vertical overflow scroll ticks
    e.preventDefault();
    
    if (window.ebookWheelThrottled) return;
    window.ebookWheelThrottled = true;
    setTimeout(() => { window.ebookWheelThrottled = false; }, 400);

    // Turn next on scroll down/right; turn prev on scroll up/left
    if (e.deltaY > 0 || e.deltaX > 0) {
        turnEbookPage(1);
    } else {
        turnEbookPage(-1);
    }
}

/* B. Desktop Comprehensive Keyboard Navigation Matrix */
document.removeEventListener('keydown', handleMagKeydowns);
document.addEventListener('keydown', handleMagKeydowns);

function handleMagKeydowns(e) {
    if (!document.getElementById('readerBook')) return;

    // Map up/right directions to "Next", down/left directions to "Prev"
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        turnEbookPage(1);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        turnEbookPage(-1);
    }
}

/* C. Mobile Fluid Touch Swipe Pagination Engine */
let touchStartY = 0;
let touchStartX = 0;

document.removeEventListener('touchstart', handleEbookTouchStart);
document.addEventListener('touchstart', handleEbookTouchStart, { passive: true });

document.removeEventListener('touchend', handleEbookTouchEnd);
document.addEventListener('touchend', handleEbookTouchEnd, { passive: false });

function handleEbookTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}

function handleEbookTouchEnd(e) {
    if (!document.getElementById('readerBook')) return;

    const deltaX = e.changedTouches[0].screenX - touchStartX;
    const deltaY = e.changedTouches[0].screenY - touchStartY;
    
    // Define a minimum pixel threshold to distinguish intentional swipes from accidental micro-taps
    const threshold = 40; 

    // Capture vertical swipe gestures ("scrolling down") or clear horizontal swipes
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
        if (Math.abs(deltaY) > threshold) {
            e.preventDefault(); // Halt standard bouncing behavior
            if (deltaY < 0) {
                turnEbookPage(1);  // Swiped upward (scrolling down the screen) -> Next Page
            } else {
                turnEbookPage(-1); // Swiped downward (scrolling up the screen) -> Previous Page
            }
        }
    } else {
        if (Math.abs(deltaX) > threshold) {
            if (deltaX < 0) {
                turnEbookPage(1);  // Swiped left -> Next Page
            } else {
                turnEbookPage(-1); // Swiped right -> Previous Page
            }
        }
    }
}

// ═══════════════════════════════════════════════════════
// DYNAMIC COMMENTS ACTION ENGINE
// ═══════════════════════════════════════════════════════
window.toggleCommentDrawer = function(open) {
    const drawer = document.getElementById('commentDrawer');
    const btn = document.getElementById('commentDrawerBtn');
    if (!drawer) return;

    if (open) {
        drawer.classList.add('open');
        if (btn) btn.style.display = 'none';
    } else {
        drawer.classList.remove('open');
        if (btn) btn.style.display = 'block';
    }
};

// Handle window structural canvas ratio re-sizing modifications natively
window.addEventListener('resize', () => {
    if (document.getElementById('readerBook')) {
        window.currentEbookPage = 0;
        document.getElementById('readerBook').style.transform = 'translateX(0px)';
        calculateEbookPaginationMetrics();
    }
});
function renderPatronsPage(issueId) {
    const patrons = CoreData.getPatrons(issueId);
    let html = `
        <section class="patrons-section" style="padding-top:120px;">
            <div class="container">
                <h2 class="section-title">Our Patrons</h2>
                <div style="margin-top:40px;">`;
                
    patrons.forEach(p => {
        html += `
                <div class="patron-card">
                    <div class="patron-name">${escHtml(p.name)}</div>
                    <div class="patron-title">${escHtml(p.title)}</div>
                    <div class="patron-bio">${escHtml(p.bio)}</div>
                </div>`;
    });
    
    html += `</div></div></section>${renderFooter()}`;
    document.getElementById('app').innerHTML = html;
    updateNavBarState(true, 'Our Patrons', `?issue=${issueId}`);
    buildDynamicSlideoutMenu(issueId, CoreData.getArticles(issueId));
    window.scrollTo(0, 0);
}

function renderEditorialPage(issueId) {
    const editorial = CoreData.getEditorial(issueId);
    let html = `
        <section class="editorial-section" style="padding-top:120px;">
            <div class="container">
                <h2 class="section-title">Editorial Board</h2>
                <div class="editorial-grid" style="margin-top:40px;">`;
                
    editorial.forEach(e => {
        html += `
                    <div class="editor-card">
                        <div class="editor-name">${escHtml(e.name)}</div>
                        <div class="editor-role">${escHtml(e.role)}</div>
                    </div>`;
    });
    
    html += `</div>
                <div style="margin-top:60px; text-align:center; font-family:'Montserrat',sans-serif; font-size:10px; letter-spacing:2px; color:var(--text-light); text-transform:uppercase;">${CONFIG.FOOTER_NOTE}</div>
            </div>
        </section>${renderFooter()}`;
        
    document.getElementById('app').innerHTML = html;
    updateNavBarState(true, 'Editorial Board', `?issue=${issueId}`);
    buildDynamicSlideoutMenu(issueId, CoreData.getArticles(issueId));
    window.scrollTo(0, 0);
}

function renderFooter() {
    return `
        <footer class="footer">
            <div class="container">
                <div class="footer-logo">Eclatineers</div>
                <div class="footer-tagline">Visible éclat. Invisible engineer.</div>
                <div class="footer-links">
                    <a href="?" class="footer-link">Home</a>
                    <a href="${CONFIG.WEBSITE}" class="footer-link" target="_blank">Website</a>
                </div>
                <div class="footer-copyright">© ${new Date().getFullYear()} ${CONFIG.COLLEGE}<br>${CONFIG.DEPARTMENT}</div>
            </div>
        </footer>`;
}

// ═══════════════════════════════════════════════════════
// GISCUS COMMENT INTEGRATION PIPELINE
// ═══════════════════════════════════════════════════════
function initGiscusComments(articleTitle, articleAuthor) {
    const container = document.getElementById('giscus-container');
    if (!container) return;
    container.innerHTML = ''; // fresh mount per article render

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', window.location.href);

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo',        'andrewveda/eclatineers');
    script.setAttribute('data-repo-id',     'R_kgDOTP7ILw');
    script.setAttribute('data-category',    'Announcements');
    script.setAttribute('data-category-id', 'DIC_kwDOTP7IL84DAruF');
    script.setAttribute('data-mapping',     'specific');
    script.setAttribute('data-term',        `${articleTitle} — ${articleAuthor}`);
    script.setAttribute('data-theme',       'preferred_color_scheme');
    script.crossOrigin = 'anonymous';
    script.async = true;

    container.appendChild(script);
}

// ═══════════════════════════════════════════════════════
// UI ENGINE RE-RENDERING PIPELINE HOOKS
// ═══════════════════════════════════════════════════════
function updateNavBarState(visible, title, backHash) {
    const nav = document.getElementById('navBar');
    if (visible) {
        nav.classList.add('show');
        document.getElementById('navTitle').textContent = title || 'Eclatineers';
        document.getElementById('navBack').href = backHash || '?';
    } else {
        nav.classList.remove('show');
    }
}

function buildDynamicSlideoutMenu(issueId, articles) {
    const list = document.getElementById('mobileMenuList');
    let html = `
        <li class="mobile-menu-sep">Navigation</li>
        <li class="mobile-menu-item"><a class="mobile-menu-link" href="?issue=${issueId}">← Main Folio</a></li>
        <li class="mobile-menu-sep">Table of Contents</li>`;
        
    articles.forEach(art => {
        html += `<li class="mobile-menu-item"><a class="mobile-menu-link" href="?issue=${issueId}&article=${art.slug}">${escHtml(art.title)}</a></li>`;
    });
    
    html += `
        <li class="mobile-menu-sep">Management</li>
        <li class="mobile-menu-item"><a class="mobile-menu-link" href="?issue=${issueId}&section=patrons">Our Patrons</a></li>
        <li class="mobile-menu-item"><a class="mobile-menu-link" href="?issue=${issueId}&section=editorial">Editorial Board</a></li>
        <li class="mobile-menu-sep">System</li>
        <li class="mobile-menu-item"><a class="mobile-menu-link" href="#">View Archive</a></li>`;
        
    list.innerHTML = html;

    // Clear UI layout bounds on transition link selection
    list.querySelectorAll('.mobile-menu-link').forEach(link => {
        link.addEventListener('click', () => {
            document.getElementById('mobileMenu').classList.remove('open');
            document.body.style.overflow = '';
        });
    });
}

function displayApplicationError(msg) {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('errorMsg').textContent = msg;
    document.getElementById('errorScreen').classList.add('show');
}

// ═══════════════════════════════════════════════════════
// INITIALIZATION ENTRY POINT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    // Dynamic event trigger bounds mapping
    document.getElementById('navMenuBtn').addEventListener('click', () => {
        const menu = document.getElementById('mobileMenu');
        menu.classList.toggle('open');
        document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
    });
    
    document.getElementById('mobileMenuClose').addEventListener('click', () => {
        document.getElementById('mobileMenu').classList.remove('open');
        document.body.style.overflow = '';
    });

    const btt = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
        btt.classList.toggle('show', window.pageYOffset > 400);
    });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    try {
        await loadAllData();
        document.getElementById('loader').classList.add('hidden');
        handleRouting(); // Bootstrap routing configuration engine parameters explicitly
    } catch (err) {
        console.error(err);
        displayApplicationError('Failed to capture database cells from your spreadsheet channel.');
    }
});

// ═══════════════════════════════════════════════════════
// MAG CORE ENGINE NAVIGATION CONTROLS
// ═══════════════════════════════════════════════════════
window.turnMagazinePage = function(direction) {
    const book = document.getElementById('magazineBook');
    if (!book) return;

    const pages = book.querySelectorAll('.magazine-page');
    let targetIndex = window.currentMagPageIndex + direction;

    // Halt index evaluation at outer bounds boundaries
    if (targetIndex < 0 || targetIndex >= window.totalMagPages) return;

    window.currentMagPageIndex = targetIndex;

    pages.forEach((page, idx) => {
        page.classList.remove('past', 'active', 'future');
        if (idx < targetIndex) {
            page.classList.add('past');
        } else if (idx === targetIndex) {
            page.classList.add('active');
        } else {
            page.classList.add('future');
        }
    });
};

// Bind horizontal arrow key event triggers to enhance user accessibility
document.removeEventListener('keydown', handleMagKeydowns);
document.addEventListener('keydown', handleMagKeydowns);

function handleMagKeydowns(e) {
    if (e.key === 'ArrowRight') turnMagazinePage(1);
    if (e.key === 'ArrowLeft') turnMagazinePage(-1);
}
