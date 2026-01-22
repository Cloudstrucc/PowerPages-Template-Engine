# Power Pages Template Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive deployment toolkit for applying custom templates, themes, and GCWeb (Government of Canada Web Experience Toolkit) compliance to Microsoft Power Pages sites. This engine automates the deployment of Bootstrap 3/4/5 compatible themes to Power Pages sites using the **Enhanced Data Model**.

## Table of Contents

- [Power Pages Template Engine](#power-pages-template-engine)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Architecture](#architecture)
  - [Prerequisites](#prerequisites)
    - [Software Requirements](#software-requirements)
    - [Install Dependencies (macOS)](#install-dependencies-macos)
    - [Install Dependencies (Ubuntu/Debian)](#install-dependencies-ubuntudebian)
    - [Microsoft Requirements](#microsoft-requirements)
  - [Power Pages Licensing](#power-pages-licensing)
    - [Trial Options](#trial-options)
    - [Production Licensing](#production-licensing)
    - [Developer Environments](#developer-environments)
  - [Environment Setup](#environment-setup)
    - [Creating a Power Pages Site](#creating-a-power-pages-site)
    - [Enabling the Enhanced Data Model](#enabling-the-enhanced-data-model)
    - [Azure App Registration](#azure-app-registration)
    - [Installing the File Upload Solution](#installing-the-file-upload-solution)
  - [Configuration](#configuration)
    - [Connection JSON File](#connection-json-file)
    - [Finding Your Website ID](#finding-your-website-id)
    - [Configuration Variables](#configuration-variables)
  - [Installation](#installation)
    - [Clone the Repository](#clone-the-repository)
    - [Install Dependencies](#install-dependencies)
    - [Prepare Theme Files](#prepare-theme-files)
  - [Usage](#usage)
    - [Running the Deployment Script](#running-the-deployment-script)
    - [Script Workflow](#script-workflow)
  - [Project Structure](#project-structure)
    - [BuildGCWEB Folder](#buildgcweb-folder)
    - [Libraries Folder](#libraries-folder)
    - [Web Templates](#web-templates)
    - [Wizard Components](#wizard-components)
  - [GCWeb Theme Integration](#gcweb-theme-integration)
    - [About GCWeb and WET-BOEW](#about-gcweb-and-wet-boew)
    - [WCAG Accessibility Compliance](#wcag-accessibility-compliance)
    - [Bilingual Support](#bilingual-support)
  - [Post-Deployment Configuration](#post-deployment-configuration)
    - [Syncing Your Site](#syncing-your-site)
    - [Identity Provider Setup](#identity-provider-setup)
    - [Azure AD B2C Configuration](#azure-ad-b2c-configuration)
      - [Step 1: Create Azure AD B2C Tenant](#step-1-create-azure-ad-b2c-tenant)
      - [Step 2: Register Power Pages Application](#step-2-register-power-pages-application)
      - [Step 3: Create User Flows](#step-3-create-user-flows)
      - [Step 4: Configure Power Pages](#step-4-configure-power-pages)
    - [Web Roles and Permissions](#web-roles-and-permissions)
  - [Content Snippets](#content-snippets)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
      - [Token Acquisition Failed](#token-acquisition-failed)
      - [Website ID Not Found](#website-id-not-found)
      - [French Language Not Found](#french-language-not-found)
      - [Permission Denied](#permission-denied)
    - [Debug Mode](#debug-mode)
    - [Verify API Connectivity](#verify-api-connectivity)
  - [Contributing](#contributing)
    - [Development Guidelines](#development-guidelines)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)
  - [Resources](#resources)
    - [Official Documentation](#official-documentation)
    - [Related Projects](#related-projects)

---

## Overview

The Power Pages Template Engine streamlines the deployment of custom themes to Microsoft Power Pages sites. It is specifically designed for:

- **Government of Canada (GoC) departments** requiring GCWeb/WET-BOEW compliance
- **Organizations** needing WCAG 2.0/2.1 Level AA accessible websites
- **Developers** deploying custom Bootstrap themes to Power Pages
- **Enterprise teams** requiring bilingual (English/French) support

The engine uses the Dataverse Web API to programmatically create and update:

- Web Templates (Liquid templates for headers, footers, layouts)
- Web Pages (site hierarchy and navigation)
- Web Files (CSS, JavaScript, images, fonts)
- Content Snippets (reusable multilingual content blocks)
- Page Templates (template configurations)

---

## Features

- ✅ **Automated Deployment**: Single script deploys entire theme structure
- ✅ **Enhanced Data Model Support**: Built for Power Pages' modern data architecture
- ✅ **GCWeb Integration**: Full support for Government of Canada Web Experience Toolkit
- ✅ **Bilingual Support**: English and French content snippet management
- ✅ **WCAG Compliance**: Designed for accessibility standards compliance
- ✅ **Theme Flexibility**: Support for Bootstrap 3, 4, and 5 themes
- ✅ **Wizard Components**: Multi-step form wizard templates included
- ✅ **Idempotent Operations**: Safe to run multiple times (creates or updates)
- ✅ **File Upload via Power Automate**: Optional cloud flow for file handling

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Power Pages Template Engine                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │
│  │   Theme     │    │  Deployment │    │     Dataverse       │   │
│  │   Files     │───▶│   Script    │───▶│     Web API         │   │
│  │  (ZIP)      │    │  (Bash)     │    │   (OAuth 2.0)       │   │
│  └─────────────┘    └─────────────┘    └─────────────────────┘   │
│                            │                      │               │
│                            ▼                      ▼               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │
│  │   Liquid    │    │   Content   │    │    Power Pages      │   │
│  │  Templates  │    │  Snippets   │    │      Website        │   │
│  └─────────────┘    └─────────────┘    └─────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Software Requirements

| Software | Version | Purpose |
|----------|---------|---------|
| **macOS/Linux** | Any | Script execution environment |
| **curl** | Latest | HTTP requests to Dataverse API |
| **jq** | Latest | JSON parsing and manipulation |
| **python3** | 3.x | URL encoding and path manipulation |
| **unzip** | Latest | Theme package extraction |

### Install Dependencies (macOS)

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install jq curl python3
```

### Install Dependencies (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install jq curl python3 unzip
```

### Microsoft Requirements

- **Microsoft 365 tenant** with Power Platform access
- **Dataverse environment** with Power Pages enabled
- **Azure subscription** (for App Registration)
- **Power Platform Admin** or Environment Admin role
- **French language pack** installed in Dataverse (for bilingual support)

---

## Power Pages Licensing

### Trial Options

Power Pages offers a **30-day free trial** for exploring features:

1. Visit [powerpages.microsoft.com](https://powerpages.microsoft.com)
2. Select "Try it for free"
3. Follow the guided setup process

Trial sites can be converted to production when ready.

### Production Licensing

Power Pages uses capacity-based licensing:

| Plan | Cost | Capacity |
|------|------|----------|
| **Authenticated Users** | ~$200/month | 100 users per site |
| **Anonymous Users** | ~$75/month | 500 users per site |

**Included Entitlements:**

- **Dynamics 365 Enterprise/Premium licenses**: Unlimited Power Pages sites in the same environment
- **Power Apps Premium**: Unlimited Power Pages sites
- **Power Apps per app**: Single website use rights

### Developer Environments

For development and testing, use:

- **Power Apps Developer Plan** (free): Individual use environment
- **Trial environments**: 30-day standard or subscription-based trials

---

## Environment Setup

### Creating a Power Pages Site

Before running the deployment script, you must create a blank Power Pages site:

1. Navigate to [make.powerpages.microsoft.com](https://make.powerpages.microsoft.com)
2. Select your target environment
3. Click **Create a site**
4. Choose **Blank page** template (critical for custom themes)
5. Enter site name and web address
6. Wait for site provisioning (typically 5-15 minutes)

**Important**: The site must use the **Enhanced Data Model**. New sites default to this model, but verify in the site settings.

### Enabling the Enhanced Data Model

If your environment doesn't have the Enhanced Data Model enabled:

1. Go to [admin.powerplatform.microsoft.com](https://admin.powerplatform.microsoft.com)
2. Select your environment
3. Navigate to **Resources** → **Power Pages sites**
4. Toggle **Switch to enhanced data model** to ON
5. Wait for the Power Pages Core package to install

**Verify Data Model:**

1. Open Power Platform Admin Center
2. Go to Resources → Power Pages sites → Select your site → Manage
3. Check the **Data Model** field in Site Details

### Azure App Registration

Create an Azure App Registration for API authentication:

1. Go to [portal.azure.com](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: `PowerPages-Template-Engine` (or your preferred name)
   - **Supported account types**: Single tenant
   - **Redirect URI**: `https://login.onmicrosoft.com`

5. After creation, note the:
   - **Application (client) ID**
   - **Directory (tenant) ID**

6. Create a client secret:
   - Go to **Certificates & secrets**
   - Click **New client secret**
   - Set description and expiration
   - **Copy the secret value immediately** (it won't be shown again)

7. Grant API permissions:
   - Go to **API permissions**
   - Add **Dynamics CRM** → `user_impersonation`
   - Grant admin consent

### Installing the File Upload Solution

The template engine uses a Power Automate cloud flow for file uploads:

1. Locate `FILE_UPLOAD_FLOW.zip` in the repository
2. Import into your Dataverse environment:
   - Go to [make.powerapps.com](https://make.powerapps.com)
   - Navigate to **Solutions** → **Import**
   - Upload and configure the solution

3. After import, open the cloud flow:
   - Edit the flow
   - Copy the **HTTP POST URL** from the trigger action
   - Save this URL for your configuration file

---

## Configuration

### Connection JSON File

Create a `connection.json` file with your environment details:

```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "crmInstance": "yourorg",
  "redirectUri": "https://login.onmicrosoft.com",
  "websiteId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "blobAddress": "https://yourstorageaccount.blob.core.windows.net/yourcontainer/",
  "FlowURL": "https://prod-xx.westus.logic.azure.com:443/workflows/...",
  "clientSecret": "your-client-secret-value",
  "themeZipPath": "/path/to/your/theme.zip"
}
```

**Configuration Parameters:**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `clientId` | Azure App Registration Client ID | `a1b2c3d4-...` |
| `tenantId` | Azure AD Tenant ID | `e5f6g7h8-...` |
| `crmInstance` | Dataverse environment name | `contoso` (from `contoso.crm.dynamics.com`) |
| `redirectUri` | OAuth redirect URI | `https://login.onmicrosoft.com` |
| `websiteId` | Power Pages Website GUID | Found in Power Pages Management app |
| `blobAddress` | Azure Blob Storage URL (optional) | `https://storage.blob.core.windows.net/` |
| `FlowURL` | Power Automate trigger URL | From the imported cloud flow |
| `clientSecret` | Azure App client secret | Your generated secret |
| `themeZipPath` | Path to theme ZIP file | `/Users/you/themes/gcweb.zip` |

### Finding Your Website ID

1. Open Power Pages Management app (Model-driven app)
2. Navigate to **Websites**
3. Open your website record
4. Copy the **Website ID** (GUID) from the URL or form

### Configuration Variables

The deployment script contains additional variables you may need to modify:

```bash
# Language codes (Dataverse LCID values)
ENGLISH_LANGUAGE_CODE=1033
FRENCH_LANGUAGE_CODE=1036

# Template names
PAGE_TEMPLATE_NAME_NEW_HOME="CS-Home-WET"
WEB_TEMPLATE_HEADER="CS-header"
WEB_TEMPLATE_FOOTER="CS-footer"
```

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/Cloudstrucc/PowerPages-Template-Engine.git
cd PowerPages-Template-Engine
```

### Install Dependencies

```bash
# macOS
brew install jq curl python3

# Verify installations
jq --version
curl --version
python3 --version
```

### Prepare Theme Files

1. Download GCWeb theme from [GCWeb Releases](https://github.com/wet-boew/GCWeb/releases)
2. Place the ZIP file in a known location
3. Update `themeZipPath` in your configuration

---

## Usage

### Running the Deployment Script

```bash
cd BuildGCWEB
chmod +x deploy.sh
./deploy.sh
```

When prompted:

1. Enter `Y` to provide a JSON configuration file
2. Enter the full path to your `connection.json`
3. The script will authenticate and begin deployment

**Interactive Mode:**

If you prefer not to use a JSON file, enter `N` and provide values interactively.

### Script Workflow

The deployment script executes these steps in order:

1. **Extract Theme Files**: Unzips the theme package
2. **Create Snippets**: Deploys bilingual content snippets (EN/FR)
3. **Create File Snippets**: Processes JS/CSS/HTML files as snippets
4. **Write Templates**: Creates/updates Liquid web templates
5. **Update Home Page**: Configures the home page template
6. **Write Hierarchy**: Creates web pages and web files from folder structure
7. **Update Baseline Styles**: Deploys required Power Pages CSS files

```
================================================
Power Pages Deployment Script
================================================

Acquiring authentication token...
Token acquired successfully
Retrieving configuration IDs...
Starting portal template installation...
Extracting theme files...
Creating snippets...
Writing templates...
Updating home page...
Writing hierarchy...
Updating baseline styles...
Portal template installation complete!

================================================
Deployment completed successfully!
Please go to Power Pages site and press Sync
================================================
```

---

## Project Structure

### BuildGCWEB Folder

```
BuildGCWEB/
├── deploy.sh                 # Main deployment script
├── files/
│   ├── liquid/
│   │   ├── contentsnippets/
│   │   │   └── snippets.json    # Bilingual snippet definitions
│   │   └── webtemplates/        # Liquid template files
│   │       ├── CS-header.liquid
│   │       ├── CS-footer.liquid
│   │       ├── CS-Home-WET.liquid
│   │       ├── wizard-*.liquid   # Multi-step form wizard templates
│   │       └── ...
│   ├── bootstrap.min.css        # Bootstrap CSS
│   ├── custom-styles.css        # Custom styling
│   ├── portalbasictheme.css     # Power Pages base theme
│   ├── theme.css                # GCWeb theme CSS
│   ├── favicon.ico              # Site favicon
│   ├── logo-bw-contrast.png     # Logo variants
│   ├── logo-invert.png
│   └── landscape.png
└── startbootstrap-*/            # Extracted theme folder
```

### Libraries Folder

Contains reusable JavaScript libraries and utilities:

```
Libraries/
├── js/
│   ├── wet-boew.min.js         # WET-BOEW core JavaScript
│   ├── gcweb.min.js            # GCWeb theme JavaScript
│   └── custom/                  # Custom scripts
└── css/
    └── overrides/               # CSS override files
```

### Web Templates

Key Liquid templates included:

| Template | Purpose |
|----------|---------|
| `CS-header.liquid` | Site header with GCWeb navigation |
| `CS-footer.liquid` | Site footer with required links |
| `CS-Home-WET.liquid` | Home page layout |
| `wizard-container.liquid` | Multi-step form wizard container |
| `wizard-step.liquid` | Individual wizard step template |
| `wizard-navigation.liquid` | Wizard progress indicator |

### Wizard Components

The template engine includes a multi-step form wizard system for complex data entry:

**Wizard Features:**

- Step-by-step navigation
- Progress indication
- Validation per step
- Session state management
- Accessible keyboard navigation
- Responsive design

**Wizard Templates:**

```liquid
{% include 'wizard-container' steps: 5, form_id: 'application-form' %}
  {% include 'wizard-step' number: 1, title: 'Personal Information' %}
    <!-- Step 1 content -->
  {% endwizardstep %}
  
  {% include 'wizard-step' number: 2, title: 'Contact Details' %}
    <!-- Step 2 content -->
  {% endwizardstep %}
{% endwizardcontainer %}
```

---

## GCWeb Theme Integration

### About GCWeb and WET-BOEW

**GCWeb** is the official theme for Canada.ca, built on the **Web Experience Toolkit (WET-BOEW)**:

- **Official Canada.ca appearance**: Mandatory for Government of Canada websites
- **Accessibility built-in**: WCAG 2.0/2.1 Level AA compliant
- **Bilingual support**: Full English/French language switching
- **Responsive design**: Works across all devices
- **Standardized components**: Consistent UI patterns

**WET-BOEW provides:**

- Accessible components (menus, forms, tables)
- Progressive enhancement
- Print-friendly layouts
- Multimedia accessibility features

### WCAG Accessibility Compliance

The template engine is designed for WCAG 2.0/2.1 Level AA compliance:

| Criterion | Implementation |
|-----------|----------------|
| **1.1 Text Alternatives** | Alt text on all images |
| **1.3 Adaptable** | Semantic HTML structure |
| **1.4 Distinguishable** | Color contrast, text resizing |
| **2.1 Keyboard Accessible** | Full keyboard navigation |
| **2.4 Navigable** | Skip links, focus indicators |
| **3.1 Readable** | Language attributes |
| **4.1 Compatible** | Valid HTML, ARIA labels |

### Bilingual Support

Content snippets support English and French:

```json
{
  "site-title": [
    "Government of Canada Portal",
    "Portail du gouvernement du Canada"
  ],
  "footer-terms": [
    "Terms and Conditions",
    "Avis"
  ]
}
```

**Language Switching:**

The templates include automatic language toggle functionality following GCWeb standards.

---

## Post-Deployment Configuration

### Syncing Your Site

After deployment completes:

1. Go to [make.powerpages.microsoft.com](https://make.powerpages.microsoft.com)
2. Open your site in the design studio
3. Click **Sync** to refresh site components
4. Preview changes in the studio

### Identity Provider Setup

Power Pages supports multiple authentication providers. For production sites, configure external authentication:

**Supported Providers:**

- Azure AD B2C (recommended for external users)
- Microsoft Entra External ID (preview)
- OKTA
- Other OIDC/SAML 2.0 providers

### Azure AD B2C Configuration

Azure AD B2C is recommended for external user authentication:

#### Step 1: Create Azure AD B2C Tenant

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search for "Azure AD B2C"
3. Create a new Azure AD B2C tenant

#### Step 2: Register Power Pages Application

1. In your B2C tenant, go to **App registrations**
2. Create **New registration**
3. Configure:
   - **Name**: `PowerPages-Auth`
   - **Redirect URI**: `https://yoursite.powerappsportals.com/signin-aad-b2c_1`
   - **Supported account types**: Accounts in this organizational directory only

4. Enable tokens:
   - Go to **Authentication**
   - Enable **Access tokens** and **ID tokens**

#### Step 3: Create User Flows

Create sign-up/sign-in and password reset user flows:

1. Go to **User flows** in your B2C tenant
2. Create **Sign up and sign in** flow (B2C_1_SignUpSignIn)
3. Create **Password reset** flow (B2C_1_ResetPassword)
4. Configure user attributes as needed

#### Step 4: Configure Power Pages

1. In Power Pages design studio, go to **Security** → **Identity providers**
2. Select **Azure Active Directory B2C** → **Configure**
3. Enter:
   - **Authority**: Your B2C issuer URL (with `tfp`)
   - **Client ID**: Application ID from B2C
   - **Redirect URI**: Your site URL

### Web Roles and Permissions

Configure access control after deployment:

1. Open **Power Pages Management** app
2. Navigate to **Security** → **Web Roles**
3. Create roles:
   - **Anonymous Users**: Public access
   - **Authenticated Users**: Logged-in access
   - **Administrators**: Full access

4. Assign **Table Permissions** to roles
5. Configure **Page Permissions** as needed

---

## Content Snippets

Content snippets are managed in `snippets.json`:

```json
{
  "snippet-name": [
    "English content",
    "French content"
  ]
}
```

**Adding New Snippets:**

1. Edit `files/liquid/contentsnippets/snippets.json`
2. Add your snippet with both language versions
3. Re-run the deployment script

**Using Snippets in Templates:**

```liquid
{{ snippets['snippet-name'] }}
```

**File-Based Snippets:**

Place `.js`, `.css`, or `.html` files in the contentsnippets folder. The script automatically creates snippets from these files with the filename (minus extension) as the snippet name.

---

## Troubleshooting

### Common Issues

#### Token Acquisition Failed

```
Failed to acquire token. Response:
{"error": "invalid_client", ...}
```

**Solution:** Verify your `clientId` and `clientSecret` are correct. Ensure the app registration has proper Dynamics CRM permissions.

#### Website ID Not Found

```
HOME_PAGE_ID: null
```

**Solution:** Verify the `websiteId` in your configuration. Open the website record in Power Pages Management to confirm the GUID.

#### French Language Not Found

```
French Language ID: null
```

**Solution:** Install the French language pack in your Dataverse environment:

1. Go to Power Platform Admin Center
2. Select your environment → Settings
3. Languages → Enable French

#### Permission Denied

```
HTTP 403 Forbidden
```

**Solution:** Ensure your Azure AD app has admin consent for Dynamics CRM permissions and that your user account has appropriate environment roles.

### Debug Mode

Enable debug output by examining stderr messages:

```bash
./deploy.sh 2>&1 | tee deployment.log
```

### Verify API Connectivity

Test API access manually:

```bash
curl -s -X GET "https://yourorg.api.crm3.dynamics.com/api/data/v9.2/mspp_websites" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

See `developer-guidelines.md` in the repository for coding standards and best practices.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Frederick Pearson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## Acknowledgments

- **Government of Canada** - GCWeb and WET-BOEW frameworks
- **Microsoft** - Power Pages platform and documentation
- **Open Source Community** - Bootstrap, Liquid templating

---

## Resources

### Official Documentation

- [Power Pages Documentation](https://learn.microsoft.com/en-us/power-pages/)
- [GCWeb Theme Documentation](https://wet-boew.github.io/GCWeb/index-en.html)
- [WET-BOEW Documentation](https://wet-boew.github.io/wet-boew/index-en.html)
- [Azure AD B2C Documentation](https://learn.microsoft.com/en-us/azure/active-directory-b2c/)

### Related Projects

- [wet-boew/GCWeb](https://github.com/wet-boew/GCWeb) - Official GCWeb repository
- [wet-boew/wet-boew](https://github.com/wet-boew/wet-boew) - Web Experience Toolkit
- [Power Platform CLI](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction)

---

**Built with ❤️ by [CloudStrucc Inc.](https://cloudstrucc.com)**