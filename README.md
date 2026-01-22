
# Deployment Guide: Stylish Portfolio Theme for Power Pages

This guide walks you through deploying the Stylish Portfolio theme using the PowerPages-Template-Engine.

## Prerequisites

Ensure you have completed the prerequisites from the main repository:

* Power Pages site created with **Enhanced Data Model**
* Azure App Registration configured
* `connection.json` file ready
* Dependencies installed (`jq`, `curl`, `python3`)

---

## Step 1: Create a New Branch

```bash
cd PowerPages-Template-Engine
git checkout -b feature/stylish-portfolio-theme
```

---

## Step 2: Set Up the Folder Structure

Create a new build folder for the Stylish Portfolio theme:

```bash
mkdir -p BuildStylishPortfolio/files/liquid/webtemplates
mkdir -p BuildStylishPortfolio/files/liquid/contentsnippets
```

---

## Step 3: Copy Template Files

Copy the Stylish Portfolio `.liquid` files to the webtemplates folder:

```bash
# From the downloaded templates
cp CS-Styles.liquid BuildStylishPortfolio/files/liquid/webtemplates/
cp CS-header.liquid BuildStylishPortfolio/files/liquid/webtemplates/
cp CS-footer.liquid BuildStylishPortfolio/files/liquid/webtemplates/
cp CS-Home-SP.liquid BuildStylishPortfolio/files/liquid/webtemplates/
cp CS-Layout-1-Column.liquid BuildStylishPortfolio/files/liquid/webtemplates/
cp CS-Layout-1-Column-with-Left-Nav.liquid BuildStylishPortfolio/files/liquid/webtemplates/
cp CS-Wizard-Step.liquid BuildStylishPortfolio/files/liquid/webtemplates/
cp CS-Wizard-Style.liquid BuildStylishPortfolio/files/liquid/webtemplates/
cp CS-Weblink-List-Group-Left.liquid BuildStylishPortfolio/files/liquid/webtemplates/
cp CS-Web-Link-Button.liquid BuildStylishPortfolio/files/liquid/webtemplates/
cp CS-Validation-Wizard-Step.liquid BuildStylishPortfolio/files/liquid/webtemplates/
```

---

## Step 4: Create the Content Snippets JSON

Create the `snippets.json` file with all required snippets:

```bash
cat > BuildStylishPortfolio/files/liquid/contentsnippets/snippets.json << 'EOF'
{
  "SP/SITE/NAME": ["Stylish Portfolio", "Portfolio Élégant"],
  "SP/APP/TITLE": ["Dashboard", "Tableau de bord"],
  "SP/ENABLE/LANGUAGE": ["true", "true"],
  
  "SP/HERO/TITLE": ["Welcome to Our Portal", "Bienvenue sur notre portail"],
  "SP/HERO/SUBTITLE": ["A Modern Power Pages Experience", "Une expérience Power Pages moderne"],
  "SP/HERO/CTA": ["Get Started", "Commencer"],
  
  "SP/ABOUT/TITLE": ["About Our Platform", "À propos de notre plateforme"],
  "SP/ABOUT/DESC": ["Our platform provides a modern, responsive experience for all your needs.", "Notre plateforme offre une expérience moderne et réactive pour tous vos besoins."],
  "SP/ABOUT/CTA": ["Learn More", "En savoir plus"],
  
  "SP/SERVICES/LABEL": ["Services", "Services"],
  "SP/SERVICES/TITLE": ["What We Offer", "Ce que nous offrons"],
  
  "SP/SERVICE1/ICON": ["icon-screen-smartphone", "icon-screen-smartphone"],
  "SP/SERVICE1/TITLE": ["Responsive Design", "Design réactif"],
  "SP/SERVICE1/DESC": ["Looks great on any device", "S'affiche parfaitement sur tout appareil"],
  
  "SP/SERVICE2/ICON": ["icon-pencil", "icon-pencil"],
  "SP/SERVICE2/TITLE": ["Modern Interface", "Interface moderne"],
  "SP/SERVICE2/DESC": ["Clean and professional styling", "Style propre et professionnel"],
  
  "SP/SERVICE3/ICON": ["icon-like", "icon-like"],
  "SP/SERVICE3/TITLE": ["User Friendly", "Convivial"],
  "SP/SERVICE3/DESC": ["Intuitive navigation", "Navigation intuitive"],
  
  "SP/SERVICE4/ICON": ["icon-lock", "icon-lock"],
  "SP/SERVICE4/TITLE": ["Secure", "Sécurisé"],
  "SP/SERVICE4/DESC": ["Built with security in mind", "Conçu avec la sécurité à l'esprit"],
  
  "SP/CALLOUT/TEXT": ["Ready to get started?", "Prêt à commencer?"],
  "SP/CALLOUT/CTA": ["Sign Up Now", "Inscrivez-vous maintenant"],
  
  "SP/PORTFOLIO/LABEL": ["Portfolio", "Portfolio"],
  "SP/PORTFOLIO/TITLE": ["Featured Work", "Travaux en vedette"],
  
  "SP/PORTFOLIO1/TITLE": ["Project One", "Projet un"],
  "SP/PORTFOLIO1/DESC": ["A showcase of our capabilities", "Une vitrine de nos capacités"],
  "SP/PORTFOLIO1/IMG": ["/sp-portfolio-1.jpg", "/sp-portfolio-1.jpg"],
  
  "SP/PORTFOLIO2/TITLE": ["Project Two", "Projet deux"],
  "SP/PORTFOLIO2/DESC": ["Innovation in action", "L'innovation en action"],
  "SP/PORTFOLIO2/IMG": ["/sp-portfolio-2.jpg", "/sp-portfolio-2.jpg"],
  
  "SP/PORTFOLIO3/TITLE": ["Project Three", "Projet trois"],
  "SP/PORTFOLIO3/DESC": ["Creative solutions", "Solutions créatives"],
  "SP/PORTFOLIO3/IMG": ["/sp-portfolio-3.jpg", "/sp-portfolio-3.jpg"],
  
  "SP/PORTFOLIO4/TITLE": ["Project Four", "Projet quatre"],
  "SP/PORTFOLIO4/DESC": ["Excellence delivered", "Excellence livrée"],
  "SP/PORTFOLIO4/IMG": ["/sp-portfolio-4.jpg", "/sp-portfolio-4.jpg"],
  
  "SP/CTA/TITLE": ["Take the Next Step", "Passez à l'étape suivante"],
  "SP/CTA/BTN1": ["Sign In", "Se connecter"],
  "SP/CTA/BTN2": ["Contact Us", "Contactez-nous"],
  
  "SP/MAP/ENABLED": ["false", "false"],
  "SP/CONTACT/TITLE": ["Get In Touch", "Contactez-nous"],
  "SP/CONTACT/DESC": ["We'd love to hear from you", "Nous aimerions avoir de vos nouvelles"],
  "SP/CONTACT/EMAIL": ["contact@example.com", "contact@example.com"],
  "SP/CONTACT/PHONE": ["1-800-555-0123", "1-800-555-0123"],
  
  "SP/FOOTER/COPYRIGHT": ["Your Company", "Votre entreprise"],
  "SP/FOOTER/LINK1": ["Terms", "Conditions"],
  "SP/FOOTER/LINK2": ["Privacy", "Confidentialité"],
  "SP/FOOTER/LINK3": ["Contact", "Contact"],
  
  "SP/DASHBOARD/WELCOME": ["Welcome back", "Bienvenue"],
  "SP/DASHBOARD/SUBTITLE": ["Here's an overview of your account", "Voici un aperçu de votre compte"],
  
  "SP/CARD1/ICON": ["icon-screen-smartphone", "icon-screen-smartphone"],
  "SP/CARD1/TITLE": ["New Request", "Nouvelle demande"],
  "SP/CARD1/DESC": ["Submit a new request", "Soumettre une nouvelle demande"],
  
  "SP/CARD2/ICON": ["icon-pencil", "icon-pencil"],
  "SP/CARD2/TITLE": ["My Submissions", "Mes soumissions"],
  "SP/CARD2/DESC": ["View your submissions", "Voir vos soumissions"],
  
  "SP/CARD3/ICON": ["icon-like", "icon-like"],
  "SP/CARD3/TITLE": ["My Profile", "Mon profil"],
  "SP/CARD3/DESC": ["Update your information", "Mettre à jour vos informations"],
  
  "SP/CARD4/ICON": ["icon-support", "icon-support"],
  "SP/CARD4/TITLE": ["Support", "Soutien"],
  "SP/CARD4/DESC": ["Get help", "Obtenir de l'aide"],
  
  "SP/ACTIVITY/TITLE": ["Recent Activity", "Activité récente"],
  "SP/QUICKLINKS/TITLE": ["Quick Links", "Liens rapides"],
  "SP/QUICKLINK1": ["Documentation", "Documentation"],
  "SP/QUICKLINK2": ["FAQs", "FAQ"],
  "SP/QUICKLINK3": ["Contact Support", "Contacter le support"],
  
  "SP/NAV/MENU": ["Menu", "Menu"],
  "SP/NAV/PREVIOUS": ["Previous", "Précédent"],
  "SP/NAV/NEXT": ["Next", "Suivant"]
}
EOF
```

---

## Step 5: Download and Prepare Theme Assets

Download the Stylish Portfolio theme and extract assets:

```bash
# Download the theme
curl -L -o stylish-portfolio.zip https://github.com/StartBootstrap/startbootstrap-stylish-portfolio/archive/refs/heads/gh-pages.zip

# Extract
unzip stylish-portfolio.zip -d BuildStylishPortfolio/

# Copy images to files folder
cp BuildStylishPortfolio/startbootstrap-stylish-portfolio-gh-pages/assets/img/bg-masthead.jpg BuildStylishPortfolio/files/sp-bg-masthead.jpg
cp BuildStylishPortfolio/startbootstrap-stylish-portfolio-gh-pages/assets/img/bg-callout.jpg BuildStylishPortfolio/files/sp-bg-callout.jpg
cp BuildStylishPortfolio/startbootstrap-stylish-portfolio-gh-pages/assets/img/portfolio-1.jpg BuildStylishPortfolio/files/sp-portfolio-1.jpg
cp BuildStylishPortfolio/startbootstrap-stylish-portfolio-gh-pages/assets/img/portfolio-2.jpg BuildStylishPortfolio/files/sp-portfolio-2.jpg
cp BuildStylishPortfolio/startbootstrap-stylish-portfolio-gh-pages/assets/img/portfolio-3.jpg BuildStylishPortfolio/files/sp-portfolio-3.jpg
cp BuildStylishPortfolio/startbootstrap-stylish-portfolio-gh-pages/assets/img/portfolio-4.jpg BuildStylishPortfolio/files/sp-portfolio-4.jpg
```

---

## Step 6: Create/Update the Deployment Script

Copy and modify the deploy.sh script for Stylish Portfolio. Key changes needed:

```bash
cp BuildGCWEB/deploy.sh BuildStylishPortfolio/deploy.sh
chmod +x BuildStylishPortfolio/deploy.sh
```

Edit `BuildStylishPortfolio/deploy.sh` and update these variables:

```bash
# Change the home page template name
PAGE_TEMPLATE_NAME_NEW_HOME="CS-Home-SP"

# Update web template names if needed
WEB_TEMPLATE_HEADER="CS-header"
WEB_TEMPLATE_FOOTER="CS-footer"
WEB_TEMPLATE_STYLES="CS-Styles"
```

---

## Step 7: Update Your connection.json

Create or update your `connection.json`:

```json
{
  "clientId": "YOUR-CLIENT-ID",
  "tenantId": "YOUR-TENANT-ID",
  "crmInstance": "YOUR-ORG-NAME",
  "redirectUri": "https://login.onmicrosoft.com",
  "websiteId": "YOUR-WEBSITE-GUID",
  "blobAddress": "https://yourstorage.blob.core.windows.net/container/",
  "FlowURL": "YOUR-POWER-AUTOMATE-FLOW-URL",
  "clientSecret": "YOUR-CLIENT-SECRET",
  "themeZipPath": "/path/to/stylish-portfolio.zip"
}
```

---

## Step 8: Run the Deployment

```bash
cd BuildStylishPortfolio
./deploy.sh
```

When prompted:

1. Enter `Y` to use JSON configuration
2. Provide the path to your `connection.json`

---

## Step 9: Post-Deployment Steps

### 9.1 Sync Your Site

1. Go to [make.powerpages.microsoft.com](https://make.powerpages.microsoft.com)
2. Open your site
3. Click **Sync** to refresh

### 9.2 Upload Images via Portal Management

Upload the theme images to your Power Pages site:

1. Open **Portal Management** app in Power Apps
2. Navigate to **Web Files**
3. Create new web files for each image:
   * `sp-bg-masthead.jpg`
   * `sp-bg-callout.jpg`
   * `sp-portfolio-1.jpg` through `sp-portfolio-4.jpg`
   * `sp-logo.png`
   * `sp-logo-white.png`

### 9.3 Create Web Link Sets

Create these Web Link Sets in Portal Management:

**Primary Navigation** (for sidebar menu):

| Name      | URL        |
| --------- | ---------- |
| Home      | /          |
| About     | #about     |
| Services  | #services  |
| Portfolio | #portfolio |
| Contact   | #contact   |

**Profile Navigation** (for authenticated user dropdown):

| Name           | URL          |
| -------------- | ------------ |
| My Profile     | /profile     |
| My Submissions | /submissions |
| Settings       | /settings    |

**Quick Links** (for dashboard):

| Name            | URL      |
| --------------- | -------- |
| Documentation   | /docs    |
| FAQs            | /faq     |
| Contact Support | /support |

### 9.4 Create Site Markers

Create these Site Markers:

| Name         | Page                    |
| ------------ | ----------------------- |
| ServiceCard1 | (your new request page) |
| ServiceCard2 | (your submissions page) |
| ServiceCard3 | (your profile page)     |
| ServiceCard4 | (your support page)     |
| FooterLink1  | (terms page)            |
| FooterLink2  | (privacy page)          |
| FooterLink3  | (contact page)          |

### 9.5 Update Page Template Assignment

Ensure the home page uses the new template:

1. Open Portal Management
2. Navigate to **Web Pages** → **Home**
3. Set **Page Template** to `CS-Home-SP`

---

## Step 10: Verify Deployment

1. **Anonymous View** : Visit your site while logged out

* Should see the full-height hero section
* Sidebar navigation should work
* All sections should be visible

1. **Authenticated View** : Log in to your site

* Should see the dashboard layout
* Service cards should link correctly
* Profile dropdown should work

---

## Troubleshooting

### Templates Not Showing

* Run **Sync** in Power Pages design studio
* Clear browser cache
* Check that template names match exactly

### Images Not Loading

* Verify web files are created correctly
* Check the partial URL matches the snippet values
* Ensure web files are published (not draft)

### Sidebar Not Working

* Check that Bootstrap 5 JS is loaded
* Verify the footer template includes the JavaScript
* Check browser console for errors

### Styles Not Applied

* Ensure CS-Styles template is deployed
* Verify it's included in your page template
* Check for CSS conflicts with other templates

---

## Quick Reference: Template Hierarchy

```
Page Template (e.g., CS-Home-SP)
├── Includes CS-Styles (CSS)
├── Includes CS-header (navigation)
├── Main Content
│   ├── For anonymous: Hero, About, Services, etc.
│   └── For authenticated: Dashboard, Cards, Activity
└── Includes CS-footer (footer + JS)
```

---

## Files Checklist

```
BuildStylishPortfolio/
├── deploy.sh                              ✓ Deployment script
├── connection.json                        ✓ Your configuration
├── files/
│   ├── liquid/
│   │   ├── webtemplates/
│   │   │   ├── CS-Styles.liquid           ✓ All CSS
│   │   │   ├── CS-header.liquid           ✓ Header/Navigation
│   │   │   ├── CS-footer.liquid           ✓ Footer + JS
│   │   │   ├── CS-Home-SP.liquid          ✓ Home page
│   │   │   ├── CS-Layout-1-Column.liquid  ✓ 1-column layout
│   │   │   ├── CS-Layout-1-Column-with-Left-Nav.liquid ✓
│   │   │   ├── CS-Wizard-Step.liquid      ✓ Wizard template
│   │   │   ├── CS-Wizard-Style.liquid     ✓ Wizard CSS
│   │   │   ├── CS-Weblink-List-Group-Left.liquid ✓
│   │   │   ├── CS-Web-Link-Button.liquid  ✓ Pagination
│   │   │   └── CS-Validation-Wizard-Step.liquid ✓
│   │   └── contentsnippets/
│   │       └── snippets.json              ✓ All content snippets
│   ├── sp-bg-masthead.jpg                 ✓ Hero background
│   ├── sp-bg-callout.jpg                  ✓ Callout background
│   ├── sp-portfolio-1.jpg                 ✓ Portfolio images
│   ├── sp-portfolio-2.jpg                 ✓
│   ├── sp-portfolio-3.jpg                 ✓
│   ├── sp-portfolio-4.jpg                 ✓
│   ├── sp-logo.png                        ✓ Main logo
│   └── sp-logo-white.png                  ✓ White logo
```

---

**Need Help?** Check the main [PowerPages-Template-Engine README](https://github.com/Cloudstrucc/PowerPages-Template-Engine) for detailed troubleshooting.
