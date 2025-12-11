# Login System Documentation

## Overview

The application now uses a session-based authentication system with an accessible login page instead of HTTP Basic Authentication browser dialogs.

## Changes Made

### 1. Dependencies
- Added `express-session` for session management

### 2. New Files
- `views/login.pug` - English login page
- `views/login_fr.pug` - French login page

### 3. Modified Files
- `app.js` - Replaced HTTP Basic Auth with session-based authentication
- `routes/editRoutes.js` - Added login/logout routes and authentication middleware
- `views/edit.pug` - Added logout button
- `package.json` - Added express-session dependency

## Usage

### Accessing the CMS
1. Navigate to `/edit/login` (English) or `/edit/fr/login` (French)
2. Enter credentials:
   - Username: Set via `BASICAUTHUSERNAME` env var (default: "admin")
   - Password: Set via `BASICAUTHPASSWORD` env var (default: "admin")
3. Click "Login"

### Logging Out
- Click the "Logout" button in the top-right corner of any edit page
- Or navigate to `/edit/logout`

## Security Features

### Session Configuration
- HttpOnly cookies (prevents XSS attacks)
- Secure cookies in production (HTTPS only)
- 24-hour session timeout
- Session secret configurable via `SESSION_SECRET` env var

### Authentication Flow
1. Unauthenticated users trying to access `/edit/*` routes are redirected to `/edit/login`
2. Original URL is stored in session for post-login redirect
3. Successful login creates a session and redirects to original URL
4. Logout destroys the session and redirects to home page

## Accessibility Features

### WCAG Compliance
- Proper form labels with `for` attributes
- Required field indicators
- ARIA attributes (`aria-required="true"`)
- Autocomplete attributes for username/password
- Semantic HTML structure
- WET-BOEW compliant styling
- Keyboard navigation support

### Error Handling
- Clear error messages displayed in alert boxes
- Failed login attempts show user-friendly messages
- Errors announced to screen readers via ARIA roles

## Environment Variables

```bash
# Authentication credentials
BASICAUTHUSERNAME=admin  # Default username
BASICAUTHPASSWORD=admin  # Default password

# Session security
SESSION_SECRET=your-secret-key-here  # Change in production!
NODE_ENV=production  # Enables secure cookies
```

## Migration Notes

### Removed Dependencies
The following packages are still in package.json but no longer used:
- `http-auth` - Can be removed in future cleanup
- `http-auth-connect` - Can be removed in future cleanup

### Backward Compatibility
The same environment variables (`BASICAUTHUSERNAME`, `BASICAUTHPASSWORD`) are used, so existing deployments will continue to work without configuration changes.

## Testing

### Local Testing
```bash
npm install
npm run devstart
```

Then visit: http://localhost:3000/edit/login

### Production Deployment
Ensure these environment variables are set:
- `SESSION_SECRET` - Unique random string
- `NODE_ENV=production` - Enables secure cookies
- `BASICAUTHUSERNAME` - Admin username
- `BASICAUTHPASSWORD` - Strong password

## Future Improvements

Potential enhancements:
1. Multiple user accounts with different roles
2. Password reset functionality
3. Two-factor authentication
4. Account lockout after failed attempts
5. Audit logging for admin actions
6. Database-stored user credentials with bcrypt hashing
