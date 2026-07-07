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

    const rawContent = article.content || '';
    const category = article.category || '';
    
    let pageGroups = [];

    // Chunking rules tailored specifically to content type to minimize empty spaces
    if (category === 'Riddles' || (category && category.includes('Cryptic'))) {
        // Special structural parsers require explicit self-contained rendering blocks
        pageGroups.push(parseContent(rawContent, category));
    } else {
        const paragraphs = rawContent.split('\n\n').map(p => p.trim()).filter(Boolean);
        let currentGroup = [];
        
        paragraphs.forEach((para, idx) => {
            currentGroup.push(para);
            // Dynamic clustering: Group chunks in segments of two to balance spatial layouts tightly
            if (currentGroup.length === 2 || idx === paragraphs.length - 1) {
                // Parse standard inner formatting tokens fields on generation
                const collectiveHtml = currentGroup.map((p, pIdx) => {
                    if (pageGroups.length === 0 && pIdx === 0 && !['Poetry', 'Lines & Lenses'].includes(category)) {
                        // Apply drop-cap signature style formatting only on the first letter of the first page
                        const cleanP = escHtml(p);
                        return `<p class="drop-cap-p">${cleanP}</p>`;
                    }
                    return `<p>${escHtml(p).replace(/\n/g, '<br>')}</p>`;
                }).join('');
                
                pageGroups.push(collectiveHtml);
                currentGroup = [];
            }
        });
    }

    // Always append Giscus Discussion platform dynamically to the final layout page
    const totalContentPages = pageGroups.length;
    
    let html = `
        <div class="magazine-viewport">
            <div class="magazine-book" id="magazineBook">`;

    // Render generated content nodes out as sequential fixed portfolio flip elements
    pageGroups.forEach((pageHtmlContent, pageIndex) => {
        const pageNum = pageIndex + 1;
        const totalPages = totalContentPages + 1; // plus 1 explicitly to account for comments sheet
        const isFirst = pageIndex === 0;
        const stateClass = isFirst ? 'active' : 'future';

        html += `
            <div class="magazine-page ${stateClass}" data-page="${pageIndex}">
                <div class="article-category" style="margin-bottom:1vh;">${escHtml(category)}</div>
                
                <div class="page-content-wrapper">
                    ${isFirst ? `<h2 class="article-title-compact">${escHtml(article.title)}</h2>` : ''}
                    ${isFirst ? `
                    <div class="article-author-signature" style="margin-bottom: 3vh;">
                        <div class="author-name" style="font-size:11px;">${escHtml(article.author)}</div>
                        ${article.authorbio ? `<div class="author-bio" style="font-size:13px; margin-top:2px;">${escHtml(article.authorbio)}</div>` : ''}
                    </div>` : ''}
                    
                    <div class="article-body-bounded">
                        ${pageHtmlContent}
                    </div>
                </div>

                <div class="page-footer-strip">
                    <div>${CONFIG.COLLEGE}</div>
                    <div style="font-weight:600; color:var(--gold-dark);">${pageNum} / ${totalPages}</div>
                    <div>${escHtml(article.title).substring(0, 20)}...</div>
                </div>
            </div>`;
    });

    // Mount dedicated Commentary Sheet to handle layout density isolation rules cleanly
    const finalPageNum = totalContentPages + 1;
    html += `
            <div class="magazine-page future" data-page="${totalContentPages}">
                <div class="article-category" style="margin-bottom:1vh;">Discussion Folio</div>
                <div class="page-content-wrapper" style="justify-content: flex-start; overflow-y: auto;">
                    <h3 style="font-family:'Playfair Display',serif; font-size:20px; text-align:center; margin-bottom:15px; color:var(--text-dark);">Literary Review Contributions</h3>
                    <div id="giscus-container" style="min-height: 150px; width:100%;"></div>
                </div>
                <div class="page-footer-strip">
                    <div>${CONFIG.COLLEGE}</div>
                    <div style="font-weight:600; color:var(--gold-dark);">${finalPageNum} / ${finalPageNum}</div>
                    <div>Reader Analytics</div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="magazine-controls">
        <button class="mag-btn" onclick="turnMagazinePage(-1)">« Prev</button>
        <button class="mag-btn" onclick="turnMagazinePage(1)">Next »</button>
    </div>`;

    document.getElementById('app').innerHTML = html;
    updateNavBarState(true, article.title, `?issue=${issueId}`);
    buildDynamicSlideoutMenu(issueId, CoreData.getArticles(issueId));
    
    // Initialize standard runtime parameters pointers context tracker fields
    window.currentMagPageIndex = 0;
    window.totalMagPages = finalPageNum;

    // Bootstrap comments engine asynchronously
    initGiscusComments(article.title, article.author);
}

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
