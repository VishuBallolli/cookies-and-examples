const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');
const loggedOut = document.querySelector('#logged-out');
const loggedIn = document.querySelector('#logged-in');
const logoutButton = document.querySelector('#logout-button');
const welcomeTitle = document.querySelector('#welcome-title');
const privateMessage = document.querySelector('#private-message');

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

async function refreshSections() {
  const session = await request('/api/session');
  loggedOut.classList.toggle('hidden', session.authenticated);
  loggedIn.classList.toggle('hidden', !session.authenticated);
  logoutButton.classList.toggle('hidden', !session.authenticated);
  if (session.authenticated) {
    welcomeTitle.textContent = `Welcome, ${session.user.name}.`;
    const privateData = await request('/api/private-data');
    privateMessage.textContent = privateData.tip;
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = '';
  const formData = new FormData(loginForm);
  try {
    await request('/api/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(formData)) });
    await refreshSections();
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.classList.add('error');
  }
});

logoutButton.addEventListener('click', async () => {
  await request('/api/logout', { method: 'POST' });
  await refreshSections();
  window.location.hash = 'members';
});

refreshSections().catch(() => { loginMessage.textContent = 'The server is unavailable.'; });