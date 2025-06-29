# 🔄 API Migration Guide: Fetch to Axios

This guide helps you migrate the remaining components from fetch methods to axios methods.

## 🎯 **What's Already Fixed:**

✅ `frontend/src/pages/HomePage.jsx` - Fixed
✅ `frontend/src/pages/ProfilePage.jsx` - Fixed  
✅ `frontend/src/components/Navbar.jsx` - Fixed
✅ `frontend/src/config/api.js` - Fixed

## 📋 **Remaining Files to Fix:**

### **High Priority (Critical for functionality):**

- [ ] `frontend/src/pages/UserProfilePage.jsx`
- [ ] `frontend/src/pages/SignUpFlow.jsx`
- [ ] `frontend/src/components/Hero.jsx`
- [ ] `frontend/src/components/PrivacySettings.jsx`

### **Medium Priority:**

- [ ] `frontend/src/pages/ModifyProfile.jsx`
- [ ] `frontend/src/components/hero9-header.tsx`

## 🔧 **Migration Pattern:**

### **Before (Fetch):**

```javascript
const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(data),
});

if (!response.ok) {
  throw new Error(await response.text());
}
const data = await response.json();
```

### **After (Axios):**

```javascript
const response = await apiClient.post(API_ENDPOINTS.ENDPOINT_NAME, data);
const data = response.data;
```

## 📝 **Quick Fix Commands:**

### **For UserProfilePage.jsx:**

```bash
# Replace all instances of:
# response.ok → response.status === 200
# response.text() → response.data
# response.json() → response.data
```

### **For SignUpFlow.jsx:**

```bash
# Replace fetch calls with apiClient calls
# Use API_ENDPOINTS.PROTECTED instead of hardcoded URLs
```

### **For Hero.jsx:**

```bash
# Same pattern as Navbar.jsx
# Replace fetch with apiClient
# Use API_ENDPOINTS instead of hardcoded URLs
```

## 🚀 **Quick Migration Steps:**

1. **Import the API configuration:**

   ```javascript
   import { API_ENDPOINTS, apiClient } from "../config/api";
   ```

2. **Replace fetch calls:**

   ```javascript
   // Old
   const response = await fetch(url, options);
   if (!response.ok) throw new Error(await response.text());
   const data = await response.json();

   // New
   const response = await apiClient.post(API_ENDPOINTS.ENDPOINT_NAME, data);
   const data = response.data;
   ```

3. **Update error handling:**

   ```javascript
   // Old
   if (!response.ok) throw new Error(await response.text());

   // New
   // Axios automatically throws on non-2xx status codes
   // Just use try/catch
   ```

## 🎯 **Priority Order:**

1. **UserProfilePage.jsx** - Most critical for user functionality
2. **SignUpFlow.jsx** - Critical for authentication
3. **Hero.jsx** - Important for landing page
4. **PrivacySettings.jsx** - User settings functionality
5. **ModifyProfile.jsx** - Profile editing
6. **hero9-header.tsx** - Header component

## 🔍 **Testing After Migration:**

1. **Test authentication flow**
2. **Test user profile loading**
3. **Test API calls in browser console**
4. **Check for any remaining fetch errors**

## 💡 **Pro Tips:**

- **Use the API_ENDPOINTS object** instead of hardcoded URLs
- **Let axios handle errors** - it throws automatically on non-2xx responses
- **Check response.data** instead of calling .json()
- **Remove response.ok checks** - axios handles this automatically

## 🆘 **If You Get Stuck:**

1. **Check the browser console** for specific error messages
2. **Compare with the fixed files** (HomePage.jsx, ProfilePage.jsx)
3. **Use the API_ENDPOINTS** from the config file
4. **Test one component at a time**

## ✅ **Success Criteria:**

- [ ] No more "response.text is not a function" errors
- [ ] No more "response.json is not a function" errors
- [ ] All API calls use the new configuration
- [ ] Authentication works properly
- [ ] User profiles load correctly
