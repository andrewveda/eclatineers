/* ═══════════════════════════════════════════
   A QUOTE A DAY — video-app.js
   Student Video Showcase (YouTube + Instagram)

   DATA SOURCE
   Reads .md files from a "videos" folder in the same
   GitHub repo as the quotes archive. One file per video.

   Expected frontmatter (filename e.g. 2024-05-01-priya.md):
   ---
   id: 1
   student: Priya Sharma
   department: English
   platform: youtube            (youtube | instagram)
   url: https://www.youtube.com/watch?v=dQw4w9WgXcQ
   quote: Optional line — the quote the video is about
   ---
═══════════════════════════════════════════ */

const VCONFIG = {
    REPO: "AndrewVeda/a-quote-a-day",
    DIR:  "videos",
};

let VDB        = [];
let vCurrent    = [];
let vDeckIdx    = 0;
let vCurrentTab = 'all';
let igScriptLoaded = false;

/* ─── MASTHEAD SCROLL ─── */
const vMasthead = document.getElementById('vidMasthead');
const V_COMPACT_THRESHOLD = 80;

window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (window.innerWidth < 768) {
        vMasthead.classList.toggle('vid-masthead--compact', y > V_COMPACT_THRESHOLD);
    } else {
        vMasthead.classList.remove('vid-masthead--compact');
    }
}, { passive: true });

window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) vMasthead.classList.remove('vid-masthead--compact');
}, { passive: true });

/* ─── KEYBOARD ─── */
document.addEventListener('keydown', e => {
    const overlay = document.getElementById('vidDeckOverlay');
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape')     closeVDeck();
    if (e.key === 'ArrowRight') moveVDeck(1);
    if (e.key === 'ArrowLeft')  moveVDeck(-1);
});

function moveVDeck(dir) {
    const next = vDeckIdx + dir;
    if (next < 0 || next >= vCurrent.length) return;
    vDeckIdx = next;
    updateVDeckPosition();
}

function closeVDeck() {
    document.getElementById('vidDeckOverlay').classList.remove('open');
    document.body.style.overflow = '';
    window.history.replaceState(null, null, window.location.pathname);
    // stop any playing youtube iframes by clearing the track
    document.getElementById('vidDeckTrack').innerHTML = '';
}

function vResetScroll() {
    window.scrollTo({ top: 0, behavior: 'instant' });
    vMasthead.classList.remove('vid-masthead--compact');
}

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', async () => {
    await fetchVideoArchive();
    setupVNavigation();
    setupVCompactMasthead();
    setupVSwipeEngine();
    setupVSearch();

    const urlParams = new URLSearchParams(window.location.search);
    const videoId   = urlParams.get('v');
    if (videoId) jumpToVideo(videoId);
});

/* ─── FETCH & PARSE ─── */
async function fetchVideoArchive() {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${VCONFIG.REPO}/contents/${VCONFIG.DIR}`
        );
        if (!response.ok) throw new Error('Network error');

        const files   = await response.json();
        const mdFiles = files.filter(f => f.name.endsWith('.md'));

        const promises = mdFiles.map(async (file, i) => {
            try {
                const raw = await fetch(file.download_url).then(r => r.text());
                return parseVEntry(raw, file.name, i + 1);
            } catch { return null; }
        });

        VDB = (await Promise.all(promises)).filter(Boolean);
        VDB.sort((a, b) => b.date - a.date);

        if (VDB.length === 0) throw new Error('Empty archive');

        document.getElementById('vidCount').innerText = `${VDB.length} Video${VDB.length === 1 ? '' : 's'}`;
        renderVGrid(VDB);

    } catch (err) {
        console.error('Video archive fetch error:', err);
        document.getElementById('vidMainContent').innerHTML = `
            <div class="vid-empty-state">
                <p>⚠️ Could not load videos.</p>
                <button onclick="location.reload()" style="margin-top:20px;padding:10px 24px;border:1px solid var(--gold-border);border-radius:30px;cursor:pointer;font-family:var(--sans);background:var(--gold);color:white;">
                    Retry
                </button>
            </div>`;
    } finally {
        const loader = document.getElementById('vidLoader');
        if (loader) loader.style.display = 'none';
    }
}

function parseVEntry(md, filename, fallbackId) {
    const match = md.match(/---([\s\S]*?)---/);
    if (!match) return null;

    const data = {};
    match[1].split('\n').forEach(line => {
        const i = line.indexOf(':');
        if (i !== -1) {
            data[line.substring(0,i).trim()] = line.substring(i+1).trim();
        }
    });

    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    const platform  = (data.platform || 'youtube').toLowerCase().trim();
    const url       = data.url || '';

    const entry = {
        id:         data.id || fallbackId,
        student:    data.student    || 'Anonymous',
        department: data.department || 'English',
        platform:   platform === 'instagram' ? 'instagram' : 'youtube',
        url:        url,
        quote:      data.quote || data.caption || '',
        date:       new Date(dateMatch ? dateMatch[1] : 0),
        dateStr:    dateMatch ? dateMatch[1] : 'Unknown',
    };

    if (entry.platform === 'youtube') {
        entry.youtubeId = extractYouTubeId(url);
        if (!entry.youtubeId) return null; // skip malformed entries
    }

    return entry;
}

/* ─── YOUTUBE ID EXTRACTION ─── */
function extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

/* ─── CARD BUILDER (shared by grid + grouped views) ─── */
function buildVCard(v, i) {
    const card = document.createElement('div');
    card.className = 'vid-card';
    card.style.animationDelay = `${Math.min(i * 40, 400)}ms`;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Video by ${v.student}`);

    let thumbHTML;
    if (v.platform === 'youtube') {
        thumbHTML = `<img class="vid-thumb-img" loading="lazy" src="https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg" alt="${v.student}'s video thumbnail">`;
    } else {
        thumbHTML = `
            <div class="vid-thumb-ig-fallback">
                <div class="vid-ig-glyph">◎</div>
                <div class="vid-ig-label">Instagram Reel</div>
            </div>`;
    }

    const badgeClass = v.platform === 'youtube' ? 'vid-badge-youtube' : 'vid-badge-instagram';
    const badgeLabel = v.platform === 'youtube' ? '▶ YouTube' : '◎ Instagram';

    card.innerHTML = `
        <div class="vid-thumb-wrap">
            ${thumbHTML}
            <div class="vid-platform-badge ${badgeClass}">${badgeLabel}</div>
            <div class="vid-play-btn">▶</div>
        </div>
        <div class="vid-card-info">
            <div class="vid-card-quote">${v.quote ? `"${v.quote.length > 70 ? v.quote.slice(0, 67) + '…' : v.quote}"` : ''}</div>
            <div class="vid-card-footer">
                <div>
                    <div class="vid-card-student">${v.student}</div>
                    <div class="vid-card-dept">${v.department}</div>
                </div>
                <div class="vid-card-arrow">→</div>
            </div>
        </div>
    `;
    return card;
}

/* ─── RENDER GRID ─── */
function renderVGrid(videos) {
    vCurrent = videos;
    const container = document.getElementById('vidMainContent');

    if (videos.length === 0) {
        container.innerHTML = '<p class="vid-no-results">No videos found.</p>';
        return;
    }

    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'vid-results-header';
    header.textContent = `${videos.length} ${videos.length === 1 ? 'Video' : 'Videos'}`;
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'vid-grid';

    videos.forEach((v, i) => {
        const card = buildVCard(v, i);
        card.addEventListener('click', () => openVDeck(videos, i));
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openVDeck(videos, i); });
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

/* ─── GROUPED GRID (Students / Departments) ─── */
function renderVGroupedGrid(groupBy) {
    const container = document.getElementById('vidMainContent');
    container.innerHTML = '';

    const index = {};
    VDB.forEach(item => {
        const key = item[groupBy] || 'Other';
        if (!index[key]) index[key] = [];
        index[key].push(item);
    });

    const sorted = Object.keys(index).sort((a, b) => index[b].length - index[a].length);

    sorted.forEach(groupName => {
        const groupVideos = index[groupName];
        const section = document.createElement('div');
        section.className = 'vid-dept-section';

        const heading = document.createElement('div');
        heading.className = 'vid-dept-heading';
        heading.innerHTML = `
            <span class="vid-dept-heading-name">${groupName}</span>
            <span class="vid-dept-heading-count">${groupVideos.length} ${groupVideos.length === 1 ? 'video' : 'videos'}</span>
        `;
        section.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'vid-grid';

        groupVideos.forEach((v, i) => {
            const card = buildVCard(v, i);
            card.addEventListener('click', () => openVDeck(groupVideos, i));
            card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openVDeck(groupVideos, i); });
            grid.appendChild(card);
        });

        section.appendChild(grid);
        container.appendChild(section);
    });
}

/* ─── SEARCH ─── */
function setupVSearch() {
    const input = document.getElementById('vidSearchInput');
    let debounceTimer;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const q = input.value.trim().toLowerCase();
            if (!q) {
                if (vCurrentTab === 'all') renderVGrid(VDB);
                return;
            }
            const filtered = VDB.filter(item =>
                item.student.toLowerCase().includes(q) ||
                item.department.toLowerCase().includes(q) ||
                (item.quote || '').toLowerCase().includes(q)
            );
            renderVGrid(filtered);
        }, 220);
    });
}

/* ─── NAVIGATION ─── */
function setupVNavigation() {
    document.querySelectorAll('.vid-quick-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            vCurrentTab = tab;

            vResetScroll();

            document.getElementById('vidSearchInput').value = '';
            document.querySelectorAll('.vid-quick-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (tab === 'all') {
                renderVGrid(VDB);
            } else if (tab === 'departments') {
                renderVGroupedGrid('department');
            } else if (tab === 'students') {
                openVDirectory('students');
            }
        });
    });

    document.getElementById('vidDeckClose').addEventListener('click', closeVDeck);
    document.getElementById('vidArrowPrev').addEventListener('click', () => moveVDeck(-1));
    document.getElementById('vidArrowNext').addEventListener('click', () => moveVDeck(1));
    document.getElementById('vidDirClose').addEventListener('click', closeVDirectory);
    document.getElementById('vidDirBackdrop').addEventListener('click', closeVDirectory);
    document.getElementById('vidDeckOverlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeVDeck();
    });
}

/* ─── DIRECTORY (Students) ─── */
function openVDirectory(category) {
    const list = document.getElementById('vidDirList');
    list.innerHTML = '';
    document.getElementById('vidDirTitle').innerText = 'Students';

    const index = {};
    VDB.forEach(item => {
        const key = item.student;
        if (!index[key]) index[key] = [];
        index[key].push(item);
    });

    Object.keys(index)
        .sort((a, b) => index[b].length - index[a].length)
        .forEach(name => {
            const row = document.createElement('div');
            row.className = 'vid-dir-row';
            row.innerHTML = `
                <span class="vid-dir-row-name">${name}</span>
                <span class="vid-dir-badge">${index[name].length}</span>
            `;
            row.addEventListener('click', () => {
                renderVGrid(index[name]);
                closeVDirectory();
                vResetScroll();
            });
            list.appendChild(row);
        });

    document.getElementById('vidDirPanel').classList.add('open');
    document.getElementById('vidDirBackdrop').classList.add('open');
}

function closeVDirectory() {
    document.getElementById('vidDirPanel').classList.remove('open');
    document.getElementById('vidDirBackdrop').classList.remove('open');
}

/* ─── OPEN DECK ─── */
function openVDeck(videos, startIdx) {
    vCurrent = videos;
    vDeckIdx = startIdx;

    const track = document.getElementById('vidDeckTrack');
    track.innerHTML = '';

    videos.forEach((v, i) => {
        const slide = document.createElement('div');
        slide.className = 'vid-deck-slide';

        const embedBoxClass = v.platform === 'instagram' ? 'vid-embed-box vid-embed-16x9' : 'vid-embed-box';
        const externalUrl = v.url;
        const externalLabel = v.platform === 'youtube' ? 'Watch on YouTube ↗' : 'Watch on Instagram ↗';

        slide.innerHTML = `
            <div class="vid-player-wrap">
                <div class="${embedBoxClass}" id="vid-embed-${i}" data-loaded="false" data-idx="${i}">
                    <div class="vid-embed-placeholder">
                        <div class="vid-spin"></div>
                        <span>Loading Video…</span>
                    </div>
                </div>
                <div class="vid-info-card">
                    <div class="vid-info-kicker">Video · ${v.dateStr}</div>
                    ${v.quote ? `<div class="vid-info-quote">"${v.quote}"</div>` : ''}
                    <div class="vid-info-divider"></div>
                    <div class="vid-info-student">${v.student}</div>
                    <div class="vid-info-dept">${v.department}</div>
                    <a href="${externalUrl}" target="_blank" rel="noopener" class="vid-external-link">${externalLabel}</a>
                </div>
            </div>
        `;
        track.appendChild(slide);
    });

    document.getElementById('vidDeckOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    updateVDeckPosition(false);
}

/* ─── LAZY LOAD EMBED (only current + adjacent slides) ─── */
function loadVEmbed(idx) {
    if (idx < 0 || idx >= vCurrent.length) return;
    const box = document.getElementById(`vid-embed-${idx}`);
    if (!box || box.dataset.loaded === 'true') return;

    const v = vCurrent[idx];
    box.dataset.loaded = 'true';

    if (v.platform === 'youtube') {
        box.innerHTML = `<iframe
            src="https://www.youtube.com/embed/${v.youtubeId}?rel=0&modestbranding=1"
            title="${v.student}'s video"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            loading="lazy"></iframe>`;
    } else {
        box.innerHTML = `<div class="vid-ig-embed-wrap" id="vid-ig-mount-${idx}"></div>`;
        loadInstagramEmbed(v.url, `vid-ig-mount-${idx}`);
    }
}

function loadInstagramEmbed(url, mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    mount.innerHTML = `<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="margin:0;width:100%;"></blockquote>`;

    const process = () => { if (window.instgrm) window.instgrm.Embeds.process(); };

    if (igScriptLoaded) {
        process();
    } else {
        const existing = document.getElementById('ig-embed-script');
        if (existing) {
            existing.addEventListener('load', () => { igScriptLoaded = true; process(); });
        } else {
            const script = document.createElement('script');
            script.id = 'ig-embed-script';
            script.src = 'https://www.instagram.com/embed.js';
            script.async = true;
            script.onload = () => { igScriptLoaded = true; process(); };
            document.body.appendChild(script);
        }
    }
}

/* ─── UPDATE DECK POSITION ─── */
function updateVDeckPosition(animate = true) {
    const track = document.getElementById('vidDeckTrack');
    if (!track) return;

    track.style.transition = animate
        ? 'transform 0.42s cubic-bezier(0.23, 1, 0.32, 1)'
        : 'none';
    track.style.transform = `translateX(${-vDeckIdx * 100}vw)`;

    const counter = document.getElementById('vidDeckCounter');
    if (counter) counter.innerText = `${vDeckIdx + 1} / ${vCurrent.length}`;

    const prev = document.getElementById('vidArrowPrev');
    const next = document.getElementById('vidArrowNext');
    if (prev) prev.disabled = vDeckIdx === 0;
    if (next) next.disabled = vDeckIdx === vCurrent.length - 1;

    const wrap = document.getElementById('vidDeckProgressWrap');
    if (wrap) {
        const total   = vCurrent.length;
        const maxDots = Math.min(total, 7);
        wrap.innerHTML = '';
        for (let i = 0; i < maxDots; i++) {
            const dot = document.createElement('div');
            dot.className = 'vid-progress-dot' + (i === Math.min(vDeckIdx, maxDots - 1) ? ' active' : '');
            wrap.appendChild(dot);
        }
    }

    const v = vCurrent[vDeckIdx];
    if (v) window.history.replaceState(null, null, `?v=${v.id}`);

    // Lazy-load current slide now, and preload the next one for smoother swiping
    loadVEmbed(vDeckIdx);
    loadVEmbed(vDeckIdx + 1);
}

/* ─── SWIPE ENGINE ─── */
function setupVSwipeEngine() {
    let startX = 0, dist = 0, dragging = false;
    const area = document.getElementById('vidDeckOverlay');

    area.addEventListener('touchstart', e => {
        startX   = e.touches[0].clientX;
        dragging = true;
    }, { passive: true });

    area.addEventListener('touchmove', e => {
        if (!dragging) return;
        dist = e.touches[0].clientX - startX;
    }, { passive: true });

    area.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging = false;
        if (Math.abs(dist) > 70) moveVDeck(dist < 0 ? 1 : -1);
        dist = 0;
    });
}

/* ─── JUMP TO VIDEO (deep link via ?v=id) ─── */
function jumpToVideo(id) {
    const found = VDB.find(v => String(v.id) === String(id));
    if (found) openVDeck(VDB, VDB.indexOf(found));
}

/* ─── COMPACT MASTHEAD (mobile) ─── */
function setupVCompactMasthead() {
    const compactSearchBtn   = document.getElementById('vidCompactSearchBtn');
    const compactSearchBar   = document.getElementById('vidCompactSearchBar');
    const compactSearchInput = document.getElementById('vidCompactSearchInput');
    const mainSearchInput    = document.getElementById('vidSearchInput');
    const filterBtn          = document.getElementById('vidCompactFilterBtn');
    const sheetBackdrop      = document.getElementById('vidFilterSheetBackdrop');
    const sheetTabs          = document.getElementById('vidFilterSheetTabs');

    compactSearchBtn.addEventListener('click', () => {
        const isOpen = compactSearchBar.classList.toggle('open');
        if (isOpen) {
            compactSearchInput.focus();
        } else {
            compactSearchInput.value = '';
            mainSearchInput.value = '';
            mainSearchInput.dispatchEvent(new Event('input'));
        }
    });

    compactSearchInput.addEventListener('input', () => {
        mainSearchInput.value = compactSearchInput.value;
        mainSearchInput.dispatchEvent(new Event('input'));
    });

    filterBtn.addEventListener('click', () => {
        sheetBackdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
    });

    sheetBackdrop.addEventListener('click', e => {
        if (e.target === sheetBackdrop) closeVFilterSheet();
    });

    function closeVFilterSheet() {
        sheetBackdrop.classList.remove('open');
        document.body.style.overflow = '';
    }

    sheetTabs.addEventListener('click', e => {
        const btn = e.target.closest('.vid-filter-sheet-tab');
        if (!btn) return;
        const tab = btn.dataset.tab;
        sheetTabs.querySelectorAll('.vid-filter-sheet-tab').forEach(b =>
            b.classList.toggle('active', b === btn)
        );
        const mainTab = document.querySelector(`.vid-quick-tab[data-tab="${tab}"]`);
        if (mainTab) mainTab.click();
        closeVFilterSheet();
    });

    document.querySelectorAll('.vid-quick-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if (sheetTabs) {
                sheetTabs.querySelectorAll('.vid-filter-sheet-tab').forEach(b =>
                    b.classList.toggle('active', b.dataset.tab === tab)
                );
            }
        });
    });
}