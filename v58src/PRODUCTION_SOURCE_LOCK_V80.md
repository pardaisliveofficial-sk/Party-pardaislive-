
## V80 hotfix

Guest Quick Login now creates the guest session through `/api/v1/auth/guest-login` before entering the app. This keeps the guest account resolvable by the Railway backend and allows the existing profile-setup flow to use the real session token.
