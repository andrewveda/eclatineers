// ═══════════════════════════════════════════════════════
// CONFIGURATION — Change only this section
// ═══════════════════════════════════════════════════════
const CONFIG = {
    // Paste your Google Sheet ID here
    SHEET_ID: '1CnPHtSxSDl3EvsfewstH2ZPHG78nrnJ1ARmOQkrjWNs',

    // Tab names (must match exactly)
    SHEETS: {
        ISSUES: 'Issues',
        ARTICLES: 'Articles',
        PATRONS: 'Patrons',
        EDITORIAL: 'Editorial'
    },

    // Website info
    COLLEGE: 'SRM Valliammai Engineering College',
    DEPARTMENT: 'Department of English',
    WEBSITE: 'https://www.eclatineers.in/',
    FOOTER_NOTE: 'For private circulation only'
};

// ═══════════════════════════════════════════════════════
// DATA LAYER
// ═══════════════════════════════════════════════════════
const Cache = { issues: null, articles: null, patrons: null, editorial: null };

async function fetchSheet(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${sheetName}`);
    const text = await res.text();
    const jsonStr = text.replace(/\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\(/, '').replace(/\);?\s*$/, '');
    const data = JSON.parse(jsonStr);
    const cols = data.table.cols.map(c => c.label.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    return data.table.rows.map(row => {
        const obj = {};
        cols.forEach((col, i) => { obj[col] = row.c[i]?.v ?? ''; });
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

function getIssue(id) { return Cache.issues.find(i => i.id === id); }
function getArticles(issueId) { return Cache.articles.filter(a => a.issueid === issueId).sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0)); }
function getArticle(issueId, slug) { return Cache.articles.find(a => a.issueid === issueId && a.slug === slug); }
function getPatrons(issueId) { return Cache.patrons.filter(p => p.issueid === issueId); }
function getEditorial(issueId) { return Cache.editorial.filter(e => e.issueid === issueId); }

// ═══════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════
function getParams() {
    const p = new URLSearchParams(window.location.search);
    return { issue: p.get('issue'), article: p.get('article'), section: p.get('section') };
}

function navigate(params) {
    const q = new URLSearchParams();
    if (params.issue) q.set('issue', params.issue);
    if (params.article) q.set('article', params.article);
    if (params.section) q.set('section', params.section);
    window.location.search = q.toString();
}

// ═══════════════════════════════════════════════════════
// CONTENT PARSER — Converts plain-text markers to HTML
// ═══════════════════════════════════════════════════════
function parseContent(text, category) {
    if (!text) return '';

    // Riddles
    if (category === 'Riddles') return parseRiddles(text);

    // Cryptic Clues
    if (category && category.includes('Cryptic')) return parseCryptic(text);

    let html = '';
    const blocks = text.split('\n\n').map(b => b.trim()).filter(Boolean);
    let inBox = false;

    blocks.forEach(block => {
        // Image with caption
        if (block.startsWith('!') && block.includes(':')) {
            if (inBox) { html += '</div>'; inBox = false; }
            const parts = block.substring(1).split(':');
            const caption = parts[0].trim();
            const src = parts.slice(1).join(':').trim();
            html += `<div class="article-image"><img src="${escHtml(src)}" alt="${escHtml(caption)}" loading="lazy"><div class="image-caption">${escHtml(caption)}</div></div>`;
            return;
        }

        // Pull quote
        if (block.startsWith('>>')) {
            if (inBox) { html += '</div>'; inBox = false; }
            const quote = block.slice(2).trim();
            html += `<div class="article-quote">${escHtml(quote)}</div>`;
            return;
        }

        // Highlight box
        if (block.startsWith('##')) {
            if (inBox) { html += '</div>'; inBox = false; }
            const title = block.slice(2).trim();
            html += `<div class="highlight-box"><h3>${escHtml(title)}</h3>`;
            inBox = true;
            return;
        }

        // List items inside box
        if (inBox && block.startsWith('- ')) {
            const items = block.split('\n').filter(l => l.trim().startsWith('- '));
            html += '<ul>' + items.map(i => `<li>${escHtml(i.trim().slice(2))}</li>`).join('') + '</ul>';
            return;
        }

        // Close box if next block isn't a list
        if (inBox) {
            html += '</div>';
            inBox = false;
        }

        // Regular paragraph
        const formatted = escHtml(block).replace(/\n/g, '<br>');
        html += `<p>${formatted}</p>`;
    });

    if (inBox) html += '</div>';
    return html;
}

function parseRiddles(text) {
    const blocks = text.split('>>').map(b => b.trim()).filter(Boolean);
    let html = '';
    let idx = 0;
    blocks.forEach(block => {
        if (block.startsWith('??')) {
            const question = block.slice(2).trim().replace(/\n/g, '<br>');
            html += `
                <div class="riddle-card">
                    <div class="riddle-text">${question}</div>
                    <button class="riddle-btn" onclick="toggleRiddle(this)">Reveal Answer</button>
                    <div class="riddle-answer">${escHtml(block)}</div>
                </div>`;
        } else {
            // This is the answer — attach to previous card
            const cards = document.querySelectorAll('.riddle-card');
            if (cards.length > 0) {
                const lastCard = cards[cards.length - 1];
                const answerDiv = lastCard.querySelector('.riddle-answer');
                if (answerDiv) answerDiv.textContent = block;
            }
        }
        idx++;
    });

    // Re-parse properly
    html = '';
    const parts = text.split(/\?\?(.+?)(?=\?\?|$)/gs).filter(Boolean);
    // Simpler approach: split by >>
    const qas = text.split('>>');
    qas.forEach((qa, i) => {
        const q = qa.trim();
        if (!q) return;
        if (q.startsWith('??')) {
            const question = q.slice(2).trim().replace(/\n/g, '<br>');
            const answer = qas[i + 1] ? qas[i + 1].trim() : '...';
            html += `
                <div class="riddle-card">
                    <div class="riddle-text">${question}</div>
                    <button class="riddle-btn" onclick="toggleRiddle(this)">Reveal Answer</button>
                    <div class="riddle-answer">${escHtml(answer)}</div>
                </div>`;
        }
    });
    return html;
}

function parseCryptic(text) {
    const lines = text.split('\n').filter(l => l.trim().startsWith('!!'));
    let html = '<div style="display:grid;gap:15px;">';
    lines.forEach(line => {
        const clean = line.slice(2).trim();
        const parts = clean.split(':');
        if (parts.length >= 3) {
            const num = parts[0].trim();
            const clue = parts[1].trim();
            const hint = parts[2].trim();
            html += `
                <div class="clue-card">
                    <div class="clue-number">Clue ${num}</div>
                    <div class="clue-text">${escHtml(clue)}</div>
                    <div class="clue-hint">Hint: ${escHtml(hint)}</div>
                </div>`;
        }
    });
    html += '</div>';
    return html;
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Global function for riddle toggle
window.toggleRiddle = function(btn) {
    const answer = btn.nextElementSibling;
    answer.classList.toggle('show');
    btn.textContent = answer.classList.contains('show') ? 'Hide Answer' : 'Reveal Answer';
};

// ═══════════════════════════════════════════════════════
// RENDERERS
// ═══════════════════════════════════════════════════════
function renderHomePage() {
    const issues = Cache.issues;
    let html = `
        <header class="header">
            <div class="container">
                <div class="college-name">${CONFIG.COLLEGE}</div>
                <h1 class="magazine-title">Eclatineers</h1>
                <div class="ornament"><div class="ornament-line"></div><div class="ornament-diamond"></div><div class="ornament-line"></div></div>
                <div class="magazine-subtitle">${CONFIG.DEPARTMENT}</div>
            </div>
        </header>
        <section class="issues-section">
            <div class="container">
                <h2 class="section-title">All Issues</h2>`;

    issues.forEach(issue => {
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

    html += `</div></section>${renderFooter()}`;
    document.getElementById('app').innerHTML = html;
    showNav(false);
    window.scrollTo(0, 0);
}

function renderIssuePage(issueId) {
    const issue = getIssue(issueId);
    if (!issue) { showError('Issue not found'); return; }

    const articles = getArticles(issueId);
    const imgSrc = issue.cover || `https://picsum.photos/seed/${issue.id}/800/560.jpg`;

    let html = `
        <header class="header">
            <div class="container">
                <div class="college-name">${CONFIG.COLLEGE}</div>
                <h1 class="magazine-title">${escHtml(issue.title)}</h1>
                <div class="ornament"><div class="ornament-line"></div><div class="ornament-diamond"></div><div class="ornament-line"></div></div>
                <div class="magazine-subtitle">${CONFIG.DEPARTMENT}</div>
                <div class="issue-info">${escHtml(issue.date)} Issue</div>
            </div>
        </header>
        <section class="cover-section">
            <div class="container">
                <div class="cover-image-container">
                    <img src="${escHtml(imgSrc)}" alt="Cover" class="cover-image" loading="lazy">
                </div>
            </div>
        </section>`;

    // About
    if (issue.about) {
        html += `
        <section class="intro-section">
            <div class="container">
                <p class="intro-text">${escHtml(issue.about)}</p>
                <div class="definition-box">
                    <div class="definition-term">Eclatineers</div>
                    <div class="definition-pronunciation">/ˌek-lə-ˈnīrz/ (rhymes with Engineers!)</div>
                    <div class="definition-text">A fusion of éclat and engineers, symbolizing a brilliant expression of technical and creative excellence!</div>
                </div>
            </div>
        </section>`;
    }

    // TOC
    html += `<section class="toc-section"><div class="container"><h2 class="section-title">In This Issue</h2><ul class="toc-list">`;
    articles.forEach((art, i) => {
        const num = String(i + 1).padStart(2, '0');
        html += `
            <li class="toc-item">
                <a class="toc-link" href="?issue=${issueId}&article=${art.slug}">
                    <div class="toc-number">${num}</div>
                    <div class="toc-content">
                        <div class="toc-title">${escHtml(art.title)}</div>
                        <div class="toc-meta">${escHtml(art.author).toUpperCase()} • ${escHtml(art.category).toUpperCase()}</div>
                    </div>
                    <div class="toc-arrow">→</div>
                </a>
            </li>`;
    });

    // Extra sections
    html += `
            <li class="toc-item">
                <a class="toc-link" href="?issue=${issueId}&section=patrons">
                    <div class="toc-number">✦</div>
                    <div class="toc-content">
                        <div class="toc-title">Our Patrons</div>
                        <div class="toc-meta">LEADERSHIP</div>
                    </div>
                    <div class="toc-arrow">→</div>
                </a>
            </li>
            <li class="toc-item">
                <a class="toc-link" href="?issue=${issueId}&section=editorial">
                    <div class="toc-number">✦</div>
                    <div class="toc-content">
                        <div class="toc-title">Editorial Board</div>
                        <div class="toc-meta">THE TEAM</div>
                    </div>
                    <div class="toc-arrow">→</div>
                </a>
            </li>`;
    html += `</ul></div></section>${renderFooter()}`;

    document.getElementById('app').innerHTML = html;
    showNav(true, issue.title, '?');
    buildMobileMenu(issueId, articles);
    window.scrollTo(0, 0);
}

function renderArticlePage(issueId, slug) {
    const article = getArticle(issueId, slug);
    if (!article) { showError('Article not found'); return; }

    const isPoetry = ['Poetry', 'Poetry & Cryptic Clues', 'Lines & Lenses'].includes(article.category);
    const contentHtml = parseContent(article.content, article.category);

    let html = `
        <section class="article-section" style="padding-top:60px;">
            <div class="container">
                <div class="article-category">${escHtml(article.category)}</div>
                <h2 class="article-title">${escHtml(article.title)}</h2>
                <div class="article-author">
                    <div class="author-avatar">${escHtml(article.authorinitials || article.author.charAt(0))}</div>
                    <div class="author-info">
                        <div class="author-name">${escHtml(article.author)}</div>
                        ${article.authorbio ? `<div class="author-bio">${escHtml(article.authorbio)}</div>` : ''}
                    </div>
                </div>
                ${isPoetry ? `<div class="poetry-content">${contentHtml}</div>` : `<div class="article-content">${contentHtml}</div>`}
            </div>
        </section>`;

    // Pull quote at top if exists
    if (article.pullquote) {
        const quoteBlock = `<div class="article-quote">${escHtml(article.pullquote)}</div>`;
        html = html.replace('<div class="article-author">', quoteBlock + '<div class="article-author">');
    }

    html += renderFooter();
    document.getElementById('app').innerHTML = html;
    showNav(true, article.title, `?issue=${issueId}`);
    buildMobileMenu(issueId, getArticles(issueId));
    window.scrollTo(0, 0);
}

function renderPatronsPage(issueId) {
    const patrons = getPatrons(issueId);
    let html = `
        <section class="patrons-section" style="padding-top:60px;">
            <div class="container">
                <h2 class="section-title">Our Patrons</h2>`;
    patrons.forEach(p => {
        html += `
                <div class="patron-card">
                    <div class="patron-avatar">${escHtml(p.initials || p.name.charAt(0))}</div>
                    <div class="patron-name">${escHtml(p.name)}</div>
                    <div class="patron-title">${escHtml(p.title)}</div>
                    <div class="patron-bio">${escHtml(p.bio)}</div>
                </div>`;
    });
    html += `</div></section>${renderFooter()}`;
    document.getElementById('app').innerHTML = html;
    showNav(true, 'Our Patrons', `?issue=${issueId}`);
    buildMobileMenu(issueId, getArticles(issueId));
    window.scrollTo(0, 0);
}

function renderEditorialPage(issueId) {
    const editorial = getEditorial(issueId);
    let html = `
        <section class="editorial-section" style="padding-top:60px;">
            <div class="container">
                <h2 class="section-title">Editorial Board</h2>
                <div class="editorial-grid">`;
    editorial.forEach(e => {
        html += `
                    <div class="editor-card">
                        <div class="editor-avatar">${escHtml(e.initials || e.name.charAt(0))}</div>
                        <div class="editor-name">${escHtml(e.name)}</div>
                        <div class="editor-role">${escHtml(e.role)}</div>
                    </div>`;
    });
    html += `</div>
                <div style="margin-top:30px;text-align:center;font-family:'Montserrat',sans-serif;font-size:11px;color:var(--text-light);font-style:italic;">${CONFIG.FOOTER_NOTE}</div>
            </div>
        </section>${renderFooter()}`;
    document.getElementById('app').innerHTML = html;
    showNav(true, 'Editorial Board', `?issue=${issueId}`);
    buildMobileMenu(issueId, getArticles(issueId));
    window.scrollTo(0, 0);
}

function renderFooter() {
    return `
        <footer class="footer">
            <div class="container">
                <div class="footer-logo">Eclatineers</div>
                <div class="footer-tagline">Visible éclat. Invisible engineer.</div>
                <div class="footer-ornament"></div>
                <div class="footer-links">
                    <a href="?" class="footer-link">Home</a>
                    <a href="${CONFIG.WEBSITE}" class="footer-link" target="_blank">Website</a>
                </div>
                <div class="footer-copyright">© ${new Date().getFullYear()} ${CONFIG.COLLEGE}<br>${CONFIG.DEPARTMENT}</div>
            </div>
        </footer>`;
}

// ═══════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════
function showNav(visible, title, backUrl) {
    const nav = document.getElementById('navBar');
    const navTitle = document.getElementById('navTitle');
    const navBack = document.getElementById('navBack');
    if (visible) {
        nav.classList.add('show');
        navTitle.textContent = title || 'Eclatineers';
        navBack.href = backUrl || '?';
    } else {
        nav.classList.remove('show');
    }
}

function buildMobileMenu(issueId, articles) {
    const list = document.getElementById('mobileMenuList');
    let html = `<li class="mobile-menu-sep">Contents</li>
        <li class="mobile-menu-item"><a class="mobile-menu-link" href="?issue=${issueId}">← Back to Issue</a></li>`;
    articles.forEach(art => {
        html += `<li class="mobile-menu-item"><a class="mobile-menu-link" href="?issue=${issueId}&article=${art.slug}">${escHtml(art.title)}</a></li>`;
    });
    html += `<li class="mobile-menu-sep">More</li>
        <li class="mobile-menu-item"><a class="mobile-menu-link" href="?issue=${issueId}&section=patrons">Our Patrons</a></li>
        <li class="mobile-menu-item"><a class="mobile-menu-link" href="?issue=${issueId}&section=editorial">Editorial Board</a></li>
        <li class="mobile-menu-item"><a class="mobile-menu-link" href="?">All Issues</a></li>`;
    list.innerHTML = html;

    // Re-bind close
    list.querySelectorAll('.mobile-menu-link').forEach(link => {
        link.addEventListener('click', () => {
            document.getElementById('mobileMenu').classList.remove('open');
            document.body.style.overflow = '';
        });
    });
}

function showError(msg) {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('errorMsg').textContent = msg;
    document.getElementById('errorScreen').classList.add('show');
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    // Mobile menu buttons
    document.getElementById('navMenuBtn').addEventListener('click', () => {
        document.getElementById('mobileMenu').classList.add('open');
        document.body.style.overflow = 'hidden';
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

    // Load data and route
    try {
        await loadAllData();
        document.getElementById('loader').classList.add('hidden');

        const { issue, article, section } = getParams();

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
    } catch (err) {
        console.error(err);
        showError('Could not load magazine data. Please check your internet connection and try again.');
    }
});
