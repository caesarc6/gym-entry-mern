# Easy Ways to Get Your Firebase UID

Since `auth` isn't available globally, here are **easier methods**:

## Method 1: Use the API Endpoint (Easiest!)

Since you're signed in, your app is making API calls. Just check the Network tab:

1. **Open Developer Tools** (F12)
2. Go to **Network** tab
3. Look for any API call (like `/api/getCurrentUser` or `/api/getCurrentMongoDBUser`)
4. Click on it and check the **Response** tab
5. Your `uid` will be in the response!

Or call it directly in console:

```javascript
// Get your UID from the API
fetch('/api/getCurrentUser', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('firebase-token') || 'your-token'}`
  }
})
.then(r => r.json())
.then(data => console.log('Your UID:', data.uid));
```

## Method 2: Check Local Storage / Session Storage

Firebase might store user info:

```javascript
// Check localStorage
Object.keys(localStorage).forEach(key => {
  if (key.includes('firebase') || key.includes('auth')) {
    console.log(key, localStorage.getItem(key));
  }
});

// Or check sessionStorage
Object.keys(sessionStorage).forEach(key => {
  console.log(key, sessionStorage.getItem(key));
});
```

## Method 3: Use the Migration Status Endpoint

After I add the helper, you can use:

```javascript
// This will be available after you refresh the page
window.getMyUID().then(console.log);
```

## Method 4: Check Network Requests

1. Open **Network** tab in DevTools
2. Filter by **XHR** or **Fetch**
3. Look for requests to `/api/getCurrentUser` or `/api/getCurrentMongoDBUser`
4. Check the **Response** - your UID is there!

## Method 5: Use MongoDB Directly (Most Reliable)

```bash
# Connect to MongoDB
mongosh your-connection-string

# Find your user
use your-database-name
db.users.find({}, { uid: 1, email: 1, name: 1 }).pretty()
```

## Method 6: Add Temporary Console Helper

Add this to your browser console (one-time):

```javascript
// Import Firebase auth
import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js').then(() => {
  return import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
}).then(() => {
  // This won't work because Firebase needs to be initialized
  // But you can check the app's Firebase instance
  console.log('Check your app\'s Firebase config');
});
```

## **RECOMMENDED: Use the API Response**

The easiest way is to check what your app is already doing:

1. **Open Network tab** in DevTools
2. **Refresh the page** or navigate around
3. **Find any API call** that returns user data
4. **Check the Response** - your `uid` is there!

Or, if you see API calls in the Network tab, right-click one and **Copy as cURL**, then you can see the full request/response.

## Quick Test Script

Once you have your UID, test the migration:

```bash
node backend/scripts/test-migration.js <your-uid> <your-email>
```

## Alternative: Check Your App's State

If your app uses React DevTools:
1. Install React DevTools extension
2. Inspect your Navbar or any component that has `uid` state
3. Check the component's state/props - `uid` will be there!
