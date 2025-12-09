document.addEventListener('DOMContentLoaded', function () {
  // Check if the script is running in a browser extension context
  if (typeof chrome === 'undefined' || !chrome.storage) {
    document.body.innerHTML = `
      <div style="font-family: sans-serif; text-align: center; padding: 20px;">
        <h1>This is a Chrome Extension</h1>
        <p>This page cannot be run as a standalone website.</p>
        <p>Please load the extension in your browser by:</p>
        <ol style="text-align: left; display: inline-block;">
          <li>Opening Chrome and navigating to <code>chrome://extensions</code></li>
          <li>Enabling "Developer mode"</li>
          <li>Clicking "Load unpacked" and selecting the project folder</li>
        </ol>
      </div>
    `;
    return;
  }

  // Check if the user is already logged in
  chrome.storage.sync.get('loggedIn', function (data) {
    if (data.loggedIn) {
      window.location.href = 'popup.html';
    } else {
      const loginButton = document.getElementById('loginButton');
      const emailInput = document.getElementById('emailInput');
      const passwordInput = document.getElementById('passwordInput');

      loginButton.addEventListener('click', function () {
        const email = emailInput.value;
        const password = passwordInput.value;

        // TODO: Implement your actual authentication logic here.
        // For now, we'll just log the credentials and simulate a successful login.
        console.log('Email:', email);
        console.log('Password:', password);

        // Simulate a successful login by setting the loggedIn flag
        chrome.storage.sync.set({ loggedIn: true }, function () {
          window.location.href = 'popup.html';
        });
      });
    }
  });
});
