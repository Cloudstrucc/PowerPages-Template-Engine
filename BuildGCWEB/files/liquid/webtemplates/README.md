# Stylish Portfolio Theme for Power Pages

Based on [Start Bootstrap - Stylish Portfolio](https://startbootstrap.com/theme/stylish-portfolio) v6.0.6

Adapted for Power Pages by CloudStrucc Inc.

## Overview

This theme provides a modern, responsive design for Power Pages with:
- Full-height hero section with background image
- Animated sidebar navigation for anonymous users
- Clean dashboard interface for authenticated users
- Services/Features showcase sections
- Portfolio gallery section
- Contact section with map support
- Social media integration

## Files Included

| Template | Description |
|----------|-------------|
| `CS-Styles.liquid` | All CSS styles for the theme |
| `CS-header.liquid` | Header with navigation (sidebar for anon, app bar for auth) |
| `CS-footer.liquid` | Footer with social links and scroll-to-top button |
| `CS-Home-SP.liquid` | Home page template (replaces CS-Home-WET) |
| `CS-Layout-1-Column.liquid` | Single column content layout |
| `CS-Layout-1-Column-with-Left-Nav.liquid` | Layout with left sidebar navigation |
| `CS-Wizard-Step.liquid` | Multi-step form/wizard template |
| `CS-Wizard-Style.liquid` | Styles for wizard/multi-step forms |
| `CS-Weblink-List-Group-Left.liquid` | Left navigation component |
| `CS-Web-Link-Button.liquid` | Previous/Next pagination |
| `CS-Validation-Wizard-Step.liquid` | Validation summary for forms |

## Required Assets

Upload these images to your Power Pages site:

- `/sp-bg-masthead.jpg` - Hero background image (recommended: 1920x1080+)
- `/sp-bg-callout.jpg` - Callout section background
- `/sp-logo.png` - Main logo (for authenticated header)
- `/sp-logo-white.png` - White/light version of logo (for anonymous header overlay)
- `/sp-portfolio-1.jpg` through `/sp-portfolio-4.jpg` - Portfolio images

## Required External Resources

Add these to your portal's header or these are already in the templates:

```html
<!-- Font Awesome 6 -->
<script src="https://use.fontawesome.com/releases/v6.3.0/js/all.js" crossorigin="anonymous"></script>

<!-- Simple Line Icons -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/simple-line-icons/2.5.5/css/simple-line-icons.min.css" rel="stylesheet" />

<!-- Google Fonts - Source Sans Pro -->
<link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,700,300italic,400italic,700italic" rel="stylesheet" type="text/css" />

<!-- Bootstrap 5 JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
```

## Content Snippets

Create these snippets in Power Pages to customize content:

### Site Configuration
| Snippet Name | Description | Default |
|--------------|-------------|---------|
| `SP/SITE/NAME` | Site name for sidebar brand | Stylish Portfolio |
| `SP/LOGO` | URL to main logo | /sp-logo.png |
| `SP/LOGO/LIGHT` | URL to white/light logo | /sp-logo-white.png |
| `SP/APP/TITLE` | App bar title for authenticated users | Dashboard |
| `SP/ENABLE/LANGUAGE` | Enable language toggle (true/false) | - |

### Hero Section
| Snippet Name | Description | Default |
|--------------|-------------|---------|
| `SP/HERO/TITLE` | Main hero heading | Stylish Portfolio |
| `SP/HERO/SUBTITLE` | Hero subheading | A Modern Power Pages Theme |
| `SP/HERO/CTA` | Hero button text | Find Out More |

### About Section
| Snippet Name | Description | Default |
|--------------|-------------|---------|
| `SP/ABOUT/TITLE` | About section title | Welcome to our platform! |
| `SP/ABOUT/DESC` | About description text | (see template) |
| `SP/ABOUT/CTA` | About button text | What We Offer |

### Services Section
| Snippet Name | Description | Default |
|--------------|-------------|---------|
| `SP/SERVICES/LABEL` | Section label | Services |
| `SP/SERVICES/TITLE` | Section heading | What We Offer |
| `SP/SERVICE1/ICON` | Icon class | icon-screen-smartphone |
| `SP/SERVICE1/TITLE` | Service 1 title | Responsive |
| `SP/SERVICE1/DESC` | Service 1 description | Looks great on any screen size! |
| `SP/SERVICE2/ICON` | Icon class | icon-pencil |
| `SP/SERVICE2/TITLE` | Service 2 title | Modern Design |
| `SP/SERVICE2/DESC` | Service 2 description | (see template) |
| `SP/SERVICE3/ICON` | Icon class | icon-like |
| `SP/SERVICE3/TITLE` | Service 3 title | User Friendly |
| `SP/SERVICE3/DESC` | Service 3 description | (see template) |
| `SP/SERVICE4/ICON` | Icon class | icon-lock |
| `SP/SERVICE4/TITLE` | Service 4 title | Secure |
| `SP/SERVICE4/DESC` | Service 4 description | (see template) |

### Callout Section
| Snippet Name | Description | Default |
|--------------|-------------|---------|
| `SP/CALLOUT/TEXT` | Callout heading | Ready to get started? |
| `SP/CALLOUT/CTA` | Callout button text | Get Started Now! |

### Portfolio Section
| Snippet Name | Description | Default |
|--------------|-------------|---------|
| `SP/PORTFOLIO/LABEL` | Section label | Portfolio |
| `SP/PORTFOLIO/TITLE` | Section heading | Recent Projects |
| `SP/PORTFOLIO1/TITLE` | Portfolio 1 title | Project One |
| `SP/PORTFOLIO1/DESC` | Portfolio 1 description | (see template) |
| `SP/PORTFOLIO1/IMG` | Portfolio 1 image URL | /sp-portfolio-1.jpg |
| (Repeat for PORTFOLIO2, PORTFOLIO3, PORTFOLIO4) | | |

### Call to Action Section
| Snippet Name | Description | Default |
|--------------|-------------|---------|
| `SP/CTA/TITLE` | CTA heading | Ready to take the next step? |
| `SP/CTA/BTN1` | CTA button 1 text | Sign In |
| `SP/CTA/BTN2` | CTA button 2 text | Contact Us |

### Contact Section
| Snippet Name | Description | Default |
|--------------|-------------|---------|
| `SP/MAP/ENABLED` | Enable Google Map (true/false) | - |
| `SP/MAP/EMBED` | Google Maps embed URL | (Ottawa default) |
| `SP/CONTACT/TITLE` | Contact section title | Get In Touch |
| `SP/CONTACT/DESC` | Contact description | (see template) |
| `SP/CONTACT/EMAIL` | Contact email | contact@example.com |
| `SP/CONTACT/PHONE` | Contact phone | 1-800-XXX-XXXX |

### Social Media
| Snippet Name | Description | Default |
|--------------|-------------|---------|
| `SP/SOCIAL/FACEBOOK` | Facebook URL | - |
| `SP/SOCIAL/TWITTER` | Twitter/X URL | - |
| `SP/SOCIAL/LINKEDIN` | LinkedIn URL | - |
| `SP/SOCIAL/GITHUB` | GitHub URL | - |

### Footer
| Snippet Name | Description | Default |
|--------------|-------------|---------|
| `SP/FOOTER/COPYRIGHT` | Copyright text | Your Website |
| `SP/FOOTER/LINK1` | Footer link 1 text | Terms |
| `SP/FOOTER/LINK2` | Footer link 2 text | Privacy |
| `SP/FOOTER/LINK3` | Footer link 3 text | Contact |

### Dashboard (Authenticated)
| Snippet Name | Description | Default |
|--------------|-------------|---------|
| `SP/DASHBOARD/WELCOME` | Welcome message | Welcome back |
| `SP/DASHBOARD/SUBTITLE` | Dashboard subtitle | (see template) |
| `SP/CARD1/ICON` to `SP/CARD4/ICON` | Dashboard card icons | (see template) |
| `SP/CARD1/TITLE` to `SP/CARD4/TITLE` | Dashboard card titles | (see template) |
| `SP/CARD1/DESC` to `SP/CARD4/DESC` | Dashboard card descriptions | (see template) |
| `SP/ACTIVITY/TITLE` | Activity section title | Recent Activity |
| `SP/QUICKLINKS/TITLE` | Quick links section title | Quick Links |

### Navigation
| Snippet Name | Description | Default |
|--------------|-------------|---------|
| `SP/NAV/MENU` | Menu header text | Menu |
| `SP/NAV/PREVIOUS` | Previous button text | Previous |
| `SP/NAV/NEXT` | Next button text | Next |

## Web Link Sets

Create these Web Link Sets for navigation:

| Web Link Set Name | Description |
|-------------------|-------------|
| `Primary Navigation` | Main navigation links for anonymous sidebar |
| `Profile Navigation` | Dropdown links for authenticated user profile |
| `Quick Links` | Dashboard quick links section |

## Site Markers

Create these Site Markers for linking:

| Site Marker Name | Description |
|------------------|-------------|
| `ServiceCard1` - `ServiceCard4` | Dashboard service card links |
| `Portfolio1` - `Portfolio4` | Portfolio item links |
| `QuickLink1` - `QuickLink4` | Quick link URLs |
| `FooterLink1` - `FooterLink3` | Footer navigation links |

## Icon Reference

This theme uses two icon sets:

### Simple Line Icons (for service icons)
- `icon-screen-smartphone`
- `icon-pencil`
- `icon-like`
- `icon-lock`
- `icon-support`
- `icon-social-facebook`
- `icon-social-twitter`
- `icon-social-linkedin`
- `icon-social-github`

[Full list](https://cdnjs.cloudflare.com/ajax/libs/simple-line-icons/2.5.5/css/simple-line-icons.min.css)

### Font Awesome 6 (for UI icons)
- `fas fa-bars`
- `fas fa-user`
- `fas fa-caret-down`
- `fas fa-chevron-left`
- `fas fa-chevron-right`
- `fas fa-angle-up`
- etc.

[Font Awesome Icons](https://fontawesome.com/icons)

## Color Customization

The theme uses CSS variables for easy customization. Override these in your custom CSS:

```css
:root {
  --sp-primary: #1D809F;        /* Primary brand color */
  --sp-primary-dark: #17667f;   /* Darker primary for hover states */
  --sp-secondary: #ecb807;      /* Accent/secondary color */
  --sp-dark: #212529;           /* Dark text/backgrounds */
  --sp-light: #f8f9fa;          /* Light backgrounds */
  --sp-gray: #6c757d;           /* Muted text */
}
```

## Installation

1. Create a new branch in your Power Pages Template Engine repository
2. Copy all `.liquid` files to your web templates
3. Upload required images to your portal
4. Create the necessary snippets, web link sets, and site markers
5. Configure your portal to use the new templates

## License

MIT License - Based on Start Bootstrap Stylish Portfolio theme.

## Credits

- Original theme: [Start Bootstrap](https://startbootstrap.com)
- Power Pages adaptation: [CloudStrucc Inc.](https://cloudstrucc.com)
