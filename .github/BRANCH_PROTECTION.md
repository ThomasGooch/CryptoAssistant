# Branch Protection Configuration

This document outlines the recommended branch protection rules for the CryptoAssistant repository.

## 🔒 Main Branch Protection Settings

To configure branch protection for the `main` branch, go to:
**Settings** → **Branches** → **Add rule** → **Branch name pattern: `main`**

### ✅ Required Settings

#### **Protect matching branches**
- [x] **Require a pull request before merging**
  - [x] Require approvals: **1**
  - [x] Dismiss stale PR approvals when new commits are pushed
  - [x] Require review from code owners (if CODEOWNERS file exists)

#### **Require status checks to pass before merging**
- [x] **Require branches to be up to date before merging**
- **Required status checks:**
  - `Build Status` (from build.yml)
  - `Test Status` (from test.yml) 
  - `PR Summary` (from pr-validation.yml)
  - `Build & Test` (from pr-validation.yml)

#### **Additional Restrictions**
- [x] **Restrict pushes that create files larger than 100MB**
- [x] **Require signed commits** (recommended for security)
- [x] **Include administrators** (applies rules to repo admins)

#### **Rules applied to everyone**
- [x] **Allow force pushes: Everyone** (disabled)
- [x] **Allow deletions: Everyone** (disabled)

## 🚦 Required Status Checks

The following GitHub Actions workflows must pass before merging:

### Primary Workflows
1. **Build** (`build.yml`)
   - ✅ Build .NET Backend
   - ✅ Build React Frontend
   - ✅ Build Status

2. **Tests** (`test.yml`) 
   - ✅ Test .NET Backend (depends on build)
   - ✅ Test React Frontend (depends on build)
   - ✅ Test Status

3. **PR Validation** (`pr-validation.yml`)
   - ✅ PR Quality Checks
   - ✅ Code Quality (Lint/Format)
   - ✅ Security Scan
   - ✅ Build & Test
   - ✅ PR Summary

## 📋 Merge Requirements Checklist

Before a PR can be merged to `main`, it must satisfy:

- [ ] **1 approval** from a reviewer
- [ ] **All status checks pass**
- [ ] **Branch is up to date** with main
- [ ] **No merge conflicts**
- [ ] **PR title follows** [Conventional Commits](https://conventionalcommits.org/)
- [ ] **No sensitive files** included
- [ ] **Security scan passes** (no high/critical vulnerabilities)
- [ ] **All tests pass** (backend and frontend)
- [ ] **Code formatting** is correct
- [ ] **Linting passes**

## 🔧 GitHub CLI Setup (Optional)

You can also configure branch protection via GitHub CLI:

```bash
gh api repos/:owner/:repo/branches/main/protection \\
  --method PUT \\
  --field required_status_checks='{"strict":true,"contexts":["Build Status","Test Status","PR Summary","Build & Test"]}' \\
  --field enforce_admins=true \\
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \\
  --field restrictions=null
```

## 🎯 Benefits

This configuration ensures:

- **Code Quality**: Automated linting, formatting, and testing
- **Security**: Vulnerability scanning and sensitive file detection  
- **Reliability**: All builds and tests must pass
- **Review Process**: Required human approval
- **Consistency**: Conventional commit format enforcement
- **Protection**: Prevents accidental direct pushes to main

## 🚀 Quick Setup

1. Navigate to repository **Settings** → **Branches**
2. Click **Add rule**
3. Enter `main` as branch name pattern
4. Enable the checkboxes listed in the **Required Settings** section above
5. Add the required status checks from our GitHub Actions workflows
6. Click **Create** or **Save changes**

Your repository is now protected! 🛡️