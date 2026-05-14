# Careflow Admin CI/CD Deployment and Rollback Guide

## 1. Purpose of This Document

This document explains the complete CI/CD deployment and rollback setup for the Careflow Admin frontend.

It covers:

1. What we configured
2. Why we configured it this way
3. How the deployment works
4. How the rollback works
5. Where releases and backups are stored
6. Where to find rollback versions in GitHub
7. How to rollback to latest backup, previous release, specific release, and specific backup
8. What files are protected during deployment
9. How to troubleshoot common issues

---

## 2. Project Details

### 2.1 Application

```text
Careflow Admin
```

### 2.2 Frontend Technology

```text
React.js
```

### 2.3 GitHub Repository

```text
https://github.com/sigitechofficial/careflow-admin
```

### 2.4 Live Admin URL

```text
https://careflowadmin.sigisolutions.net/
```

### 2.5 VPS IP

```text
31.97.131.81
```

### 2.6 cPanel User

```text
sigisolutions
```

### 2.7 Live Deployment Folder

```text
/home/sigisolutions/careflowadmin.sigisolutions.net
```

This is the public folder served by cPanel/Apache for the admin frontend.

---

## 3. Why We Chose This CI/CD Approach

When we checked the live admin folder on the VPS, it contained only built frontend files:

```text
index.html
assets/
.htaccess
.well-known/
cgi-bin/
```

It did not contain the React source project files:

```text
package.json
src/
.git/
node_modules/
```

This means the VPS folder is a public deployment folder, not a source code folder.

Because of that, the correct production approach is:

```text
GitHub repo
→ GitHub Actions builds React project
→ GitHub uploads final build files only
→ VPS public folder receives production files only
```

We did not clone the full React project inside the public folder because that would expose unnecessary files and make the live folder messy.

The live folder should only contain production assets.

---

## 4. Final CI/CD Architecture

The CI/CD flow is:

```text
Developer pushes code to main branch
→ GitHub Actions starts deployment workflow
→ GitHub installs dependencies
→ GitHub builds React project
→ GitHub packages the build
→ GitHub uploads package to VPS
→ VPS creates backup of current live folder
→ VPS extracts new release
→ VPS syncs new release to live folder
→ VPS keeps .htaccess and cPanel folders safe
→ GitHub checks live URL
→ Deployment completes
```

---

## 5. GitHub Actions Workflow Files

We created two workflows.

### 5.1 Deployment Workflow

File path:

```text
.github/workflows/deploy-admin.yml
```

GitHub Actions name:

```text
Deploy Careflow Admin
```

Purpose:

```text
Build and deploy the Careflow Admin frontend.
```

This runs automatically when code is pushed to:

```text
main
```

It can also be run manually from GitHub Actions.

GitHub UI path:

```text
GitHub repo
→ Actions
→ Deploy Careflow Admin
```

---

### 5.2 Rollback Workflow

File path:

```text
.github/workflows/rollback-admin.yml
```

GitHub Actions name:

```text
Rollback Careflow Admin
```

Purpose:

```text
Rollback the Careflow Admin frontend from GitHub UI.
```

This runs manually only.

GitHub UI path:

```text
GitHub repo
→ Actions
→ Rollback Careflow Admin
→ Run workflow
```

---

## 6. Required GitHub Secrets

Go to:

```text
GitHub repo
→ Settings
→ Secrets and variables
→ Actions
→ Repository secrets
```

The following secrets are required.

| Secret Name | Value |
|---|---|
| VPS_HOST | 31.97.131.81 |
| VPS_PORT | 22 |
| VPS_USER | sigisolutions |
| VPS_SSH_KEY | Private SSH key used by GitHub Actions |
| ADMIN_DEPLOY_PATH | /home/sigisolutions/careflowadmin.sigisolutions.net |
| ADMIN_APP_URL | https://careflowadmin.sigisolutions.net/ |

Optional frontend build secrets:

| Secret Name | Example Value | When Needed |
|---|---|---|
| VITE_API_BASE_URL | https://careflowbackend.sigisolutions.net | If project uses Vite |
| REACT_APP_API_BASE_URL | https://careflowbackend.sigisolutions.net | If project uses Create React App |

Important note:

```text
ADMIN_APP_URL is not a password.
It is only the live admin URL used for the final deployment smoke check.
```

It is used by the deployment workflow to check whether the admin panel is reachable after deployment.

Example:

```bash
curl -fsS --retry 3 "$APP_URL" > /dev/null
```

---

## 7. SSH Key Setup

GitHub Actions connects to the VPS using SSH.

The SSH key was created on the VPS under the cPanel user:

```text
/home/sigisolutions/.ssh/github_actions_careflow_admin
```

The public key was added to:

```text
/home/sigisolutions/.ssh/authorized_keys
```

The private key was copied into GitHub as this secret:

```text
VPS_SSH_KEY
```

To check SSH files on the VPS:

```bash
ls -la /home/sigisolutions/.ssh
```

Expected files include:

```text
authorized_keys
github_actions_careflow_admin
github_actions_careflow_admin.pub
```

Important:

```text
Never share the private SSH key in chat, email, screenshots, or public documents.
```

---

## 8. VPS Folder Structure

The CI/CD setup uses the following VPS folders.

### 8.1 Live Folder

```text
/home/sigisolutions/careflowadmin.sigisolutions.net
```

This is the public cPanel folder where the admin website is served from.

This folder should contain only production frontend files.

Example:

```text
index.html
assets/
.htaccess
.well-known/
cgi-bin/
release.json
```

---

### 8.2 Deployment Root Folder

```text
/home/sigisolutions/deployments/careflow-admin
```

This folder is used by the CI/CD system to manage releases, backups, logs, and rollback files.

Inside it, we have:

```text
/home/sigisolutions/deployments/careflow-admin/incoming
/home/sigisolutions/deployments/careflow-admin/releases
/home/sigisolutions/deployments/careflow-admin/backups
/home/sigisolutions/deployments/careflow-admin/logs
/home/sigisolutions/deployments/careflow-admin/current-release.txt
```

---

## 9. Meaning of Each Deployment Folder

### 9.1 incoming

Path:

```text
/home/sigisolutions/deployments/careflow-admin/incoming
```

Purpose:

```text
GitHub uploads the packaged release file here before deployment.
```

Example file:

```text
79a7f38cb45b0bcf58044ea2e1f42d8a70bd39bd.tar.gz
```

---

### 9.2 releases

Path:

```text
/home/sigisolutions/deployments/careflow-admin/releases
```

Purpose:

```text
Every successful deployment is extracted into a release folder.
```

Each release folder is named using the Git commit SHA.

Example release folders:

```text
79a7f38cb45b0bcf58044ea2e1f42d8a70bd39bd
f34cc647f50bda273e4867f79ef0fb599ed65f7d
d9b127e47b06c41ae5e5dd3593820f0cd7db591
```

These release folders are used for rollback to a specific release.

---

### 9.3 backups

Path:

```text
/home/sigisolutions/deployments/careflow-admin/backups
```

Purpose:

```text
Before every deployment, the current live folder is backed up.
```

Example backup files:

```text
backup-20260513193209.tar.gz
backup-20260513192941.tar.gz
backup-20260513192023.tar.gz
backup-20260513185927.tar.gz
```

Backup naming format:

```text
backup-YYYYMMDDHHMMSS.tar.gz
```

Example:

```text
backup-20260513193209.tar.gz
```

This means the backup was created on:

```text
2026-05-13 at 19:32:09
```

These backup files are used for rollback to a specific backup.

---

### 9.4 logs

Path:

```text
/home/sigisolutions/deployments/careflow-admin/logs
```

Purpose:

```text
Stores deployment and rollback logs.
```

Files:

```text
deployments.log
rollbacks.log
```

---

### 9.5 current-release.txt

Path:

```text
/home/sigisolutions/deployments/careflow-admin/current-release.txt
```

Purpose:

```text
Stores the currently active release SHA.
```

Example content:

```text
79a7f38cb45b0bcf58044ea2e1f42d8a70bd39bd
```

---

## 10. How Deployment Works

### 10.1 Developer Pushes Code

A developer pushes code to the main branch.

Example:

```bash
git add .
git commit -m "Update Careflow admin"
git push origin main
```

---

### 10.2 GitHub Actions Starts Automatically

GitHub starts:

```text
Deploy Careflow Admin
```

Path:

```text
GitHub repo
→ Actions
→ Deploy Careflow Admin
```

---

### 10.3 Build Job Runs

The build job does the following:

```text
Checkout repository
Setup Node.js 20
Install dependencies using npm ci
Build production files using npm run build
Detect build output folder
Validate index.html exists
Create release.json
Package build folder into careflow-admin-release.tar.gz
Upload package as GitHub artifact
```

The workflow supports both common React build folders.

For Vite:

```text
dist/
```

For Create React App:

```text
build/
```

The workflow automatically detects which one exists.

---

### 10.4 Deploy Job Runs

The deploy job does the following:

```text
Download build artifact
Configure SSH access
Verify SSH connection
Create deployment folders on VPS
Upload release package to VPS
Extract release into releases folder
Create backup of current live folder
Sync new release to live folder
Preserve protected files
Create .htaccess if missing
Update current-release.txt
Run live URL smoke check
Clean old releases and backups
Complete deployment
```

---

## 11. Files Protected During Deployment

The deployment uses rsync with exclusions.

Protected files and folders:

```text
.htaccess
.well-known
cgi-bin
.env
.env.*
*.pem
*.key
```

This means deployment will not delete or overwrite these files and folders inside the live folder.

Important:

```text
Even though .env is protected, real secrets should still not be stored in the public frontend folder.
```

---

## 12. Frontend Environment Variables

React frontend environment variables are injected at build time.

This means:

```text
The frontend does not read .env from the VPS after deployment.
```

The values are bundled into JavaScript during:

```bash
npm run build
```

For Vite, use:

```text
VITE_API_BASE_URL
```

For Create React App, use:

```text
REACT_APP_API_BASE_URL
```

Important:

```text
Frontend environment variables are visible in the browser after build.
Do not put private secrets in frontend environment variables.
```

Allowed frontend values:

```text
API base URL
public Firebase config
public map key with restrictions
app environment name
public app URL
```

Never put these in frontend:

```text
database password
JWT secret
SMTP password
Stripe secret key
private API keys
server private keys
service account JSON
```

---

## 13. .htaccess and React Routing

React routes are browser routes, not real Apache folders.

Example React route:

```text
https://careflowadmin.sigisolutions.net/employee/staff-list
```

Without correct `.htaccess`, Apache tries to find:

```text
/employee/staff-list
```

as a real server folder and may return:

```text
404 Not Found
```

The `.htaccess` file must exist here:

```text
/home/sigisolutions/careflowadmin.sigisolutions.net/.htaccess
```

Recommended `.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteRule ^ index.html [L]
</IfModule>
```

The deployment workflow protects `.htaccess`, so future deployments should not delete it.

---

## 14. Automatic Rollback During Failed Deployment

The deployment workflow has automatic rollback protection.

Before replacing the live folder, the workflow creates a backup of the current live version.

If deployment fails after that backup is created, the workflow automatically restores the backup.

Example failure we faced:

```text
ADMIN_APP_URL was empty
curl failed because APP_URL was blank
workflow started automatic rollback
rollback completed successfully
```

The log showed:

```text
Deployment failed. Starting rollback...
Rollback completed.
```

This means production was protected.

---

## 15. Manual Rollback From GitHub UI

Manual rollback is handled through:

```text
Rollback Careflow Admin
```

GitHub path:

```text
GitHub repo
→ Actions
→ Rollback Careflow Admin
→ Run workflow
```

Rollback options:

```text
list-available
latest-backup
previous-release
specific-release
specific-backup
```

---

## 16. Very Important: Where Releases and Backups Are Shown

GitHub does not show VPS releases and backups as dropdown options.

You will see available releases and backups inside the rollback workflow logs.

To see them:

```text
GitHub repo
→ Actions
→ Rollback Careflow Admin
→ Run workflow
```

Choose:

```text
rollback_type = list-available
target = empty
confirmation = empty
```

Run the workflow.

Then open:

```text
GitHub repo
→ Actions
→ Rollback Careflow Admin
→ Click the latest workflow run
→ Click job: Rollback Admin From GitHub UI
→ Open step: Run rollback command on VPS
```

Inside that step log, you will see:

```text
Current release:

Available releases:

Available backups:

Available pre-rollback backups:
```

Example:

```text
Current release:
79a7f38cb45b0bcf58044ea2e1f42d8a70bd39bd

Available releases:
79a7f38cb45b0bcf58044ea2e1f42d8a70bd39bd
f34cc647f50bda273e4867f79ef0fb599ed65f7d
d9b127e47b06c41ae5e5dd3593820f0cd7db591

Available backups:
backup-20260513193209.tar.gz
backup-20260513192941.tar.gz
backup-20260513192023.tar.gz
backup-20260513185927.tar.gz
```

You copy the release SHA or backup filename from those logs and use it in the next rollback run.

---

## 17. Rollback Option: list-available

Purpose:

```text
Show available releases and backups.
```

This option does not change the live website.

Use it before doing a specific rollback.

GitHub UI values:

```text
rollback_type = list-available
target = empty
confirmation = empty
```

Where to see result:

```text
Actions
→ Rollback Careflow Admin
→ Latest run
→ Rollback Admin From GitHub UI
→ Run rollback command on VPS
```

---

## 18. Rollback Option: latest-backup

Purpose:

```text
Restore the latest backup file.
```

Use this when:

```text
The latest deployment caused an issue and you want to restore the version that was live before it.
```

GitHub UI values:

```text
rollback_type = latest-backup
target = empty
confirmation = ROLLBACK
```

The confirmation must be exactly:

```text
ROLLBACK
```

---

## 19. Rollback Option: previous-release

Purpose:

```text
Restore the previous release folder, excluding the currently active release.
```

Use this when:

```text
You want to rollback to the previous deployed commit.
```

GitHub UI values:

```text
rollback_type = previous-release
target = empty
confirmation = ROLLBACK
```

Example:

Current release:

```text
79a7f38cb45b0bcf58044ea2e1f42d8a70bd39bd
```

Available releases:

```text
79a7f38cb45b0bcf58044ea2e1f42d8a70bd39bd
f34cc647f50bda273e4867f79ef0fb599ed65f7d
d9b127e47b06c41ae5e5dd3593820f0cd7db591
```

The previous release will usually be:

```text
f34cc647f50bda273e4867f79ef0fb599ed65f7d
```

---

## 20. Rollback Option: specific-release

Purpose:

```text
Rollback to one exact release folder.
```

Use this when:

```text
You know the exact release SHA you want to restore.
```

Step 1: list available releases.

```text
rollback_type = list-available
target = empty
confirmation = empty
```

Step 2: check logs here.

```text
Actions
→ Rollback Careflow Admin
→ Latest run
→ Rollback Admin From GitHub UI
→ Run rollback command on VPS
```

Step 3: copy a release SHA from:

```text
Available releases:
```

Example release SHA:

```text
f34cc647f50bda273e4867f79ef0fb599ed65f7d
```

Step 4: run rollback.

```text
rollback_type = specific-release
target = f34cc647f50bda273e4867f79ef0fb599ed65f7d
confirmation = ROLLBACK
```

This restores:

```text
/home/sigisolutions/deployments/careflow-admin/releases/f34cc647f50bda273e4867f79ef0fb599ed65f7d
```

---

## 21. Rollback Option: specific-backup

Purpose:

```text
Rollback to one exact backup snapshot.
```

Use this when:

```text
You want to restore the exact live folder snapshot captured before a deployment.
```

Step 1: list available backups.

```text
rollback_type = list-available
target = empty
confirmation = empty
```

Step 2: check logs here.

```text
Actions
→ Rollback Careflow Admin
→ Latest run
→ Rollback Admin From GitHub UI
→ Run rollback command on VPS
```

Step 3: copy a backup filename from:

```text
Available backups:
```

Example backup filename:

```text
backup-20260513192941.tar.gz
```

Step 4: run rollback.

```text
rollback_type = specific-backup
target = backup-20260513192941.tar.gz
confirmation = ROLLBACK
```

This restores:

```text
/home/sigisolutions/deployments/careflow-admin/backups/backup-20260513192941.tar.gz
```

---

## 22. Difference Between Release and Backup

### 22.1 Release

A release is the final React build created by GitHub Actions.

Stored here:

```text
/home/sigisolutions/deployments/careflow-admin/releases
```

Named by:

```text
Git commit SHA
```

Example:

```text
79a7f38cb45b0bcf58044ea2e1f42d8a70bd39bd
```

Use release rollback when:

```text
You want to rollback to a known deployed commit.
```

---

### 22.2 Backup

A backup is a compressed snapshot of the live folder before a new deployment replaced it.

Stored here:

```text
/home/sigisolutions/deployments/careflow-admin/backups
```

Named by timestamp:

```text
backup-YYYYMMDDHHMMSS.tar.gz
```

Example:

```text
backup-20260513192941.tar.gz
```

Use backup rollback when:

```text
You want to restore exactly what was live before a particular deployment.
```

---

## 23. Recommended Rollback Choice

For most normal cases:

```text
Use previous-release
```

For exact commit based rollback:

```text
Use specific-release
```

For restoring an exact live folder snapshot:

```text
Use specific-backup
```

For quickly undoing the latest deployment:

```text
Use latest-backup
```

---

## 24. Pre-Rollback Backup

Before every manual rollback, the rollback workflow creates a backup of the currently live folder.

These files look like:

```text
pre-rollback-YYYYMMDDHHMMSS.tar.gz
```

They are stored in:

```text
/home/sigisolutions/deployments/careflow-admin/backups
```

Purpose:

```text
If the rollback was wrong, we can restore the version that was live before rollback.
```

They are shown under:

```text
Available pre-rollback backups:
```

when running:

```text
rollback_type = list-available
```

---

## 25. How to Check Releases and Backups Directly From VPS

SSH into the VPS as:

```text
sigisolutions
```

Check releases:

```bash
ls -lt /home/sigisolutions/deployments/careflow-admin/releases
```

Check backups:

```bash
ls -lt /home/sigisolutions/deployments/careflow-admin/backups
```

Check current release:

```bash
cat /home/sigisolutions/deployments/careflow-admin/current-release.txt
```

Check deployment logs:

```bash
cat /home/sigisolutions/deployments/careflow-admin/logs/deployments.log
```

Check rollback logs:

```bash
cat /home/sigisolutions/deployments/careflow-admin/logs/rollbacks.log
```

---

## 26. How to Verify Website After Deployment

Open:

```text
https://careflowadmin.sigisolutions.net/
```

Also test a direct React route:

```text
https://careflowadmin.sigisolutions.net/employee/staff-list
```

Terminal check:

```bash
curl -I https://careflowadmin.sigisolutions.net/
```

Expected response:

```text
HTTP/2 200
```

Direct route check:

```bash
curl -I https://careflowadmin.sigisolutions.net/employee/staff-list
```

Expected response:

```text
HTTP/2 200
```

If direct route returns 404, check `.htaccess`.

---

## 27. Manual Emergency Rollback From VPS

If GitHub Actions is not available, rollback can be done directly from the VPS.

### 27.1 Rollback to Latest Backup

```bash
LIVE_PATH="/home/sigisolutions/careflowadmin.sigisolutions.net"
DEPLOY_ROOT="/home/sigisolutions/deployments/careflow-admin"
ROLLBACK_TEMP="$DEPLOY_ROOT/manual-rollback-temp"

LATEST_BACKUP=$(ls -1t "$DEPLOY_ROOT/backups"/backup-*.tar.gz | head -n 1)

echo "Rolling back using:"
echo "$LATEST_BACKUP"

rm -rf "$ROLLBACK_TEMP"
mkdir -p "$ROLLBACK_TEMP"

tar -xzf "$LATEST_BACKUP" -C "$ROLLBACK_TEMP"

rsync -az --delete \
  --exclude=".htaccess" \
  --exclude=".well-known" \
  --exclude="cgi-bin" \
  --exclude=".env" \
  --exclude=".env.*" \
  --exclude="*.pem" \
  --exclude="*.key" \
  "$ROLLBACK_TEMP/" "$LIVE_PATH/"

rm -rf "$ROLLBACK_TEMP"

curl -fsS --retry 3 https://careflowadmin.sigisolutions.net/ > /dev/null

echo "Rollback completed successfully."
```

---

### 27.2 Rollback to Specific Backup

Replace the backup filename before running.

```bash
LIVE_PATH="/home/sigisolutions/careflowadmin.sigisolutions.net"
DEPLOY_ROOT="/home/sigisolutions/deployments/careflow-admin"
ROLLBACK_TEMP="$DEPLOY_ROOT/manual-rollback-temp"
BACKUP_FILE="$DEPLOY_ROOT/backups/backup-20260513192941.tar.gz"

rm -rf "$ROLLBACK_TEMP"
mkdir -p "$ROLLBACK_TEMP"

tar -xzf "$BACKUP_FILE" -C "$ROLLBACK_TEMP"

rsync -az --delete \
  --exclude=".htaccess" \
  --exclude=".well-known" \
  --exclude="cgi-bin" \
  --exclude=".env" \
  --exclude=".env.*" \
  --exclude="*.pem" \
  --exclude="*.key" \
  "$ROLLBACK_TEMP/" "$LIVE_PATH/"

rm -rf "$ROLLBACK_TEMP"

curl -fsS --retry 3 https://careflowadmin.sigisolutions.net/ > /dev/null

echo "Rollback completed successfully."
```

---

### 27.3 Rollback to Specific Release

Replace the release folder name before running.

```bash
LIVE_PATH="/home/sigisolutions/careflowadmin.sigisolutions.net"
RELEASE_PATH="/home/sigisolutions/deployments/careflow-admin/releases/f34cc647f50bda273e4867f79ef0fb599ed65f7d"

rsync -az --delete \
  --exclude=".htaccess" \
  --exclude=".well-known" \
  --exclude="cgi-bin" \
  --exclude=".env" \
  --exclude=".env.*" \
  --exclude="*.pem" \
  --exclude="*.key" \
  "$RELEASE_PATH/" "$LIVE_PATH/"

echo "$(basename "$RELEASE_PATH")" > /home/sigisolutions/deployments/careflow-admin/current-release.txt

curl -fsS --retry 3 https://careflowadmin.sigisolutions.net/ > /dev/null

echo "Release rollback completed successfully."
```

---

## 28. Common Issues and Fixes

### 28.1 ESLint Failed in CI

Error:

```text
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```

Reason:

```text
The project had a lint script, but ESLint v9 requires eslint.config.js.
```

Current fix:

```text
Lint was removed from the deployment workflow for now.
```

Future improvement:

```text
Add proper eslint.config.js and then enable lint again in CI.
```

---

### 28.2 SSH Keyscan Failed

Error:

```text
ssh-keyscan failed
```

Reason:

```text
Temporary SSH reachability issue between GitHub runner and VPS.
```

Fix added:

```text
The workflow retries ssh-keyscan multiple times.
```

If it happens again:

```text
GitHub Actions
→ Failed run
→ Re-run failed jobs
```

---

### 28.3 ADMIN_APP_URL Missing

Error:

```text
curl: (3) URL using bad/illegal format or missing URL
APP_URL=""
```

Reason:

```text
ADMIN_APP_URL was missing from GitHub secrets.
```

Fix:

```text
Add ADMIN_APP_URL = https://careflowadmin.sigisolutions.net/
```

---

### 28.4 Direct React Route Gives 404

Example:

```text
https://careflowadmin.sigisolutions.net/employee/staff-list
```

Reason:

```text
Apache cannot serve React browser routes without .htaccess rewrite rules.
```

Fix:

```bash
cat /home/sigisolutions/careflowadmin.sigisolutions.net/.htaccess
```

Make sure it contains:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteRule ^ index.html [L]
</IfModule>
```

---

## 29. Security Rules

The public admin folder should not contain private files.

Do not store these in:

```text
/home/sigisolutions/careflowadmin.sigisolutions.net
```

Do not store:

```text
.env
.env.production
database passwords
JWT secrets
SMTP passwords
Stripe secret keys
private SSH keys
service account JSON files
GitHub tokens
```

Check for sensitive files:

```bash
cd /home/sigisolutions/careflowadmin.sigisolutions.net

find . -maxdepth 3 -type f \( \
  -name ".env" -o \
  -name ".env.*" -o \
  -iname "*secret*" -o \
  -iname "*password*" -o \
  -iname "*private*" -o \
  -iname "*.pem" -o \
  -iname "*.key" \
\) -print
```

If this returns any files, review them and move real secrets outside the public folder.

Recommended private config location:

```text
/home/sigisolutions/private-config
```

---

## 30. Complete Deployment Summary

```text
Developer pushes code to main
GitHub Actions starts Deploy Careflow Admin
GitHub installs dependencies
GitHub builds React project
GitHub packages build output
GitHub uploads release package to VPS
VPS extracts release into releases folder
VPS backs up current live folder
VPS syncs new release to live folder
VPS preserves .htaccess and cPanel files
VPS checks live admin URL
VPS logs deployment
Deployment completes
```

---

## 31. Complete Rollback Summary

```text
User opens GitHub Actions
User opens Rollback Careflow Admin
User first runs list-available
User checks logs under Run rollback command on VPS
User copies release SHA or backup filename
User runs rollback again with selected rollback type
User types ROLLBACK in confirmation field
Workflow creates pre-rollback backup
Workflow restores selected release or backup
Workflow updates current-release.txt
Workflow checks live admin URL
Workflow logs rollback
Rollback completes
```

---

## 32. Where to Find Important Things

| Item | Location |
|---|---|
| Deployment workflow | .github/workflows/deploy-admin.yml |
| Rollback workflow | .github/workflows/rollback-admin.yml |
| Live admin folder | /home/sigisolutions/careflowadmin.sigisolutions.net |
| Deployment root | /home/sigisolutions/deployments/careflow-admin |
| Release folders | /home/sigisolutions/deployments/careflow-admin/releases |
| Backup files | /home/sigisolutions/deployments/careflow-admin/backups |
| Deployment logs | /home/sigisolutions/deployments/careflow-admin/logs/deployments.log |
| Rollback logs | /home/sigisolutions/deployments/careflow-admin/logs/rollbacks.log |
| Current release | /home/sigisolutions/deployments/careflow-admin/current-release.txt |
| Deployment runs in GitHub | Actions → Deploy Careflow Admin |
| Rollback runs in GitHub | Actions → Rollback Careflow Admin |
| Available releases and backups | Rollback workflow logs → Run rollback command on VPS |

---

## 33. Most Important Operational Rule

Before doing a specific rollback, always run:

```text
rollback_type = list-available
```

Then check the logs here:

```text
GitHub repo
→ Actions
→ Rollback Careflow Admin
→ Latest run
→ Rollback Admin From GitHub UI
→ Run rollback command on VPS
```

Copy the release SHA or backup filename from the logs.

Then run rollback with:

```text
confirmation = ROLLBACK
```

Do not guess release or backup names.

---

## 34. Recommended Normal Usage

### Deploy

Push to main:

```bash
git add .
git commit -m "Update Careflow admin"
git push origin main
```

Then monitor:

```text
GitHub repo
→ Actions
→ Deploy Careflow Admin
```

---

### Check Available Rollbacks

Run:

```text
Actions
→ Rollback Careflow Admin
→ Run workflow
```

Use:

```text
rollback_type = list-available
target = empty
confirmation = empty
```

Then check:

```text
Latest run
→ Rollback Admin From GitHub UI
→ Run rollback command on VPS
```

---

### Rollback to Previous Release

Use:

```text
rollback_type = previous-release
target = empty
confirmation = ROLLBACK
```

---

### Rollback to Specific Release

Use:

```text
rollback_type = specific-release
target = copied release SHA
confirmation = ROLLBACK
```

---

### Rollback to Specific Backup

Use:

```text
rollback_type = specific-backup
target = copied backup filename
confirmation = ROLLBACK
```

---

## 35. Current Final Status

The deployment pipeline is working.

The rollback workflow is also working.

The current system supports:

```text
Automatic deployment on push to main
Manual deployment from GitHub UI
Automatic rollback if deployment fails
Manual rollback from GitHub UI
Rollback to latest backup
Rollback to previous release
Rollback to specific release
Rollback to specific backup
Release and backup listing from workflow logs
Protected .htaccess
Protected cPanel folders
Protected .env and key files
Live URL smoke check
Deployment history on VPS
Rollback history on VPS
```
