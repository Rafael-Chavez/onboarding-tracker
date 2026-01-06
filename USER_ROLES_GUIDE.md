# User Roles Management Guide (No Database Required)

Your app now uses **localStorage** to manage user roles instead of requiring PostgreSQL. This makes it much simpler to run locally!

## How It Works

User roles are stored in your browser's localStorage with this mapping:

```javascript
{
  'rchavez@deconetwork.com': { role: 'admin', employeeId: 1 },
  'jim@deconetwork.com': { role: 'team', employeeId: 3 },
  'marc@deconetwork.com': { role: 'team', employeeId: 4 },
  'danreb@deconetwork.com': { role: 'team', employeeId: 2 },
  'steve@deconetwork.com': { role: 'team', employeeId: 5 },
  'erick@deconetwork.com': { role: 'team', employeeId: 6 }
}
```

## Current Users

**Admin:**
- `rchavez@deconetwork.com` → Rafael (Admin Dashboard)

**Team Members:**
- `jim@deconetwork.com` → Jim (Employee #3)
- `marc@deconetwork.com` → Marc (Employee #4)
- `danreb@deconetwork.com` → Danreb (Employee #2)
- `steve@deconetwork.com` → Steve (Employee #5)
- `erick@deconetwork.com` → Erick (Employee #6)

## How to Add or Modify Users

### Option 1: Using Browser Console (Easiest)

1. Open your browser console (F12)
2. Run this command to see current roles:
```javascript
JSON.parse(localStorage.getItem('userRoles'))
```

3. To add/modify a user:
```javascript
// Get current roles
let roles = JSON.parse(localStorage.getItem('userRoles'));

// Add a new user
roles['newuser@deconetwork.com'] = { role: 'team', employeeId: 3 };

// Change someone to admin
roles['jim@deconetwork.com'] = { role: 'admin', employeeId: 3 };

// Save back to localStorage
localStorage.setItem('userRoles', JSON.stringify(roles));
```

4. Refresh the page for changes to take effect

### Option 2: Edit AuthContext.jsx

1. Open [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx)
2. Find the `getDefaultUserRoles()` function (around line 41)
3. Add or modify users:
```javascript
const getDefaultUserRoles = () => ({
  'rchavez@deconetwork.com': { role: 'admin', employeeId: 1 },
  'newuser@deconetwork.com': { role: 'team', employeeId: 3 },  // Add new user
  // ... rest of users
});
```
4. Clear localStorage and refresh:
```javascript
localStorage.removeItem('userRoles');  // In browser console
```
5. Refresh the page - roles will reinitialize

## Employee IDs

Match these to the employee list:
- 1 = Rafael
- 2 = Danreb
- 3 = Jim
- 4 = Marc
- 5 = Steve
- 6 = Erick

## Testing

1. **Create Firebase accounts** for all users:
   - Go to [Firebase Console → Authentication](https://console.firebase.google.com/project/onboarding-tracker-85a6d/authentication/users)
   - Click "Add user" for each email
   - Set passwords

2. **Test team member login:**
   - Log in with `jim@deconetwork.com`
   - Should see Team Dashboard
   - Can submit onboarding sessions

3. **Test admin login:**
   - Log in with `rchavez@deconetwork.com`
   - Should see Admin Calendar Dashboard
   - Can see all submissions

## Resetting Roles

If you need to reset to defaults:

```javascript
// In browser console
localStorage.removeItem('userRoles');
location.reload();  // Refresh page
```

## Benefits of This Approach

✅ No PostgreSQL database needed
✅ No backend server required for auth
✅ Easy to modify roles
✅ Works completely locally
✅ All data in localStorage + Google Sheets
✅ Simple to understand and maintain

## Notes

- Roles are stored per browser (localStorage is browser-specific)
- If you clear browser data, roles will reset to defaults
- Each team member only needs their Firebase credentials
- Submissions sync to Google Sheets automatically
