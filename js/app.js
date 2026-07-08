/* ═══════════════════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════════════════ */
const CONFIG = {
    SHEET_ID: '1CnPHtSxSDl3EvsfewstH2ZPHG78nrnJ1ARmOQkrjWNs',
    SHEETS: {
        ISSUES: 'Issues',
        ARTICLES: 'Articles',
        PATRONS: 'Patrons',
        EDITORIAL: 'Editorial'
    },
    COLLEGE: 'SRM Valliammai Engineering College',
    DEPARTMENT: 'Department of English',
    WEBSITE: 'https://www.eclatineers.in/',
    FOOTER_NOTE: 'For private circulation only'
};

/* ═══════════════════════════════════════════════════════
   CACHE
   ═══════════════════════════════════════════════════════ */
const Cache = { issues: null, articles: null, patrons: null, editorial: null };

/* ═══════════════════════════════════════════════════════
   DATA FETCHING
   ═══════════════════════════════════════════════════════ */
async function fetchSheet(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Network failure requesting dataset: ${sheetName}`);

    const text = await res.text();
    const jsonStr = text.replace(/\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\(/, '').replace(/\);?\s*$/, '');
    const data = JSON.parse(jsonStr);

    const cols = data.table.cols.map(c => c.label.toLowerCase().replace(/[^a-z0-9]/g, '_').trim());

    return data.table.rows.map(row => {
        const obj = {};
        cols.forEach((col, i) => { 
            let val = row.c[i]?.v ?? '';
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

/* ═══════════════════════════════════════════════════════
   CORE DATA HELPERS
   ═══════════════════════════════════════════════════════ */
const CoreData = {
    getIssue: (id) => Cache.issues.find(i => String(i.id) === String(id).toLowerCase()),
    getArticles: (issueId) => Cache.articles
        .filter(a => String(a.issueid) === String(issueId).toLowerCase())
        .sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0)),
    getArticle: (issueId, slug) => Cache.articles.find(a => 
        String(a.issueid) === String(issueId).toLowerCase() && a.slug === slug),
    getPatrons: (issueId) => Cache.patrons.filter(p => String(p.issueid) === String(issueId).toLowerCase()),
    getEditorial: (issueId) => Cache.editorial.filter(e => String(e.issueid) === String(issueId).toLowerCase())
};

/* ═══════════════════════════════════════════════════════
   ROUTING
   ═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   ORNAMENT
   ═══════════════════════════════════════════════════════ */
function renderGoldOrnament() {
    return `
        <div class="ornament-frame">
            <div class="ornament-line-complex"></div>
            <div class="ornament-crest">✦ ⚜ ✦</div>
            <div class="ornament-line-complex"></div>
        </div>`;
}

/* ═══════════════════════════════════════════════════════
   CONTENT PARSER
   ═══════════════════════════════════════════════════════ */
function escHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function parseContent(text, category) {
    if (!text) return '';

    // Riddles
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

    // Cryptic
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
                    const hint = parts.slice(2).join(':').trim(); 

                    html += `
                        <div class="clue-card">
                            <div class="clue-number">Clue ${escHtml(num)}</div>
                            <div class="clue-text">${escHtml(clue)}</div>
                            <div class="clue-hint">${escHtml(hint)}</div>
                        </div>`;
                }
            }
        });
        html += '</div>';
        return html;
    }

    // Standard content
    let html = '';
    const blocks = text.split('\n\n').map(b => b.trim()).filter(Boolean);
    let inBox = false;

    blocks.forEach(block => {
        // Image: !Caption:SourceURL
        if (block.startsWith('!') && block.includes(':')) {
            if (inBox) { html += '</div>'; inBox = false; }
            const parts = block.substring(1).split(':');
            const caption = parts[0].trim();
            const src = parts.slice(1).join(':').trim();
            html += `<div class="article-image"><img src="${escHtml(src)}" alt="${escHtml(caption)}" loading="lazy"><div class="image-caption">${escHtml(caption)}</div></div>`;
            return;
        }

        // Pull Quote
        if (block.startsWith('>>')) {
            if (inBox) { html += '</div>'; inBox = false; }
            const quote = block.slice(2).trim();
            html += `<div class="article-quote">${escHtml(quote)}</div>`;
            return;
        }

        // Highlight Box
        if (block.startsWith('##')) {
            if (inBox) { html += '</div>'; inBox = false; }
            const title = block.slice(2).trim();
            html += `<div class="highlight-box"><h3>${escHtml(title)}</h3>`;
            inBox = true;
            return;
        }

        // List inside box
        if (inBox && block.startsWith('- ')) {
            const items = block.split('\n').filter(l => l.trim().startsWith('- '));
            html += '<ul>' + items.map(i => `<li>${escHtml(i.trim().slice(2))}</li>`).join('') + '</ul>';
            return;
        }

        if (inBox && !block.startsWith('- ')) {
            html += '</div>';
            inBox = false;
        }

        // Standard paragraph
        const formatted = escHtml(block).replace(/\n/g, '<br>');
        html += `<p>${formatted}</p>`;
    });

    if (inBox) html += '</div>';
    return html;
}

window.toggleRiddle = function(btn) {
    const answer = btn.nextElementSibling;
    answer.classList.toggle('show');
    btn.textContent = answer.classList.contains('show') ? 'Hide Answer' : 'Reveal Answer';
};

/* ═══════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   ISSUE PAGE
   ═══════════════════════════════════════════════════════ */
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
        <section class="cover-section">
            <div class="container">
                <div class="cover-image-container">
                    <img src="${escHtml(imgSrc)}" alt="Cover Master Asset" class="cover-image" loading="lazy">
                </div>
            </div>
        </section>`;

    if (issue.about) {
        html += `
        <section class="intro-section">
            <div class="container">
                <p class="intro-text">"${escHtml(issue.about)}"</p>
                <div class="definition-box">
                    <div class="definition-term">Eclatineers</div>
                    <div class="definition-pronunciation">/ˌek-lə-ˈnīrz/</div>
                    <div class="definition-text">The architectural bridge connecting human artistic brilliance with technical synthesis. Built on human computation, execution, and aesthetics.</div>
                </div>
            </div>
        </section>`;
    }

    html += `
        <section class="toc-section">
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

/* ═══════════════════════════════════════════════════════
   READER SIDEBAR (persistent desktop index of the issue)
   ═══════════════════════════════════════════════════════ */
function renderReaderSidebarToc(issueId, articles, currentSlug) {
    let html = `
        <aside class="reader-sidebar-toc">
            <a class="reader-sidebar-back" href="?issue=${issueId}">← Main Folio</a>
            <div class="reader-sidebar-label">Index of Work</div>
            <ul class="reader-toc-mini-list">`;

    articles.forEach((art, i) => {
        const num = String(i + 1).padStart(2, '0');
        const active = art.slug === currentSlug ? ' active' : '';
        html += `
                <li class="reader-toc-mini-item">
                    <a class="reader-toc-mini-link${active}" href="?issue=${issueId}&article=${art.slug}">
                        ${num}. ${escHtml(art.title)}
                        <span class="reader-toc-mini-meta">${escHtml(art.author)}</span>
                    </a>
                </li>`;
    });

    html += `
            </ul>
            <div class="reader-sidebar-divider"></div>
            <ul class="reader-toc-mini-list">
                <li class="reader-toc-mini-item"><a class="reader-toc-mini-link" href="?issue=${issueId}&section=patrons">Our Patrons</a></li>
                <li class="reader-toc-mini-item"><a class="reader-toc-mini-link" href="?issue=${issueId}&section=editorial">Editorial Board</a></li>
            </ul>
        </aside>`;

    return html;
}

/* ═══════════════════════════════════════════════════════
   NEXT ARTICLE CARD
   ═══════════════════════════════════════════════════════ */
function renderNextArticleBlock(issueId, articles, currentSlug) {
    const idx = articles.findIndex(a => a.slug === currentSlug);
    const next = idx >= 0 && idx < articles.length - 1 ? articles[idx + 1] : null;

    if (next) {
        return `
            <a class="next-article-card" href="?issue=${issueId}&article=${next.slug}">
                <div>
                    <div class="next-article-label">Next in this Issue</div>
                    <div class="next-article-title">${escHtml(next.title)}</div>
                    <div class="next-article-meta">${escHtml(next.author).toUpperCase()} — ${escHtml(next.category).toUpperCase()}</div>
                </div>
                <div class="next-article-arrow">→</div>
            </a>`;
    }

    return `
        <div class="end-of-issue-card">
            <p>You've reached the end of this issue's index.</p>
            <a href="?issue=${issueId}">Back to Main Folio</a>
        </div>`;
}

/* ═══════════════════════════════════════════════════════
   ARTICLE PAGE — Continuous Scroll Reader
   ═══════════════════════════════════════════════════════ */
function renderArticlePage(issueId, slug) {
    const article = CoreData.getArticle(issueId, slug);
    if (!article) { displayApplicationError('Article structure could not be mapped.'); return; }

    const articles = CoreData.getArticles(issueId);
    const category = article.category || '';
    const rawContent = article.content || '';

    let finalBodyHtml = '';
    if (category === 'Riddles' || (category && category.includes('Cryptic'))) {
        finalBodyHtml = parseContent(rawContent, category);
    } else {
        const paragraphs = rawContent.split('\n\n').map(p => p.trim()).filter(Boolean);
        finalBodyHtml = paragraphs.map((p, idx) => {
            if (idx === 0) return `<p class="drop-cap-p">${escHtml(p).replace(/\n/g, '<br>')}</p>`;
            return `<p>${escHtml(p).replace(/\n/g, '<br>')}</p>`;
        }).join('');
    }

    let html = `
        <div class="reader-page-grid">
            ${renderReaderSidebarToc(issueId, articles, slug)}

            <div class="reader-main-content">
                <div class="reader-toolbar">
                    <button class="toolbar-btn font-minus" onclick="adjustReaderFontSize(-1)" aria-label="Decrease font size">A−</button>
                    <button class="toolbar-btn font-plus" onclick="adjustReaderFontSize(1)" aria-label="Increase font size">A+</button>
                    <div class="toolbar-sep"></div>
                    <button class="toolbar-btn" onclick="toggleSiteTheme()" aria-label="Toggle theme" id="readerThemeBtn">◐</button>
                </div>

                <div class="article-category">${escHtml(category)}</div>
                <h2>${escHtml(article.title)}</h2>

                <div class="article-author-signature">
                    <div class="author-name">${escHtml(article.author)}</div>
                    ${article.authorbio ? `<div class="author-bio">${escHtml(article.authorbio)}</div>` : ''}
                </div>

                <div class="reader-text-flow" id="readerTextFlow">
                    ${finalBodyHtml}
                </div>

                ${renderNextArticleBlock(issueId, articles, slug)}

                <div class="article-footer-strip">
                    <button class="drawer-toggle-trigger-btn" id="commentDrawerBtn" onclick="toggleCommentDrawer(true)">Reviews &amp; Thoughts</button>
                </div>
            </div>
        </div>

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
    buildDynamicSlideoutMenu(issueId, articles);

    // Initialize comments
    initGiscusComments(article.title, article.author);

    updateThemeButtonIcon();
    window.scrollTo(0, 0);
}

/* ═══════════════════════════════════════════════════════
   READER FONT SIZE CONTROL
   ═══════════════════════════════════════════════════════ */
const FONT_SCALE_MIN = 0.8;
const FONT_SCALE_MAX = 1.5;
const FONT_SCALE_STEP = 0.1;

function applyFontScale(scale) {
    document.documentElement.style.setProperty('--reader-font-scale', scale);
}

window.adjustReaderFontSize = function(direction) {
    let scale = parseFloat(localStorage.getItem('eclatineers-font-scale')) || 1;
    scale = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, +(scale + direction * FONT_SCALE_STEP).toFixed(2)));
    localStorage.setItem('eclatineers-font-scale', scale);
    applyFontScale(scale);
};

function initFontScale() {
    const saved = parseFloat(localStorage.getItem('eclatineers-font-scale'));
    applyFontScale(saved && !isNaN(saved) ? saved : 1);
}

/* ═══════════════════════════════════════════════════════
   THEME CONTROL (light / dark)
   ═══════════════════════════════════════════════════════ */
function initTheme() {
    const saved = localStorage.getItem('eclatineers-theme');
    const theme = saved === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeButtonIcon();
}

window.toggleSiteTheme = function() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('eclatineers-theme', next);
    updateThemeButtonIcon();
};

function updateThemeButtonIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const icon = isDark ? '☀' : '☾';
    const globalBtn = document.getElementById('themeToggleBtn');
    if (globalBtn) globalBtn.textContent = icon;
    const readerBtn = document.getElementById('readerThemeBtn');
    if (readerBtn) readerBtn.textContent = icon;
}

/* ═══════════════════════════════════════════════════════
   COMMENTS DRAWER
   ═══════════════════════════════════════════════════════ */
window.toggleCommentDrawer = function(open) {
    const drawer = document.getElementById('commentDrawer');
    const btn = document.getElementById('commentDrawerBtn');
    if (!drawer) return;

    if (open) {
        drawer.classList.add('open');
        if (btn) btn.style.display = 'none';
    } else {
        drawer.classList.remove('open');
        if (btn) btn.style.display = 'inline-block';
    }
};

/* ═══════════════════════════════════════════════════════
   PATRONS PAGE
   ═══════════════════════════════════════════════════════ */
function renderPatronsPage(issueId) {
    const patrons = CoreData.getPatrons(issueId);
    let html = `
        <section class="patrons-section">
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

/* ═══════════════════════════════════════════════════════
   EDITORIAL PAGE
   ═══════════════════════════════════════════════════════ */
function renderEditorialPage(issueId) {
    const editorial = CoreData.getEditorial(issueId);
    let html = `
        <section class="editorial-section">
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

/* ═══════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   GISCUS COMMENTS
   ═══════════════════════════════════════════════════════ */
function initGiscusComments(articleTitle, articleAuthor) {
    const container = document.getElementById('giscus-container');
    if (!container) return;
    container.innerHTML = '';

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', window.location.href);

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'andrewveda/eclatineers');
    script.setAttribute('data-repo-id', 'R_kgDOTP7ILw');
    script.setAttribute('data-category', 'Announcements');
    script.setAttribute('data-category-id', 'DIC_kwDOTP7IL84DAruF');
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', `${articleTitle} — ${articleAuthor}`);
    script.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    script.crossOrigin = 'anonymous';
    script.async = true;

    container.appendChild(script);
}

/* ═══════════════════════════════════════════════════════
   NAVIGATION & MENU
   ═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   INITIALIZATION
   ═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    // Theme + font scale must be ready before first render
    initTheme();
    initFontScale();

    // Global theme toggle button
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleSiteTheme);

    // Menu toggle
    document.getElementById('navMenuBtn').addEventListener('click', () => {
        const menu = document.getElementById('mobileMenu');
        menu.classList.toggle('open');
        document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
    });

    document.getElementById('mobileMenuClose').addEventListener('click', () => {
        document.getElementById('mobileMenu').classList.remove('open');
        document.body.style.overflow = '';
    });

    // Back to top
    const btt = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
        btt.classList.toggle('show', window.pageYOffset > 400);
    });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    try {
        await loadAllData();
        document.getElementById('loader').classList.add('hidden');
        handleRouting();
    } catch (err) {
        console.error(err);
        displayApplicationError('Failed to capture database cells from your spreadsheet channel.');
    }
});

window.addEventListener('popstate', handleRouting);