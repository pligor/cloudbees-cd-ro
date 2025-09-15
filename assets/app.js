(function () {
  // Active nav highlighting
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path) a.classList.add('active');
  });

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Dismiss notice on home
  const dismiss = document.getElementById('dismissNotice');
  if (dismiss) dismiss.addEventListener('click', () => {
    const bar = document.getElementById('announce');
    bar.remove();
  });

  // Tracking quick form on home navigates to track.html with query
  const quickTrack = document.getElementById('quickTrack');
  if (quickTrack) {
    quickTrack.addEventListener('submit', () => { /* normal navigation */ });
  }

  // Tracking page logic
  const trackForm = document.getElementById('trackForm');
  if (trackForm) {
    const idInput = document.getElementById('trackId');
    const randomBtn = document.getElementById('randomId');
    const res = document.getElementById('trackResult');
    const pill = document.getElementById('statusPill');
    const text = document.getElementById('statusText');
    const timeline = document.getElementById('timeline');
    const copyLink = document.getElementById('copyLink');

    const params = new URLSearchParams(location.search);
    const maybeId = params.get('id');
    if (maybeId) idInput.value = maybeId;

    randomBtn?.addEventListener('click', () => {
      idInput.value = makeSampleId();
      idInput.focus();
    });

    trackForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!idInput.checkValidity()) return;
      res.classList.remove('hidden');
      pill.textContent = 'Checking…';
      text.textContent = 'Contacting sorting center…';
      timeline.innerHTML = '';

      const steps = makeTimeline();
      let i = 0;
      const tick = () => {
        if (i >= steps.length) { pill.textContent = 'Delivered'; return; }
        const s = steps[i++];
        const li = document.createElement('li');
        li.className = s.done ? 'done' : '';
        li.innerHTML = `<span class="dot"></span><div><div><strong>${s.title}</strong></div><div class="when">${s.when}</div><div class="muted">${s.desc}</div></div>`;
        timeline.prepend(li);
        pill.textContent = s.badge;
        text.textContent = s.title + ' — ' + s.desc;
        setTimeout(tick, 600);
      };
      setTimeout(tick, 300);
    });

    copyLink?.addEventListener('click', async () => {
      const url = new URL(location.href);
      url.searchParams.set('id', idInput.value || makeSampleId());
      await navigator.clipboard.writeText(url.toString());
      copyLink.textContent = 'Link copied';
      setTimeout(() => (copyLink.textContent = 'Copy share link'), 1500);
    });
  }

  // Locations page logic
  const list = document.getElementById('locationsList');
  if (list) {
    const city = document.getElementById('cityFilter');
    const service = document.getElementById('serviceFilter');
    const btn = document.getElementById('applyFilters');
    const data = sampleLocations();

    function render(items) {
      list.innerHTML = '';
      if (!items.length) { list.innerHTML = '<div class="card">No locations found.</div>'; return; }
      items.forEach(x => {
        const el = document.createElement('article');
        el.className = 'card location';
        el.innerHTML = `
          <h3>${x.name}</h3>
          <small>${x.address}, ${x.postal} ${x.city}</small>
          <div class="muted">Services: ${x.services.join(', ')}</div>
          <details>
            <summary>Opening hours</summary>
            <table class="table">
              ${x.hours.map(h => `<tr><td>${h.d}</td><td style="text-align:right">${h.h}</td></tr>`).join('')}
            </table>
          </details>
        `;
        list.appendChild(el);
      });
    }

    function apply() {
      const term = (city.value || '').toLowerCase();
      const svc = service.value;
      const items = data.filter(x => {
        const matchCity = !term || x.city.toLowerCase().includes(term) || x.postal.includes(term);
        const matchSvc = !svc || x.services.includes(svc);
        return matchCity && matchSvc;
      });
      render(items);
    }

    btn.addEventListener('click', apply);
    apply();
  }

  // Pricing page logic
  const priceForm = document.getElementById('priceForm');
  if (priceForm) {
    const zone = document.getElementById('zone');
    const service = document.getElementById('service');
    const weight = document.getElementById('weight');
    const size = document.getElementById('size');
    const sig = document.getElementById('signature');
    const ins = document.getElementById('insurance');
    const out = document.getElementById('priceResult');
    const totalEl = document.getElementById('priceTotal');
    const breakdown = document.getElementById('priceBreakdown');

    priceForm.addEventListener('submit', e => {
      e.preventDefault();
      const b = base(zone.value, service.value, Number(weight.value), size.value);
      const addSig = sig.checked ? 2.5 : 0;
      const addIns = ins.checked ? 3.5 : 0;
      const total = round2(b + addSig + addIns);
      totalEl.textContent = total.toFixed(2);
      breakdown.innerHTML = '';
      const rows = [
        ['Base', b],
        sig.checked ? ['Signature', 2.5] : null,
        ins.checked ? ['Insurance', 3.5] : null
      ].filter(Boolean);
      rows.forEach(([k, v]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${k}</td><td>€ ${Number(v).toFixed(2)}</td>`;
        breakdown.appendChild(tr);
      });
      out.classList.remove('hidden');
    });
  }

  // Help page logic
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const toast = document.getElementById('contactToast');
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!contactForm.checkValidity()) return;
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 1800);
      contactForm.reset();
    });
  }

  // Helpers and sample data
  function makeSampleId() {
    const n = Math.floor(Math.random() * 9e9) + 1e9; // 10 digits
    return 'AT' + String(n);
  }

  function makeTimeline() {
    const now = Date.now();
    const fmt = ms => new Date(ms).toLocaleString();
    return [
      { title: 'Label created', desc: 'Shipment information received', when: fmt(now - 86400000 * 2), badge: 'Created', done: true },
      { title: 'Accepted at facility', desc: 'Vienna 1010', when: fmt(now - 86400000 * 2 + 3600000 * 3), badge: 'Accepted', done: true },
      { title: 'In transit', desc: 'To Graz 8010', when: fmt(now - 86400000 + 3600000 * 4), badge: 'In transit', done: true },
      { title: 'Out for delivery', desc: 'Local carrier on the way', when: fmt(now - 3600000), badge: 'Out for delivery', done: true },
      { title: 'Delivered', desc: 'Left with neighbour', when: fmt(now - 600000), badge: 'Delivered', done: true }
    ];
  }

  function sampleLocations() {
    return [
      { name: 'Postfiliale Wien 1010', city: 'Wien', postal: '1010', address: 'Fleischmarkt 19', services: ['post', 'parcel'], hours: hrs(['Mon-Fri', '08:00–18:00'], ['Sat', '09:00–12:00']) },
      { name: 'Postfiliale Graz 8010', city: 'Graz', postal: '8010', address: 'Herrengasse 5', services: ['post', 'pickup'], hours: hrs(['Mon-Fri', '08:00–17:00']) },
      { name: 'Post Partner Linz 4020', city: 'Linz', postal: '4020', address: 'Landstraße 50', services: ['pickup', 'parcel'], hours: hrs(['Mon-Fri', '09:00–18:00'], ['Sat', '09:00–12:30']) },
      { name: 'Postfiliale Salzburg 5020', city: 'Salzburg', postal: '5020', address: 'Getreidegasse 2', services: ['post'], hours: hrs(['Mon-Fri', '08:30–17:00']) },
      { name: 'Postfiliale Innsbruck 6020', city: 'Innsbruck', postal: '6020', address: 'Maria-Theresien-Straße 18', services: ['post', 'parcel'], hours: hrs(['Mon-Fri', '08:00–18:00']) }
    ];
  }
  function hrs(...pairs) { return pairs.map(([d, h]) => ({ d, h })); }

  function base(zone, service, weight, size) {
    const zoneBase = { domestic: 3.2, eu: 7.9, intl: 12.5 }[zone] || 3.2;
    const svc = service === 'express' ? 6.0 : 0;
    const sizeAdd = { s: 0, m: 1.5, l: 3.5 }[size] || 0;
    const weightAdd = weight <= 1 ? 0 : weight <= 3 ? 1.2 : 3.0 + (weight - 3) * 0.6;
    return round2(zoneBase + svc + sizeAdd + weightAdd);
  }
  function round2(x) { return Math.round(x * 100) / 100; }
})();