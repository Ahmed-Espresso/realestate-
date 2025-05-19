import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue , get} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import Fuse from "https://cdn.jsdelivr.net/npm/fuse.js/dist/fuse.esm.js";
import { initI18n, setLanguage, applyTranslations, translations } from './i18n.js';

// ─────────── Notification Helper ───────────
function showErrorToast(msg) {
  const t = document.getElementById('global-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 3000);
}

// ————— Firebase Init —————
const firebaseConfig = {
  apiKey: "AIzaSyAtqvEzoqQoCtHS_wvc5mAzb5WKOW1MaeI",
  databaseURL: "https://realestate-d4e29-default-rtdb.firebaseio.com",
  projectId: "realestate-d4e29",
  storageBucket: "realestate-d4e29.appspot.com",
  messagingSenderId: "341854632202",
  appId: "1:341854632202:web:7666024e83d2b9c94962f3"
};
const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);  

// ————— Global State —————
let welcomeMessage = "";
let typingTimer    = null;
let currentPromo   = null;
let currentBot     = {};
let currentContacts= {};
let currentProjects= {};
let currentQC      = {}; 
let qcSettings = {};  
let currentAbout   = {};
let currentCategories = {};
let fuseBot,
    welcomeButtons = [],
    isListening    = false,
    voiceAsked     = false;

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

// ————— Helper Functions ————
function currentLang() {
  return document.documentElement.lang || 'ar';
}
function getLocalizedText(obj) {
  const lang = currentLang();
  if (!obj) return '';
  return typeof obj === 'object' ? (obj[lang] || obj.ar) : obj;
}
function getCategoryName(categoryKey, lang) {
  const category = currentCategories[categoryKey];
  return category?.name[lang] || category?.name.ar || 'غير مصنف';
}
// ————— Helpers for Search —————
function updateCategoryOptions() {
  const select = document.getElementById('propertyType');
  const lang = currentLang();
  const allLabel = translations.all?.[lang]
    || (lang === 'ar' ? 'الكل' : 'All');

  select.innerHTML = `<option value="all">${allLabel}</option>`;
    Object.entries(currentCategories).forEach(([key, category]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = getCategoryName(key, lang);
    select.appendChild(option);
  });
}
// ————— Load Translations —————
async function loadTranslations() {
  try {
    const transRef = ref(db, 'translations');
    const snapshot = await get(transRef);
    if (snapshot.exists()) {
      Object.assign(translations, snapshot.val());
      applyTranslations(); 
    }
  } catch (error) {
    console.error("Error loading translations:", error);
  }
}

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

function showSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.classList.remove('hidden');
  }
}

function hideSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  window.scrollTo({ top: 0, behavior: 'auto' });
 
  showSpinner();
  initI18n();
  await loadTranslations();
  setLanguage(localStorage.getItem('lang') || 'ar');

  document.getElementById('language-toggle')
    .addEventListener('click', () => {
      setLanguage(document.documentElement.lang === 'ar' ? 'en' : 'ar');
    });

  document.addEventListener('languageChanged', async () => {
  renderWelcome(currentPromo?.welcomeMessage);
  loadAboutContent(currentAbout);
  renderContactCards(currentContacts);
  renderPortfolio(currentProjects);
  setupChatBot(currentBot);
  initQuickContact(qcSettings);
  updateCategoryOptions(); 
});

loadInitialData();
showHomeSection();

  (function() {
    const navbar = document.getElementById('navsec');
    let lastScrollY = window.pageYOffset;
    window.addEventListener('scroll', () => {
      const currentY = window.pageYOffset;
      if (currentY <= 0) {
        navbar.classList.remove('hide', 'show');
      } else if (currentY > lastScrollY) {
        navbar.classList.add('hide');
        navbar.classList.remove('show');
      } else {
        navbar.classList.add('show');
        navbar.classList.remove('hide');
      }
      lastScrollY = currentY;
    });
  })();

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('section').forEach(sec => {
    sectionObserver.observe(sec);
  });

  document.getElementById('toggle-home-btn')
    .addEventListener('click', showHomeSection);
  document.getElementById('toggle-projects-btn')
    .addEventListener('click', showProjectsSection);
});

// ————— Load Data —————
function loadInitialData() {
  try {
    onValue(ref(db, 'welcomeMessage'), snap => {
      currentPromo = { welcomeMessage: snap.val() };
      renderWelcome(currentPromo.welcomeMessage);
      hideSpinner();
    });
  } catch (e) { 
    console.error('welcomeMessage load error', e);
    showErrorToast('فشل تحميل الترحيب'); 
  }
  try {
    onValue(ref(db, 'aboutUs'), snap => {
      currentAbout = snap.val() || {};
      loadAboutContent(currentAbout);
      hideSpinner();
    });
  } catch (e) { 
    console.error('aboutUs load error', e);
    showErrorToast('فشل تحميل من انا'); 
  }
  try {
    onValue(ref(db, 'contactInfo'), snap => {
      currentContacts = snap.val() || {};
      renderContactCards(currentContacts);
      hideSpinner();
    });
  } catch (e) { 
    console.error('contactInfo load error', e);
    showErrorToast('فشل تحميل التواصل'); 
  }
  try {
    onValue(ref(db, 'botResponses'), snap => {
      currentBot = snap.val() || {};
      setupChatBot(currentBot);
      hideSpinner();
    });
  } catch (e) { 
    console.error('botResponses load error', e);
    showErrorToast('فشل تحميل الروبوت'); 
  }
  try {
    onValue(ref(db, 'quickContact'), snap => {
      qcSettings = snap.val() || {};
      initQuickContact(qcSettings);
      hideSpinner();
    });
  } catch (e) { 
    console.error('quickContact load error', e);
    showErrorToast('فشل تحميل التواصل السريع'); 
  }
  try {
    onValue(ref(db, 'projects'), snap => {
      currentProjects = snap.val() || {};
      initSearch();
      renderPortfolio(currentProjects);
      hideSpinner();
    });
  } catch (e) { 
    console.error('projects load error', e);
    showErrorToast('فشل تحميل المشاريع'); 
  }
  try {
    const transRef = ref(db, 'translations');
    onValue(transRef, (snap) => {
      loadTranslations()
        .then(() => {
          applyTranslations();
          
          if (currentBot && Object.keys(currentBot).length > 0) {
            setupChatBot(currentBot);
          }
          
          document.dispatchEvent(new Event('languageChanged'));
        })
        .catch(e => {
          console.error('Translations reload error:', e);
          showErrorToast('فشل تحديث الترجمات');
        });
    });
  } catch (e) {
    console.error('translations listener error', e);
    showErrorToast('فشل متابعة الترجمة');
  }
}

// ————— ChatBot Functions —————
function setupChatBot(responses) {
  const lang = currentLang();
  welcomeButtons = Object.values(responses)
    .filter(r => r.category === 'welcome')
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .slice(0, 4)
    .map(r => ({
      raw: r,
      question: typeof r.question === 'object' 
        ? r.question[lang] || r.question.ar 
        : r.question
    }));

  const list = Object.values(responses).map(r => ({
    question: typeof r.question === 'object' 
      ? r.question[lang] || r.question.ar 
      : r.question,
    response: r.response,
    keywords: r.keywords || []
  }));
  
  fuseBot = new Fuse(list, { 
    keys: ['question', 'keywords'], 
    threshold: 0.3,
    includeScore: true
  });

  showWelcomeMessage();
  initVoiceRecognition();
}

function showWelcomeMessage() {
  const box = document.getElementById('chatBox');
  if (!box) return;
  
  const lang = currentLang();
  const greeting = translations.botwelcm?.[lang] || 'مرحباً!';
  const prompt = translations.botwelcm2?.[lang] || 'كيف يمكنني مساعدتك؟';
  
  box.innerHTML = `
    <div class="message bot">
      <h3>${greeting}</h3>
      <p>${prompt}</p>
      <div class="examples">
        ${welcomeButtons.map(b => `
          <button class="welcome-btn" 
                  onclick="handleBotButton('${b.question.replace(/'/g, "\\'")}')">
            ${b.question}
          </button>`
        ).join('')}
      </div>
    </div>`;
  applyTranslations(); 
}

window.handleBotButton = q => {
  document.getElementById('userInput').value = q;
  sendBotMessage();
};

function initVoiceRecognition() {
  recognition.lang = 'ar-SA';
  recognition.continuous = false;
  recognition.interimResults = false;
  
  recognition.onresult = e => {
    document.getElementById('userInput').value = e.results[0][0].transcript;
    voiceAsked = true;
    sendBotMessage();
    isListening = false;
  };

  const voiceBtn = document.getElementById('voice-btn');
  if (!voiceBtn) return;  // حارس بسيط

  recognition.onstart = () => {
    voiceBtn.classList.add('recording');
  };
  recognition.onend = () => {
    voiceBtn.classList.remove('recording');
    isListening = false;    // إعادة ضبط هنا للتوثيق
  };
  recognition.onerror = () => {
    isListening = false;
  };
  
  voiceBtn.onclick = () => {
    if (!isListening) {
      recognition.start();
      isListening = true;
    }
  };
}

window.sendBotMessage = () => {
  const inp = document.getElementById('userInput');
  const txt = inp.value.trim();
  if (!txt) return;

  const box = document.getElementById('chatBox');
  box.innerHTML += `<div class="message user">${txt}</div>`;
  inp.value = '';
  box.innerHTML += `
    <div class="message bot">
      <div class="typing-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>`;
  box.scrollTop = box.scrollHeight;

  setTimeout(() => {
    box.querySelector('.typing-indicator').parentElement.remove();

    let resp = '';
    const lower = txt.toLowerCase();
    const greetings = ['اهلا', 'مرحبا', 'هلا', 'السلام عليكم'];
    if (greetings.some(g => lower.includes(g))) {
      resp = translations['bot_reply_rewelcome']?.[currentLang()] ||
        (currentLang() === 'ar' ?
          'مرحبًا مجددًا! كيف يمكنني مساعدتك؟ 😊' :
          'Welcome back! How can I help? 😊');
    } else {
      const found = fuseBot.search(txt)[0]?.item;
      if (found) {
        const r = found.response;
        resp = typeof r === 'object' ?
          (r[currentLang()] || r.ar) :
          r;
      } else {
        resp = translations['bot_reply_not_understand']?.[currentLang()] ||
          (currentLang() === 'ar' ?
            'عذرًا، لم أفهم. حاول إعادة الصياغة.' :
            "Sorry, I didn't understand. Please rephrase.");
      }
    }

    box.innerHTML += `<div class="message bot">${resp}</div>`;
    box.scrollTop = box.scrollHeight;

    if (voiceAsked) {
      const u = new SpeechSynthesisUtterance(resp);
      const lang = currentLang();  
      u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      speechSynthesis.speak(u);
      voiceAsked = false;
    }
  }, 600);
};
// ————— Typing effect for welcome message —————
function renderWelcome(msg) {
  const lang = currentLang();
  welcomeMessage = typeof msg === 'object'
    ? (msg.text?.[lang] || msg.text?.ar || '')
    : (msg.text || msg);
  clearTimeout(typingTimer);
  initTypingEffect();
}

function initTypingEffect() {
  const container = document.getElementById('typing-container');
  if (!container) return;
  container.innerHTML = '';

  function calculateLines(text) {
    const words = text.split(' ');
    const lines = []; let line = '';
    for (let w of words) {
      const test = line ? line + ' ' + w : w;
      const span = document.createElement('span');
      span.style.visibility = 'hidden';
      span.style.whiteSpace  = 'nowrap';
      span.textContent = test;
      document.body.appendChild(span);
      if (span.offsetWidth > container.clientWidth * 0.9) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
      document.body.removeChild(span);
    }
    lines.push(line);
    return lines;
  }

  const lines = calculateLines(welcomeMessage);
  let idx = 0;

  (function typeLine() {
    if (idx >= lines.length) {
      typingTimer = setTimeout(typeLine, 10000);
      return;
    }
    const div = document.createElement('div');
    div.className = 'typing-line';
    container.appendChild(div);
    let charIdx = 0;

    (function typeChar() {
      if (charIdx <= lines[idx].length) {
        div.innerHTML = lines[idx].slice(0, charIdx) + '<span class="blinking-cursor"></span>';
        charIdx++;
        setTimeout(typeChar, 80);
      } else {
        const cursor = div.querySelector('.blinking-cursor');
        if (cursor) cursor.remove();
        idx++;
        setTimeout(typeLine, idx < lines.length ? 700 : 4000);
      }
    })();
  })();
}

// ————— About Us —————
function loadAboutContent(data) {
  const lang = currentLang();
  const key  = Object.keys(data || {})[0];
  const txt  = typeof data[key]?.content === 'object'
    ? (data[key].content[lang] || data[key].content.ar)
    : data[key]?.content || '';
  document.getElementById('aboutContent').innerHTML = txt.replace(/\n/g,'<br>');
}

// ————— Contact Cards —————
function renderContactCards(data) {
  const grid = document.getElementById('contactGrid');
  grid.innerHTML = '';
  const lang = currentLang();

  Object.values(data || {}).forEach(c => {
    const name = typeof c.name === 'object'
      ? (c.name[lang] || c.name.ar)
      : c.name;
    const a = document.createElement('a');
    a.className = 'contact-card';
    a.href       = c.link;
    a.target     = '_blank';
    const iconKey= c.icon.split(' ').find(i=>iconColors[i]);
    a.style.setProperty('--card-color', iconColors[iconKey] || '#000');
    a.innerHTML = `<i class="${c.icon}"></i><h3>${name}</h3>`;
    grid.appendChild(a);
  });
  
  applyTranslations(); 
}

const iconColors = {
  "fa-google":"#D44638","fa-whatsapp":"#25D366","fa-facebook":"#1877F2",
  "fa-twitter":"#1DA1F2","fa-linkedin":"#0077B5","fa-instagram":"#E4405F",
  "fa-github":"#333","fa-paypal":"#1877F2","fa-telegram":"#0088cc",
  "fa-tiktok":"#69c9d0","fa-youtube":"#ff0000","fa-microsoft":"#6666ff","fa-at":"white"
};

// ————— Portfolio —————
function renderPortfolio(data) {
  const container = document.getElementById('portfolioGrid');
  container.innerHTML = '';
  const lang = currentLang();
  const unitArea = translations.unit_area?.[lang]
    || (lang === 'ar' ? 'م²' : 'm²');
  if (!data || !Object.keys(data).length) {
    container.innerHTML = `
      <p class="no-results" data-i18n="portfolio_no_projects">
        لا توجد مشاريع للعرض حالياً
      </p>`;
    applyTranslations();
    return;
  }

  Object.entries(data)
    .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
    .forEach(([key, p]) => {
      const title     = typeof p.title === 'object'
                        ? (p.title[lang] || p.title.ar)
                        : p.title;
      const address   = typeof p.address === 'object'
                        ? (p.address[lang] || p.address.ar)
                        : p.address;
      const area      = p.area || '';
      const desc      = typeof p.description === 'object'
                        ? (p.description[lang] || p.description.ar)
                        : p.description;
    
   
const tags = Array.isArray(p.tags)
? p.tags
: (Array.isArray(p.tags?.[lang]) ? p.tags[lang] : []);

const features = Array.isArray(p.features)
  ? p.features
: (Array.isArray(p.features?.[lang]) ? p.features[lang] : []);
      const type      = p.type    || '';
      const imgs      = p.images  || ['placeholder.png'];
      const price     = p.price   || '';
      const rating    = p.rating  || 0;
      const cardColor = p.color   || '#fff';
      const textColor = p.textColor || '#000';

      const projectEl = document.createElement('div');
      projectEl.className = 'project-card';
      projectEl.style.backgroundColor = cardColor;
      projectEl.style.color = textColor;
      projectEl.dataset.key = key;

      projectEl.innerHTML = `
        <div class="card-header">
          <div class="carousel">
            ${imgs.map((url,i) =>
              `<div class="carousel-slide${i===0?' active':''}">
                 <img src="${url}" alt="${title}" loading="lazy">
               </div>`
            ).join('')}
            <div class="carousel-dots">
              ${imgs.map((_,i) =>
                `<span class="carousel-dot${i===0?' active':''}" data-index="${i}"></span>`
              ).join('')}
            </div>
          </div>
        </div>
       <div class="card-body">
  <div class="card-top">
    <h3 class="card-title">${title}</h3>
    <div class="card-rating">
      <i class="fas fa-star"></i>
      <span class="rating-number">${rating}</span>
    </div>
  </div>
  <p class="card-info">
    <span class="info-address">
      <i class="fas fa-map-marker-alt"></i> ${address}
    </span>
 
     <span class="info-area">
            <i class="fas fa-vector-square"></i> ${area} ${unitArea}
          </span>

  </p>
  <p class="description">${desc}</p>
  <div class="tags-container">
    ${tags.map(t => `<span class="tag">${t}</span>`).join('')}
  </div>
  <div class="card-footer">
    <span class="info-price">
      <i class="fas fa-sack-dollar"></i> ${price}
    </span>
    <button class="details-btn" data-key="${key}">
      ${translations.portfolio_view_details?.[lang] || (lang==='ar'?'عرض التفاصيل':'View Details')}
    </button>
  </div>
</div> `;

      container.appendChild(projectEl);
    });

  initAllCarousels();
  setupDescriptionToggle();
  setupDetailsModals(data);
}

function setupDetailsModals(data) {
  document.querySelectorAll('.details-btn').forEach(btn => {
    btn.onclick = () => {
      const key  = btn.dataset.key;
      const p    = data[key];
      const lang = currentLang();

      const title   = getLocalizedText(p.title);
      const address = getLocalizedText(p.address);
      const area    = p.area || '';
      const price   = p.price || '';
      const type    = getCategoryName(p.category, lang);

      const features = Array.isArray(p.features?.[lang]) 
        ? p.features[lang] 
        : [];

      const L_TITLE      = translations.portfolio_label_title?.[lang]    || (lang==='ar'?'العنوان':'Title');
      const L_ADDRESS    = translations.portfolio_label_address?.[lang]  || (lang==='ar'?'العنوان':'Address');
      const L_PRICE      = translations.portfolio_label_price?.[lang]    || (lang==='ar'?'السعر':'Price');
      const L_AREA       = translations.portfolio_label_area?.[lang]     || (lang==='ar'?'المساحة':'Area');
      const L_CATEGORY   = translations.portfolio_label_category?.[lang] || (lang==='ar'?'التصنيف':'Category');
      const L_FEATURES   = translations.portfolio_label_features?.[lang] || (lang==='ar'?'المزايا':'Features');
      const L_CONTACT_ME = translations.portfolio_label_contact_me?.[lang] || (lang==='ar'?'تواصل معي':'Contact Me');
      const L_CLOSE      = translations.portfolio_label_close?.[lang]    || (lang==='ar'?'إغلاق':'Close');
      const unitArea     = translations.unit_area?.[lang]               || (lang==='ar'?'م²':'m²');

      const waNum  = normalizeWhatsAppNumber(qcSettings.whatsappNumber || '');
      const waText = encodeURIComponent(
        `${L_TITLE}: ${title}\n` +
        `${L_ADDRESS}: ${address}\n` +
        `${L_AREA}: ${area} ${unitArea}\n` +
        `${L_PRICE}: ${price}`
      );

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const modal = document.createElement('div');
      modal.className = 'project-modal';
      modal.style.setProperty('--card-bg', p.color);
      modal.style.setProperty('--card-color', p.textColor);
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2> ${title}</h2>
          </div>
          <p><strong>${L_ADDRESS}:</strong> ${address}</p>
          <p><strong>${L_PRICE}:</strong> ${price}</p>
          <p><strong>${L_AREA}:</strong> ${area} ${unitArea}</p>
          <p><strong>${L_CATEGORY}:</strong> ${type}</p>
          <h3>${L_FEATURES}</h3>
          <ul>
            ${features.map(f => {
              const txt = (typeof f === 'object') ? (f[lang]||f.ar) : f;
              return `<li>✓ ${txt}</li>`;
            }).join('')}
          </ul>
          <div class="modal-actions">
            <button class="modal-contact"
              onclick="window.open('https://wa.me/${waNum}?text=${waText}','_blank')">
              ${L_CONTACT_ME}
            </button>
            <button class="modal-close">${L_CLOSE}</button>
          </div>
        </div>`;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      modal.querySelector('.modal-close').onclick = () => overlay.remove();
      overlay.onclick = e => {
        if (e.target === overlay) overlay.remove();
      };
    };
  });
}
// ————— Carousel Initialization —————
function initAllCarousels() {
  document.querySelectorAll('.project-card').forEach(card => {
    const slides = Array.from(card.querySelectorAll('.carousel-slide'));
    const dots   = Array.from(card.querySelectorAll('.carousel-dot'));
    const dotColor = card.dataset.dotColor;  
    let idx = 0, startX = 0, timer;

    function show(i) {
      slides[idx].classList.remove('active');
      dots[idx].classList.remove('active');
      dots[idx].style.background = 'rgba(0,0,0,0.2)';

      idx = (i + slides.length) % slides.length;

      slides[idx].classList.add('active');
      dots[idx].classList.add('active');
      dots[idx].style.background = dotColor;
    }

    timer = setInterval(() => show(idx + 1), 5000);

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        clearInterval(timer);
        show(parseInt(dot.dataset.index, 10));
        timer = setInterval(() => show(idx + 1), 5000);
      });
    });

    const carousel = card.querySelector('.carousel');
    carousel.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      clearInterval(timer);
    });
    carousel.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 50) show(idx - 1);
      else if (dx < -50) show(idx + 1);
      timer = setInterval(() => show(idx + 1), 5000);
    });

    card.addEventListener('mouseenter', () => clearInterval(timer));
    card.addEventListener('mouseleave', () => {
      clearInterval(timer);
      timer = setInterval(() => show(idx + 1), 5000);
    });
  });
}

// ===== Search & Filter =====
const recognitionSearch = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognitionSearch.lang = 'ar-SA';
recognitionSearch.interimResults = false;
let isListeningSearch = false;

function initSearch() {
  const voiceBtn = document.getElementById('voiceSearchBtn');
  voiceBtn.onclick = () => {
    if (!isListeningSearch) {
      recognitionSearch.start();
      isListeningSearch = true;
    }
  };

  recognitionSearch.onresult = (e) => {
    document.getElementById('searchName').value = e.results[0][0].transcript;
    performSearch();
    isListeningSearch = false;
  };

  recognitionSearch.onend = () => isListeningSearch = false;

  document.getElementById('searchBtn').onclick = performSearch;
  document.getElementById('searchName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  onValue(ref(db, 'categories'), (snap) => {
    currentCategories = snap.val() || {};
    updateCategoryOptions();
  });

  document.querySelectorAll('#propertyType, #areaCondition, #areaValue')
    .forEach(el => el.addEventListener('change', performSearch));

  updateCategoryOptions();
}

function performSearch() {
  try {
    console.log('----- Starting Search -----');
    console.log('Raw Projects Data:', currentProjects);
    const searchParams = getSearchParams();
    console.log('Search Parameters:', {
      searchText: searchParams.searchText,
      propertyType: searchParams.propertyType,
      areaCondition: searchParams.areaCondition,
      areaValue: searchParams.areaValue
    });
    
    const filtered = filterProjects(searchParams);
    console.log('Filtered Results Count:', Object.keys(filtered).length);
    console.log('Sample Filtered Item:', filtered[Object.keys(filtered)[0]]);
    
    renderPortfolio(filtered);
    handleNoResults(filtered);
    
  } catch (error) {
    console.error('Search Error Details:', {
      error: error.message,
      stack: error.stack
    });
    showErrorToast('حدث خطأ في البحث. الرجاء المحاولة لاحقاً');
  }
}

function getSearchParams() {
  const searchEl = document.getElementById('searchName');
  const propertyEl = document.getElementById('propertyType');
  if (!searchEl || !propertyEl) {
    return { searchText: '', propertyType: 'all', areaCondition: '', areaValue: 0 };
  }
  return {
    searchText: searchEl.value.trim().toLowerCase(),
    propertyType: propertyEl.value,
    areaCondition: document.getElementById('areaCondition')?.value || '',
    areaValue: parseInt(document.getElementById('areaValue')?.value) || 0
  };
}

function filterProjects({ searchText, propertyType, areaCondition, areaValue }) {
  return Object.fromEntries(
    Object.entries(currentProjects).filter(([_, p]) => {
      const title = getLocalizedText(p?.title).toLowerCase();
      const address = getLocalizedText(p?.address).toLowerCase();
      const projectArea = parseInt(p?.area) || 0;

      const textMatch = title.includes(searchText) || address.includes(searchText);
      
      const categoryMatch = 
        propertyType === 'all' || 
        p.category === propertyType;
      
      const areaMatch = checkAreaCondition(projectArea, areaCondition, areaValue);

      return textMatch && categoryMatch && areaMatch;
    })
  );
}

function checkAreaCondition(projectArea, condition, value) {
  if (!value || value <= 0) return true;
  projectArea = projectArea || 0;
  return condition === 'greater' ? 
    projectArea >= value : 
    projectArea <= value;
}

function handleNoResults(filtered) {
  const container = document.getElementById('portfolioGrid');
  const existingMsg = container.querySelector('.no-results');
  const resultsCount = Object.keys(filtered).length;

  if (resultsCount === 0 && !existingMsg) {
    const noResults = document.createElement('p');
    noResults.className = 'no-results';
    noResults.textContent = translations['no_search_results']?.[currentLang()] || 'لا توجد نتائج';
    container.appendChild(noResults);
  } else if (resultsCount > 0 && existingMsg) {
    existingMsg.remove();
  }
}
// ————— Quick Contact —————
function normalizeWhatsAppNumber(raw) {
  return raw.trim().replace(/\D/g, '');
}

function initQuickContact(settings) {
  qcSettings = settings || {};
  const form      = document.getElementById('quickContactForm');
  const nameEl    = document.getElementById('qcName');
  const contactEl = document.getElementById('qcContact');
  const msgEl     = document.getElementById('qcMessage');
  const btnWA     = document.getElementById('qcSendWhatsapp');
  const btnEM     = document.getElementById('qcSendEmail');
  const msgBox    = document.getElementById('qcUserMessageBox');

  function showUserMessage(key, isError = false) {
    const lang = currentLang();
    const txt  = translations[key]?.[lang] || '';
    msgBox.className = `message-box ${isError ? 'error' : 'success'}`;
    msgBox.textContent = txt;
    setTimeout(() => msgBox.textContent = '', 3000);
  }

  if (btnWA) {
    btnWA.querySelector('i').className = qcSettings.buttonWhatsappIcon || '';
    const labelWA = qcSettings.buttonWhatsappLabel;
    btnWA.querySelector('span').textContent =
      typeof labelWA === 'object'
        ? (labelWA[currentLang()] || labelWA.ar)
        : labelWA || '';
    btnWA.onclick = () => {
      if (!form.reportValidity()) return;
      const name    = nameEl.value.trim();
      const contact = contactEl.value.trim();
      if (!contact) return showUserMessage('qc_warn_no_contact', true);

      const waNum = normalizeWhatsAppNumber(qcSettings.whatsappNumber || '');
      if (!waNum) return showUserMessage('qc_warn_bad_whatsapp', true);

      const fullMsg =
        `${translations.qc_label_name[currentLang()]}: ${name}\n` +
        `${translations.qc_label_contact[currentLang()]}: ${contact}\n` +
        `${translations.qc_label_message[currentLang()]}: ${msgEl.value.trim()}`;

      window.open(
        `https://wa.me/${waNum}?text=${encodeURIComponent(fullMsg)}`,
        '_blank'
      );
      setTimeout(() => {
        form.reset();
        showUserMessage('qc_sent_whatsapp');
      }, 10000);
    };
  }

  if (btnEM) {
    btnEM.querySelector('i').className = qcSettings.buttonEmailIcon || '';
    const labelEM = qcSettings.buttonEmailLabel;
    btnEM.querySelector('span').textContent =
      typeof labelEM === 'object'
        ? (labelEM[currentLang()] || labelEM.ar)
        : labelEM || '';
    btnEM.onclick = () => {
      if (!form.reportValidity()) return;
      const name    = nameEl.value.trim();
      const contact = contactEl.value.trim();
      if (!contact) return showUserMessage('qc_warn_no_contact', true);
      const subject = encodeURIComponent(
        `${translations.qc_email_subject[currentLang()]} ${name}`
      );
      const body = encodeURIComponent(
        `${translations.qc_label_name[currentLang()]}: ${name}\n` +
        `${contact}\n\n${msgEl.value.trim()}`
      );
      window.location.href =
        `mailto:${qcSettings.emailAddress}?subject=${subject}&body=${body}`;
      setTimeout(() => {
        form.reset();
        showUserMessage('qc_sent_email');
      }, 10000);
    };
  }
}

function setupDescriptionToggle() {
  document.querySelectorAll('.project-card .description').forEach(desc => {
    const style = getComputedStyle(desc);
    const lineHeight = parseFloat(style.lineHeight);
    const collapsedHeight = lineHeight * 3;
    desc.style.maxHeight = collapsedHeight + 'px';
    desc.style.transition = 'max-height 0.4s ease';
    desc.addEventListener('click', () => {
      if (!desc.classList.contains('expanded')) {
        desc.classList.add('expanded');
        desc.style.maxHeight = desc.scrollHeight + 'px';
      } else {
        desc.style.maxHeight = collapsedHeight + 'px';
        desc.addEventListener('transitionend', function handler() {
          desc.classList.remove('expanded');
          desc.removeEventListener('transitionend', handler);
        });
      }
    });
  });
}
// ————— Show/Hide Sections —————
function showHomeSection() {
  document.querySelectorAll('.main-section').forEach(sec => {
    sec.style.display = sec.id !== 'portfolioSection' ? 'block' : 'none';
  });
  document.getElementById('toggle-home-btn').classList.add('active');
  document.getElementById('toggle-projects-btn').classList.remove('active');
}

function showProjectsSection() {
  document.querySelectorAll('.main-section').forEach(sec => {
    sec.style.display = sec.id === 'portfolioSection' ? 'block' : 'none';
  });
  document.getElementById('toggle-projects-btn').classList.add('active');
  document.getElementById('toggle-home-btn').classList.remove('active');

  const projSec = document.getElementById('portfolioSection');
  if (projSec) {
    const navH = document.getElementById('navsec').offsetHeight;
    window.scrollTo({
      top: projSec.offsetTop - navH,
      behavior: 'smooth'
    });
  }
}