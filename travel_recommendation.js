'use strict';

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const results = document.getElementById('results');
const recommendations = document.getElementById('recommendations');
const searchStatus = document.getElementById('search-status');
let clockTimer;
let searchVersion = 0;
let dataPromise;

// Fetch the required local API file; a failed request can be retried.
function loadRecommendations() {
  if (!dataPromise) {
    dataPromise = fetch('travel_recommendation_api.json')
      .then(response => {
        if (!response.ok) throw new Error('Unable to load destinations');
        return response.json();
      })
      .then(data => {
        console.log('Travel recommendations loaded:', data);
        return data;
      })
      .catch(error => { dataPromise = undefined; throw error; });
  }
  return dataPromise;
}

function matchRecommendations(data, keyword) {
  const normalized = keyword.trim().toLowerCase();
  if (['beach', 'beaches'].includes(normalized)) return data.beaches;
  if (['temple', 'temples'].includes(normalized)) return data.temples;
  if (['country', 'countries'].includes(normalized)) {
    return data.countries.flatMap(country => country.cities.map(city => ({ ...city, country: country.name })));
  }
  const country = data.countries.find(item => item.name.toLowerCase() === normalized);
  return country ? country.cities.map(city => ({ ...city, country: country.name })) : [];
}

function updateClocks() {
  document.querySelectorAll('[data-time-zone]').forEach(element => {
    element.textContent = 'Local time · ' + new Intl.DateTimeFormat('en-US', {
      timeZone: element.dataset.timeZone, month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    }).format(new Date());
  });
}

function createCard(place) {
  const card = document.createElement('article');
  card.className = 'destination-card';
  const image = document.createElement('img');
  image.src = place.imageUrl;
  image.alt = place.name + ', ' + place.country;
  const body = document.createElement('div');
  body.className = 'card-body';
  const country = document.createElement('span');
  country.className = 'country-label';
  country.textContent = place.country;
  const title = document.createElement('h3');
  title.textContent = place.name;
  const description = document.createElement('p');
  description.textContent = place.description;
  const clock = document.createElement('p');
  clock.className = 'local-time';
  clock.dataset.timeZone = place.timeZone;
  const link = document.createElement('a');
  link.href = place.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Destination guide ↗';
  body.append(country, title, description, clock, link);
  card.append(image, body);
  return card;
}

if (searchForm) {
  searchForm.addEventListener('submit', async event => {
    event.preventDefault();
    const requestVersion = ++searchVersion;
    const keyword = searchInput.value.trim();
    clearInterval(clockTimer);
    results.replaceChildren();
    recommendations.hidden = false;
    if (!keyword) {
      searchStatus.textContent = 'Enter beach, temple, or country to start exploring.';
      searchInput.focus();
      return;
    }
    searchStatus.textContent = 'Loading recommendations…';
    try {
      const data = await loadRecommendations();
      if (requestVersion !== searchVersion) return;
      const places = matchRecommendations(data, keyword);
      searchStatus.textContent = places.length
        ? `${places.length} recommendations for “${keyword}”.`
        : 'No matches found. Try beach, temple, country, Australia, or Japan.';
      places.forEach(place => results.append(createCard(place)));
      updateClocks();
      if (places.length) clockTimer = setInterval(updateClocks, 60000);
      recommendations.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      if (requestVersion !== searchVersion) return;
      searchStatus.textContent = 'Could not load recommendations. Please try again. Run this project through a web server rather than opening the HTML file directly.';
      console.error(error);
    }
  });
  document.getElementById('reset-button').addEventListener('click', () => {
    searchVersion++; // Ignore a fetch still in progress after Reset.
    clearInterval(clockTimer);
    searchInput.value = '';
    results.replaceChildren();
    searchStatus.textContent = '';
    recommendations.hidden = true;
    searchInput.focus();
  });
}

const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', event => {
    event.preventDefault();
    const status = document.getElementById('contact-status');
    const fields = [...contactForm.querySelectorAll('input, textarea')];
    fields.forEach(field => { field.value = field.value.trim(); });
    if (!contactForm.reportValidity()) return;
    try {
      const draft = Object.fromEntries(new FormData(contactForm));
      localStorage.setItem('roam-contact-draft', JSON.stringify(draft));
      status.textContent = 'Your message is saved in this browser. This demo does not send messages.';
      contactForm.reset();
    } catch {
      status.textContent = 'Your browser could not save the message. Please copy it before leaving this page.';
    }
  });
}
