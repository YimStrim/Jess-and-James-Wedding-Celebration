// ── Configuration ─────────────────────────────────────────
// Paste your Apps Script Web App URL here after deploying
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxeK3heT_W4VtkgefqAkQyof0dPyu5oXEMwqI5C1a-ZpgG1ieWq21yMBlC2dv12Rptr/exec'

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const token = new URLSearchParams(window.location.search).get('guest');

  if (!token) {
    renderError('No invite link detected. Please use the personal link from your invitation.');
    return;
  }

  try {
    const res  = await fetch(`${APPS_SCRIPT_URL}?action=lookup&token=${encodeURIComponent(token)}`);
    const data = await res.json();

    if (!data.found) {
      renderError("We couldn't find your invitation. Please check the link you were sent.");
      return;
    }

    renderForm(data.party, token);

  } catch (err) {
    renderError('Something went wrong loading your invitation. Please try refreshing the page.');
  }
}

// ── Error state ───────────────────────────────────────────
function renderError(message) {
  document.getElementById('rsvp-container').innerHTML =
    `<p class="rsvp-error">${escapeHtml(message)}</p>`;
}

// ── Form rendering ────────────────────────────────────────
function renderForm(party, token) {
  const hasAnyResponse = party.some(g => g.attending === 'Yes' || g.attending === 'No');
  const submitLabel    = hasAnyResponse ? 'Update RSVP' : 'Send RSVP';

  const container = document.getElementById('rsvp-container');
  container.innerHTML = `
    <form id="rsvp-form" novalidate>
      <div class="guest-cards" id="guest-cards"></div>
      <p class="validation-msg hidden" id="validation-msg"></p>
      <button type="submit" class="btn-submit">${submitLabel}</button>
    </form>
  `;

  const cardsEl = document.getElementById('guest-cards');
  party.forEach(guest => {
    cardsEl.insertAdjacentHTML('beforeend', buildGuestCard(guest));
  });

  // Submit
  document.getElementById('rsvp-form').addEventListener('submit', e => {
    e.preventDefault();
    handleSubmit(party, token);
  });

  // Attending toggle (event delegation)
  cardsEl.addEventListener('click', e => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;

    const scope = btn.closest('.guest-card, .plus-card');
    scope.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Show/hide the attending-details block
    const details = scope.querySelector('.attending-details');
    if (details) {
      details.classList.toggle('hidden', btn.dataset.value === 'No');
    }
  });

  // Dietary "Other" textarea toggle (event delegation)
  cardsEl.addEventListener('change', e => {
    if (!e.target.classList.contains('dietary-select')) return;
    const scope    = e.target.closest('.guest-card, .plus-card');
    const textarea = scope.querySelector('.other-dietary');
    if (textarea) textarea.classList.toggle('hidden', e.target.value !== 'Other');
  });
}

// ── Guest card HTML ───────────────────────────────────────
function buildGuestCard(guest) {
  const isAttending    = guest.attending === 'Yes';
  const isNotAttending = guest.attending === 'No';
  const detailsHidden  = isNotAttending ? 'hidden' : '';
  const otherHidden    = guest.dietary !== 'Other' ? 'hidden' : '';

  // Strip any previously saved +1 notes from the other-dietary field so we
  // don't show them in the main guest's own text box
  let existingOther = (guest.otherDietary || '').replace(/;?\s*\+1 (Adult|Child)[^;]*/gi, '').trim();

  // Build plus-guest cards for this guest
  let plusHtml = '';
  for (let i = 0; i < (guest.plusAdults || 0); i++) {
    plusHtml += buildPlusCard('adult', i);
  }
  for (let i = 0; i < (guest.plusChildren || 0); i++) {
    plusHtml += buildPlusCard('child', i);
  }

  return `
    <div class="guest-card" data-token="${escapeHtml(guest.token)}">
      <div class="guest-name">${escapeHtml(guest.name)}</div>

      <div class="field-group">
        <span class="field-label">Will you be attending?</span>
        <div class="toggle-group">
          <button type="button" class="toggle-btn ${isAttending    ? 'active' : ''}" data-value="Yes">Attending</button>
          <button type="button" class="toggle-btn ${isNotAttending ? 'active' : ''}" data-value="No">Not attending</button>
        </div>
      </div>

      <div class="attending-details ${detailsHidden}">
        <div class="field-group">
          <label class="field-label">Dietary requirements</label>
          <select class="dietary-select">
            <option value="">Please select</option>
            <option value="Meat"         ${guest.dietary === 'Meat'         ? 'selected' : ''}>Meat</option>
            <option value="Vegetarian"   ${guest.dietary === 'Vegetarian'   ? 'selected' : ''}>Vegetarian</option>
            <option value="Vegan"        ${guest.dietary === 'Vegan'        ? 'selected' : ''}>Vegan</option>
            <option value="Other"        ${guest.dietary === 'Other'        ? 'selected' : ''}>Other</option>
          </select>
          <textarea class="other-dietary ${otherHidden}"
                    placeholder="Please describe your dietary requirements"
                    rows="2">${escapeHtml(existingOther)}</textarea>
        </div>

        ${plusHtml}
      </div>
    </div>
  `;
}

// ── Plus-guest card HTML ──────────────────────────────────
function buildPlusCard(type, index) {
  const label = type === 'adult' ? 'Adult guest' : 'Child guest';
  return `
    <div class="plus-card" data-plus-type="${type}">
      <div class="plus-label">${label}</div>

      <div class="field-group">
        <span class="field-label">Will they be attending?</span>
        <div class="toggle-group">
          <button type="button" class="toggle-btn" data-value="Yes">Attending</button>
          <button type="button" class="toggle-btn" data-value="No">Not attending</button>
        </div>
      </div>

      <div class="attending-details">
        <div class="field-group">
          <label class="field-label">Dietary requirements</label>
          <select class="dietary-select">
            <option value="">Please select</option>
            <option value="Meat">Meat</option>
            <option value="Vegetarian">Vegetarian</option>
            <option value="Vegan">Vegan</option>
            <option value="Other">Other</option>
          </select>
          <textarea class="other-dietary hidden"
                    placeholder="Please describe their dietary requirements"
                    rows="2"></textarea>
        </div>
      </div>
    </div>
  `;
}

// ── Collect form state ────────────────────────────────────
function collectResponses(party) {
  const cards = document.querySelectorAll('.guest-card');
  const responses = [];

  cards.forEach((card, idx) => {
    const guest       = party[idx];
    const activeBtn   = card.querySelector(':scope > .field-group .toggle-btn.active');
    const dietSelect  = card.querySelector('.attending-details > .field-group .dietary-select');
    const otherArea   = card.querySelector('.attending-details > .field-group .other-dietary');

    const attending   = activeBtn  ? activeBtn.dataset.value  : '';
    const dietary     = dietSelect ? dietSelect.value         : '';
    const otherDiet   = (otherArea && !otherArea.classList.contains('hidden')) ? otherArea.value.trim() : '';

    const plusAdults   = [];
    const plusChildren = [];

    card.querySelectorAll('.plus-card').forEach(plusCard => {
      const plusType    = plusCard.dataset.plusType;
      const plusActive  = plusCard.querySelector('.toggle-btn.active');
      const plusSelect  = plusCard.querySelector('.dietary-select');
      const plusOther   = plusCard.querySelector('.other-dietary');

      // Only include this plus guest if an attending decision was made
      if (!plusActive) return;

      const entry = {
        attending:    plusActive.dataset.value,
        dietary:      (plusSelect && plusActive.dataset.value === 'Yes') ? plusSelect.value : '',
        otherDietary: (plusOther  && !plusOther.classList.contains('hidden')) ? plusOther.value.trim() : ''
      };

      if (plusType === 'adult') plusAdults.push(entry);
      else                      plusChildren.push(entry);
    });

    responses.push({
      token:        guest.token,
      attending,
      dietary,
      otherDietary: otherDiet,
      plusAdults,
      plusChildren
    });
  });

  return responses;
}

// ── Validation ────────────────────────────────────────────
function validate(responses) {
  for (const r of responses) {
    if (!r.attending) return 'Please select attending or not attending for each guest.';
    if (r.attending === 'Yes') {
      if (!r.dietary) return 'Please choose a dietary option for each attending guest.';
      if (r.dietary === 'Other' && !r.otherDietary) return 'Please describe the dietary requirements for "Other".';
    }
    for (const g of [...r.plusAdults, ...r.plusChildren]) {
      if (g.attending === 'Yes' && !g.dietary) return 'Please choose a dietary option for all attending guests.';
      if (g.dietary === 'Other' && !g.otherDietary) return 'Please describe the dietary requirements for "Other".';
    }
  }
  return null;
}

// ── Submit handler ────────────────────────────────────────
async function handleSubmit(party, token) {
  const responses = collectResponses(party);
  const error     = validate(responses);
  const msgEl     = document.getElementById('validation-msg');
  const submitBtn = document.querySelector('.btn-submit');

  if (error) {
    msgEl.textContent = error;
    msgEl.classList.remove('hidden');
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  msgEl.classList.add('hidden');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Sending…';

  try {
    const res    = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      body:    JSON.stringify({ token, responses })
      // No Content-Type header → defaults to text/plain → no CORS preflight needed
    });
    const result = await res.json();

    if (result.success) {
      renderThankYou(responses);
    } else {
      throw new Error(result.error || 'Save failed');
    }

  } catch (err) {
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Send RSVP';
    msgEl.textContent = 'Something went wrong — please try again.';
    msgEl.classList.remove('hidden');
  }
}

// ── Thank-you state ───────────────────────────────────────
function renderThankYou(responses) {
  const attending    = responses.filter(r => r.attending === 'Yes');
  const notAttending = responses.filter(r => r.attending === 'No');

  let message;
  if (attending.length > 0 && notAttending.length === 0) {
    message = "We can't wait to celebrate with you!";
  } else if (attending.length === 0) {
    message = "Sorry you can't make it — thank you for letting us know.";
  } else {
    message = "Thank you for letting us know.";
  }

  document.getElementById('rsvp-container').innerHTML = `
    <div class="thank-you">
      <div class="thank-you-tick">✓</div>
      <p class="thank-you-title">RSVP received</p>
      <p class="thank-you-message">${message}</p>
      <p class="thank-you-sub">Need to make a change? Simply use your invite link again.</p>
    </div>
  `;
}

// ── Utility ───────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
