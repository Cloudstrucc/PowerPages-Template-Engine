# PowerPages Template Engine

A Node.js web application for deploying Bootstrap themes to Microsoft Power Pages sites. Built with Express, Handlebars, and integrated with Microsoft Entra ID, Exchange Online, and Stripe.

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![Express](https://img.shields.io/badge/Express-4.x-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Features

- 🔐 **Microsoft Entra ID Authentication** - Secure sign-in with Microsoft accounts
- 📧 **Exchange Online Email** - Transactional emails via Office 365
- 💳 **Stripe Integration** - Subscription billing with multiple tiers
- 📦 **Theme Upload** - Upload Bootstrap 3, 4, or 5 themes
- 🎨 **Theme Gallery** - Curated collection of free themes
- 📊 **Dashboard** - Manage themes and track deployments
- 🔒 **Security** - CSRF protection, rate limiting, helmet security headers

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v6.0 or higher) - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Git** - [Download](https://git-scm.com/)

You'll also need accounts for:

- **Microsoft Azure** - For Entra ID app registration
- **Microsoft 365** - For Exchange Online email (optional)
- **Stripe** - For payment processing (optional for development)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Cloudstrucc/PowerPages-Template-Engine.git
cd PowerPages-Template-Engine
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Configuration](#configuration) section below).

### 4. Start MongoDB

If running MongoDB locally:

```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Windows
net start MongoDB

# Linux
sudo systemctl start mongod
```

### 5. Run the Application

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

#### Application Settings

```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
SESSION_SECRET=your-super-secret-session-key-minimum-32-characters
```

#### MongoDB

```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/powerpages_template_engine

# MongoDB Atlas (cloud)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.xxxxx.mongodb.net/powerpages_template_engine
```

#### Microsoft Entra ID (Azure AD)

```env
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=common
AZURE_AD_CLOUD_INSTANCE=https://login.microsoftonline.com
AZURE_AD_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback
```

#### Exchange Online Email

```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=PowerPages Template Engine
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
```

#### Stripe

```env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_BASIC=price_xxxxx
STRIPE_PRICE_PRO=price_xxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxx
```

## Setting Up External Services

### Microsoft Entra ID (Azure AD)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: PowerPages Template Engine
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Web - `http://localhost:3000/auth/microsoft/callback`
5. After creation, note the **Application (client) ID**
6. Go to **Certificates & secrets** > **New client secret**
7. Copy the secret value immediately (it won't be shown again)
8. Go to **API permissions** > **Add a permission** > **Microsoft Graph**:
   - Add: `User.Read`, `email`, `openid`, `profile` (Delegated)
9. Click **Grant admin consent** (if you have admin rights)

### Exchange Online (Office 365 Email)

**Option 1: SMTP with App Password (Simple)**

1. Sign in to your Microsoft 365 account
2. Go to [Security settings](https://account.microsoft.com/security)
3. Under **App passwords**, create a new app password
4. Use this password in `EMAIL_PASSWORD`

**Option 2: Enable SMTP AUTH for Mailbox**

1. Go to [Microsoft 365 Admin Center](https://admin.microsoft.com)
2. Navigate to **Users** > **Active users**
3. Select the user/mailbox
4. Go to **Mail** > **Email apps**
5. Enable **Authenticated SMTP**

### Stripe

1. Create account at [Stripe Dashboard](https://dashboard.stripe.com)
2. Get your API keys from **Developers** > **API keys**
3. Create products and prices:
   - Go to **Products** > **Add product**
   - Create Basic ($50/month), Pro ($100/month), Enterprise ($500/month)
   - Copy each price ID for your `.env`
4. Set up webhook (for production):
   - Go to **Developers** > **Webhooks**
   - Add endpoint: `https://yourdomain.com/webhook/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
   - Copy the webhook signing secret

## Project Structure

```
powerpages-app/
├── app.js                 # Main application entry
├── package.json           # Dependencies and scripts
├── .env.example           # Environment template
├── .gitignore
├── config/
│   ├── passport.js        # Microsoft Entra ID auth config
│   ├── logger.js          # Winston logger setup
│   └── handlebars-helpers.js
├── middleware/
│   └── auth.js            # Authentication middleware
├── models/
│   ├── User.js            # User schema
│   └── Theme.js           # Theme schema
├── routes/
│   ├── index.js           # Public pages
│   ├── auth.js            # Authentication routes
│   ├── dashboard.js       # Dashboard routes
│   ├── themes.js          # Theme gallery
│   ├── upload.js          # File uploads
│   ├── payment.js         # Stripe payments
│   ├── webhook.js         # Stripe webhooks
│   └── api.js             # API endpoints
├── services/
│   ├── emailService.js    # Exchange Online emails
│   └── stripeService.js   # Stripe integration
├── views/
│   ├── layouts/
│   │   └── main.hbs       # Main layout
│   ├── auth/              # Auth pages
│   ├── dashboard/         # Dashboard pages
│   ├── themes/            # Theme pages
│   ├── upload/            # Upload pages
│   ├── payment/           # Payment pages
│   └── errors/            # Error pages
└── public/
    ├── css/
    │   └── styles.css
    ├── js/
    │   └── main.js
    └── images/
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/login` | Login page |
| POST | `/auth/login` | Process login |
| GET | `/auth/register` | Registration page |
| POST | `/auth/register` | Process registration |
| GET | `/auth/microsoft` | Microsoft OAuth login |
| POST | `/auth/microsoft/callback` | Microsoft OAuth callback |
| GET | `/auth/logout` | Logout |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Dashboard home |
| GET | `/dashboard/themes` | List user themes |
| GET | `/dashboard/themes/:id` | Theme details |
| POST | `/dashboard/themes/:id/delete` | Delete theme |
| GET | `/dashboard/settings` | User settings |

### Themes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/themes` | Theme gallery |
| GET | `/themes/:id` | Theme details |
| GET | `/themes/:id/install` | Install from gallery |

### Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/upload` | Upload page |
| POST | `/upload` | Upload theme file |
| GET | `/upload/status/:id` | Deployment status page |
| GET | `/upload/api/status/:id` | Status API (polling) |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payment/create-checkout-session` | Create Stripe checkout |
| GET | `/payment/success` | Payment success page |
| POST | `/payment/billing-portal` | Stripe billing portal |
| POST | `/payment/cancel-subscription` | Cancel subscription |

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/me` | Current user info |
| GET | `/api/themes` | List user themes |
| GET | `/api/themes/:id` | Get theme |
| DELETE | `/api/themes/:id` | Delete theme |
| GET | `/api/health` | Health check |

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Debugging

Set `LOG_LEVEL=debug` in your `.env` file for verbose logging.

## Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Use a strong `SESSION_SECRET` (32+ characters)
3. Enable HTTPS (required for Microsoft auth in production)
4. Update `APP_URL` and `AZURE_AD_REDIRECT_URI` with your domain
5. Set up proper MongoDB authentication
6. Configure Stripe webhook with production URL
7. Set up process manager (PM2, forever, etc.)

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start app.js --name "powerpages-engine"

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

## Security Considerations

- All passwords are hashed with bcrypt (12 rounds)
- Sessions use secure, HTTP-only cookies
- CSRF protection on all forms
- Rate limiting on auth and API routes
- Helmet security headers enabled
- Input validation with express-validator
- MongoDB injection prevention through Mongoose

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Ensure MongoDB is running: `mongod --version`
- Check connection string in `.env`
- Verify network access if using Atlas

**Microsoft Auth Not Working**
- Verify redirect URI matches exactly
- Check client ID and secret
- Ensure app permissions are granted
- For localhost, ensure `allowHttpForRedirectUrl: true`

**Emails Not Sending**
- Verify SMTP credentials
- Check if SMTP AUTH is enabled for mailbox
- Try using an app password instead of account password

**Stripe Webhooks Failing**
- Ensure webhook secret is correct
- Check that endpoint is accessible
- Verify SSL certificate (production)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [docs.cloudstrucc.com](https://docs.cloudstrucc.com)
- **Issues**: [GitHub Issues](https://github.com/Cloudstrucc/PowerPages-Template-Engine/issues)
- **Email**: support@cloudstrucc.com

## Acknowledgments

- [Start Bootstrap](https://startbootstrap.com) - Free Bootstrap themes
- [Microsoft Power Pages](https://powerpages.microsoft.com) - Low-code website platform
- [Passport.js](http://www.passportjs.org/) - Authentication middleware
- [Stripe](https://stripe.com) - Payment processing

---

Built with ❤️ by [Cloudstrucc inc.](https://www.cloudstrucc.com)
