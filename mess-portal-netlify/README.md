# Mess Portal (Netlify)
Pages: index, menu, login, me, leave, feedback, manager, expenses. Backend: netlify/functions/api.mjs (Netlify Blobs storage, signed-token login, scrypt passwords).
## Deploy (must be Git or CLI, NOT drag-and-drop, so functions + @netlify/blobs get installed)
1. Push this folder to GitHub -> Netlify "Add new site > Import project" (build settings come from netlify.toml). OR: `npm i -g netlify-cli && npm i && netlify deploy --prod`.
2. Site settings > Environment variables: set MANAGER_PASSWORD (before first visit!) and SESSION_SECRET (any long random string).
3. Manager login: roll MANAGER + your MANAGER_PASSWORD (default manager123 if unset - change it!).
## Local test
`node dev.mjs` -> http://localhost:3000 (data in .data/). Data on Netlify lives in Blobs; export backups from the Netlify UI/CLI.
