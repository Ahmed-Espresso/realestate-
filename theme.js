const THEMES = ['night','day','wine'];
let theme = localStorage.getItem('theme') || 'night';

let darkCanvas, darkCtx, stars = [];
let dayCanvas,  dayCtx,  bokeh = [];
let wineCanvas, wineCtx, bubbles = [], swirlAngle = 0;

// ------------- Night Theme -------------
function createStar() {
  stars.push({
    x: Math.random()*darkCanvas.width,
    y: Math.random()*darkCanvas.height,
    r: Math.random()*1.2 + 0.2,
    s: Math.random()*0.3 + 0.05
  });
}
function drawStars() {
  darkCtx.clearRect(0,0,darkCanvas.width,darkCanvas.height);
  for (let st of stars) {
    darkCtx.beginPath();
    darkCtx.arc(st.x, st.y, st.r, 0, 2*Math.PI);
    darkCtx.fillStyle = 'white';
    darkCtx.fill();
    st.y += st.s;
    if (st.y > darkCanvas.height) {
      st.y = 0;
      st.x = Math.random()*darkCanvas.width;
    }
  }
}
function animateStars() {
  if (theme === 'night') drawStars();
  requestAnimationFrame(animateStars);
}
function initStars() {
  darkCanvas.width = window.innerWidth;
  darkCanvas.height = window.innerHeight;
  stars = [];
  for (let i = 0; i < 300; i++) createStar();
}

// ------------- Day Theme -------------
function initDayElements() {
  dayCanvas.width = window.innerWidth;
  dayCanvas.height = window.innerHeight;
  bokeh = [];
  for (let i = 0; i < 100; i++) {
    bokeh.push({
      x: Math.random()*dayCanvas.width,
      y: Math.random()*dayCanvas.height,
      r: Math.random()*1.5+0.5,
      vx: (Math.random()-0.5)*0.3,
      vy: (Math.random()-0.5)*0.3,
      phase: Math.random()*2*Math.PI
    });
  }
}

function drawDayScene() {
  dayCtx.clearRect(0,0,dayCanvas.width,dayCanvas.height);
  bokeh.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.phase += 0.02;
    if (p.x<0) p.x=dayCanvas.width;
    if (p.x>dayCanvas.width) p.x=0;
    if (p.y<0) p.y=dayCanvas.height;
    if (p.y>dayCanvas.height) p.y=0;
  });
  bokeh.forEach(p => {
    dayCtx.beginPath();
    dayCtx.arc(p.x,p.y,p.r,0,2*Math.PI);
    dayCtx.fillStyle = `rgba(255,255,255,${0.5+0.5*Math.sin(p.phase)})`;
    dayCtx.shadowBlur = 10;
    dayCtx.shadowColor = 'rgba(255,255,255,0.8)';
    dayCtx.fill();
  });
  dayCtx.shadowBlur = 0;
}
function animateDay() {
  if (theme==='day') drawDayScene();
  requestAnimationFrame(animateDay);
}

// ------------- Wine Theme -------------
function initWineElements() {
  wineCanvas.width = window.innerWidth;
  wineCanvas.height = window.innerHeight;
  bubbles = [];
  for (let i=0; i<20; i++) {
    bubbles.push({
      x: Math.random()*wineCanvas.width,
      y: wineCanvas.height + Math.random()*100,
      r: 2+Math.random()*3,
      speed: 0.3+Math.random()*1
    });
  }
}

function drawWineScene() {
  wineCtx.clearRect(0,0,wineCanvas.width,wineCanvas.height);

  for (let b of bubbles) {
    wineCtx.beginPath();
    wineCtx.arc(b.x, b.y, b.r,0,2*Math.PI);
    wineCtx.fillStyle = 'rgba(255,255,255,0.3)';
    wineCtx.fill();
    b.y -= b.speed;
    if (b.y + b.r < 0) b.y = wineCanvas.height + Math.random()*50;
  }
}
function animateWine() {
  if (theme==='wine') drawWineScene();
  requestAnimationFrame(animateWine);
}

// ------------- Apply & Toggle -------------
function applyTheme(initial=false) {
  document.documentElement.className = '';
  document.documentElement.classList.add(`theme-${theme}`);
  if (initial) document.documentElement.style.visibility = '';
}
function toggleTheme() {
  let idx = THEMES.indexOf(theme);
  theme = THEMES[(idx+1)%THEMES.length];
  localStorage.setItem('theme', theme);
  applyTheme();
  updateIcon();
}

function updateIcon() {
  const btn = document.getElementById('theme-toggle');
  const icon = btn.querySelector('i');
  const map  = {
    night: 'fas fa-moon',
    day:   'fas fa-tint water-icon',
    wine:  'fas fa-wine-glass-alt'
  };
  const cls = map[theme] || map.night;
  icon.className = cls;
}
  
// ------------- Startup -------------
document.addEventListener('DOMContentLoaded', ()=> {
  darkCanvas  = document.createElement('canvas'); darkCanvas.id  = 'space';
  dayCanvas   = document.createElement('canvas'); dayCanvas.id   = 'day-canvas';
  wineCanvas  = document.createElement('canvas'); wineCanvas.id  = 'wine-canvas';

  document.body.prepend(
    darkCanvas,
    dayCanvas,
    wineCanvas
  );

  darkCtx   = darkCanvas.getContext('2d');
  dayCtx    = dayCanvas.getContext('2d');
  wineCtx   = wineCanvas.getContext('2d');

  initStars();      animateStars();
  initDayElements();animateDay();
  initWineElements();animateWine();
  applyTheme(true);
  updateIcon();
  document.getElementById('theme-toggle')
          .addEventListener('click', toggleTheme);

  let lastW = window.innerWidth;
  window.addEventListener('resize', ()=> {
    const w = window.innerWidth;
    if (w !== lastW) {
      lastW = w;
      [darkCanvas, dayCanvas, wineCanvas]
        .forEach(c => {
          c.width  = w;
          c.height = window.innerHeight;
        });
    }
  });
});