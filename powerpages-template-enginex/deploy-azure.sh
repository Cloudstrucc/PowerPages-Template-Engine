#!/usr/bin/env bash
###############################################################################
# deploy-azure.sh
#
# Deploys the PowerPages Template Engine (Node.js/Express/MongoDB) to Azure.
#
# Resources created:
#   - Resource Group
#   - Azure Cosmos DB for MongoDB (or optional Azure-managed MongoDB)
#   - Azure App Service Plan (Linux, Node 18)
#   - Azure App Service (Web App)
#   - Application Insights (optional)
#
# Prerequisites:
#   - Azure CLI installed and logged in  (az login)
#   - Git installed
#   - A .env file with your secrets (see README.md)
#
# Usage:
#   chmod +x deploy-azure.sh
#   ./deploy-azure.sh                    # interactive – prompts for values
#   ./deploy-azure.sh --defaults         # use all defaults (good for CI)
#
# Author: Generated for Cloudstrucc / PowerPages Template Engine
###############################################################################
set -euo pipefail

#==============================================================================
# COLOUR HELPERS
#==============================================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()     { echo -e "${RED}[ERROR]${NC} $*" >&2; }

#==============================================================================
# PRE-FLIGHT CHECKS
#==============================================================================
check_prereqs() {
  info "Checking prerequisites …"

  if ! command -v az &>/dev/null; then
    err "Azure CLI (az) is not installed. Install it from https://aka.ms/install-azure-cli"
    exit 1
  fi

  if ! az account show &>/dev/null; then
    err "You are not logged in to Azure CLI. Run:  az login"
    exit 1
  fi

  if ! command -v git &>/dev/null; then
    err "Git is not installed."
    exit 1
  fi

  success "All prerequisites met."
}

#==============================================================================
# CONFIGURATION  (edit defaults or pass via environment variables)
#==============================================================================
configure() {
  # ── Defaults ──────────────────────────────────────────────────────────────
  DEFAULT_RESOURCE_GROUP="rg-powerpages-engine"
  DEFAULT_LOCATION="canadacentral"           # good for GoC workloads
  DEFAULT_APP_NAME="powerpages-engine-$(openssl rand -hex 3)"
  DEFAULT_PLAN_NAME="plan-powerpages-engine"
  DEFAULT_SKU="B1"                           # Basic; use P1V2+ for prod
  DEFAULT_NODE_VERSION="20-lts"
  DEFAULT_COSMOS_ACCOUNT="cosmos-ppengine-$(openssl rand -hex 3)"

  # Source directory containing the Node app (package.json, app.js, etc.)
  DEFAULT_SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"

  if [[ "${1:-}" == "--defaults" ]]; then
    RESOURCE_GROUP="$DEFAULT_RESOURCE_GROUP"
    LOCATION="$DEFAULT_LOCATION"
    APP_NAME="$DEFAULT_APP_NAME"
    PLAN_NAME="$DEFAULT_PLAN_NAME"
    SKU="$DEFAULT_SKU"
    NODE_VERSION="$DEFAULT_NODE_VERSION"
    COSMOS_ACCOUNT="$DEFAULT_COSMOS_ACCOUNT"
    SOURCE_DIR="$DEFAULT_SOURCE_DIR"
  else
    echo ""
    echo "───────────────────────────────────────────────────────────────"
    echo "  PowerPages Template Engine – Azure Deployment Configuration"
    echo "───────────────────────────────────────────────────────────────"
    echo ""

    read -rp "Resource Group        [$DEFAULT_RESOURCE_GROUP]: " RESOURCE_GROUP
    RESOURCE_GROUP="${RESOURCE_GROUP:-$DEFAULT_RESOURCE_GROUP}"

    read -rp "Azure Region          [$DEFAULT_LOCATION]: " LOCATION
    LOCATION="${LOCATION:-$DEFAULT_LOCATION}"

    read -rp "App Service Name      [$DEFAULT_APP_NAME]: " APP_NAME
    APP_NAME="${APP_NAME:-$DEFAULT_APP_NAME}"

    read -rp "App Service Plan      [$DEFAULT_PLAN_NAME]: " PLAN_NAME
    PLAN_NAME="${PLAN_NAME:-$DEFAULT_PLAN_NAME}"

    read -rp "Plan SKU (B1/S1/P1V2) [$DEFAULT_SKU]: " SKU
    SKU="${SKU:-$DEFAULT_SKU}"

    read -rp "Cosmos DB Account     [$DEFAULT_COSMOS_ACCOUNT]: " COSMOS_ACCOUNT
    COSMOS_ACCOUNT="${COSMOS_ACCOUNT:-$DEFAULT_COSMOS_ACCOUNT}"

    read -rp "Node.js Version       [$DEFAULT_NODE_VERSION]: " NODE_VERSION
    NODE_VERSION="${NODE_VERSION:-$DEFAULT_NODE_VERSION}"

    read -rp "Source directory       [$DEFAULT_SOURCE_DIR]: " SOURCE_DIR
    SOURCE_DIR="${SOURCE_DIR:-$DEFAULT_SOURCE_DIR}"
  fi

  # Ensure source dir has package.json
  if [[ ! -f "$SOURCE_DIR/package.json" ]]; then
    err "No package.json found in $SOURCE_DIR"
    err "Please run this script from the powerpages-template-enginex directory,"
    err "or provide the correct source path."
    exit 1
  fi

  echo ""
  info "Configuration summary:"
  echo "  Resource Group  : $RESOURCE_GROUP"
  echo "  Region          : $LOCATION"
  echo "  App Service     : $APP_NAME"
  echo "  Plan (SKU)      : $PLAN_NAME ($SKU)"
  echo "  Cosmos DB       : $COSMOS_ACCOUNT"
  echo "  Node.js         : $NODE_VERSION"
  echo "  Source          : $SOURCE_DIR"
  echo ""

  if [[ "${1:-}" != "--defaults" ]]; then
    read -rp "Proceed? [Y/n] " CONFIRM
    if [[ "$(echo "$CONFIRM" | tr '[:upper:]' '[:lower:]')" == "n" ]]; then
      info "Aborted."
      exit 0
    fi
  fi
}

#==============================================================================
# 1. RESOURCE GROUP
#==============================================================================
create_resource_group() {
  info "Creating resource group: $RESOURCE_GROUP in $LOCATION …"

  az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output none

  success "Resource group ready."
}

#==============================================================================
# 2. COSMOS DB FOR MONGODB
#==============================================================================
create_cosmos_db() {
  info "Creating Cosmos DB account (MongoDB API): $COSMOS_ACCOUNT …"
  info "(This may take 3-5 minutes)"

  az cosmosdb create \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --kind MongoDB \
    --server-version "4.2" \
    --default-consistency-level Session \
    --locations regionName="$LOCATION" failoverPriority=0 isZoneRedundant=false \
    --output none

  # Create the database
  info "Creating database: powerpages_template_engine …"
  az cosmosdb mongodb database create \
    --account-name "$COSMOS_ACCOUNT" \
    --name "powerpages_template_engine" \
    --resource-group "$RESOURCE_GROUP" \
    --output none

  # Retrieve connection string
  MONGODB_URI=$(az cosmosdb keys list \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --type connection-strings \
    --query "connectionStrings[0].connectionString" \
    --output tsv)

  # Insert database name into the URI (between host:port/ and ?query)
  # Cosmos DB returns: mongodb://...@host:10255/?ssl=true&...
  # We need:          mongodb://...@host:10255/powerpages_template_engine?ssl=true&...
  DB_NAME="powerpages_template_engine"
  if [[ "$MONGODB_URI" != *"/${DB_NAME}?"* ]]; then
    MONGODB_URI=$(python3 -c "
import sys
uri = sys.argv[1]
db = sys.argv[2]
# Find the /? after the host:port and insert db name
idx = uri.find('/?')
if idx != -1:
    uri = uri[:idx+1] + db + uri[idx+1:]
print(uri)
" "$MONGODB_URI" "$DB_NAME")
  fi

  success "Cosmos DB ready."
}

#==============================================================================
# 3. APP SERVICE PLAN
#==============================================================================
create_app_service_plan() {
  info "Creating App Service Plan: $PLAN_NAME ($SKU, Linux) …"

  az appservice plan create \
    --name "$PLAN_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --sku "$SKU" \
    --is-linux \
    --output none

  success "App Service Plan ready."
}

#==============================================================================
# 4. WEB APP
#==============================================================================
create_web_app() {
  info "Creating Web App: $APP_NAME …"

  # Detect available Node runtimes (format varies across Azure CLI versions)
  DESIRED_RUNTIME="NODE:${NODE_VERSION}"
  AVAILABLE_RUNTIMES=$(az webapp list-runtimes --os-type linux 2>/dev/null || az webapp list-runtimes --linux 2>/dev/null || echo "")

  if echo "$AVAILABLE_RUNTIMES" | grep -qi "NODE:${NODE_VERSION}"; then
    RUNTIME_STR="NODE:${NODE_VERSION}"
  elif echo "$AVAILABLE_RUNTIMES" | grep -qi "NODE|${NODE_VERSION}"; then
    RUNTIME_STR="NODE|${NODE_VERSION}"
  else
    # Fallback: pick the latest available Node LTS
    RUNTIME_STR=$(echo "$AVAILABLE_RUNTIMES" | grep -ioE 'NODE[:|][0-9]+-lts' | head -1)
    if [[ -z "$RUNTIME_STR" ]]; then
      RUNTIME_STR="NODE:20-lts"
      warn "Could not detect available Node runtimes. Trying $RUNTIME_STR"
    else
      warn "NODE:${NODE_VERSION} not found. Using detected runtime: $RUNTIME_STR"
    fi
  fi

  info "Using runtime: $RUNTIME_STR"

  az webapp create \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --plan "$PLAN_NAME" \
    --runtime "$RUNTIME_STR" \
    --output none

  # Enable logging
  az webapp log config \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --application-logging filesystem \
    --level information \
    --output none

  success "Web App created: https://${APP_NAME}.azurewebsites.net"
}

#==============================================================================
# 5. CONFIGURE APP SETTINGS (environment variables)
#==============================================================================
configure_app_settings() {
  info "Configuring application settings …"

  APP_URL="https://${APP_NAME}.azurewebsites.net"

  # ── Core settings (always set) ────────────────────────────────────────────
  az webapp config appsettings set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
      NODE_ENV="production" \
      PORT="8080" \
      WEBSITES_PORT="8080" \
      APP_URL="$APP_URL" \
      MONGODB_URI="$MONGODB_URI" \
      SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
    --output none

  success "Core settings configured."

  # ── Optional: import from local .env ──────────────────────────────────────
  ENV_FILE="$SOURCE_DIR/.env"
  if [[ -f "$ENV_FILE" ]]; then
    info "Found .env file — importing relevant secrets …"

    # Read .env and set each key (skip comments, empty lines, and keys we already set)
    SKIP_KEYS="NODE_ENV|PORT|APP_URL|MONGODB_URI|WEBSITES_PORT|SCM_DO_BUILD_DURING_DEPLOYMENT"
    SETTINGS=()

    while IFS='=' read -r key value; do
      # Trim whitespace
      key="$(echo "$key" | xargs)"
      value="$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"

      # Skip blanks, comments, and already-set keys
      [[ -z "$key" || "$key" =~ ^# ]] && continue
      [[ "$key" =~ ^($SKIP_KEYS)$ ]] && continue

      SETTINGS+=("${key}=${value}")
    done < "$ENV_FILE"

    if [[ ${#SETTINGS[@]} -gt 0 ]]; then
      az webapp config appsettings set \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --settings "${SETTINGS[@]}" \
        --output none
      success "Imported ${#SETTINGS[@]} settings from .env"
    fi
  else
    warn "No .env file found at $ENV_FILE"
    warn "You will need to set secrets manually via the Azure Portal or:"
    echo ""
    echo "  az webapp config appsettings set \\"
    echo "    --name $APP_NAME \\"
    echo "    --resource-group $RESOURCE_GROUP \\"
    echo "    --settings \\"
    echo "      SESSION_SECRET=\"<your-secret>\" \\"
    echo "      AZURE_AD_CLIENT_ID=\"<client-id>\" \\"
    echo "      AZURE_AD_CLIENT_SECRET=\"<client-secret>\" \\"
    echo "      AZURE_AD_TENANT_ID=\"common\" \\"
    echo "      AZURE_AD_REDIRECT_URI=\"$APP_URL/auth/microsoft/callback\" \\"
    echo "      STRIPE_SECRET_KEY=\"sk_live_xxx\" \\"
    echo "      STRIPE_PUBLISHABLE_KEY=\"pk_live_xxx\" \\"
    echo "      STRIPE_WEBHOOK_SECRET=\"whsec_xxx\""
    echo ""
  fi

  # Always update the redirect URI to match the deployed URL
  az webapp config appsettings set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
      AZURE_AD_REDIRECT_URI="$APP_URL/auth/microsoft/callback" \
    --output none

  # ── Startup command ───────────────────────────────────────────────────────
  az webapp config set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --startup-file "npm start" \
    --output none

  success "All app settings configured."
}

#==============================================================================
# 6. DEPLOY CODE (zip deploy)
#==============================================================================
deploy_code() {
  info "Preparing deployment package …"

  DEPLOY_DIR=$(mktemp -d)
  DEPLOY_ZIP="$DEPLOY_DIR/deploy.zip"

  # Copy source to temp dir (exclude node_modules, .env, .git)
  rsync -a \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='.git' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    "$SOURCE_DIR/" "$DEPLOY_DIR/app/"

  # Create the zip
  (cd "$DEPLOY_DIR/app" && zip -qr "$DEPLOY_ZIP" .)

  ZIP_SIZE=$(du -h "$DEPLOY_ZIP" | cut -f1)
  info "Deploy package: $ZIP_SIZE"

  info "Deploying to Azure App Service (this may take 2-5 minutes) …"

  az webapp deploy \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --src-path "$DEPLOY_ZIP" \
    --type zip \
    --output none \
    2>&1 || {
      # Fallback to older deployment method if 'az webapp deploy' not available
      warn "Falling back to az webapp deployment source …"
      az webapp deployment source config-zip \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --src "$DEPLOY_ZIP" \
        --output none
    }

  # Cleanup
  rm -rf "$DEPLOY_DIR"

  success "Code deployed."
}

#==============================================================================
# 7. VERIFY DEPLOYMENT
#==============================================================================
verify_deployment() {
  info "Waiting for app to start (30s) …"
  sleep 30

  APP_URL="https://${APP_NAME}.azurewebsites.net"
  HEALTH_URL="${APP_URL}/api/health"

  info "Checking health endpoint: $HEALTH_URL"

  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" --max-time 15 2>/dev/null || echo "000")

  if [[ "$HTTP_STATUS" == "200" ]]; then
    success "Health check passed! (HTTP $HTTP_STATUS)"
  elif [[ "$HTTP_STATUS" == "000" ]]; then
    warn "Could not reach the app yet. It may still be starting up."
    warn "Check logs with:  az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
  else
    warn "Health check returned HTTP $HTTP_STATUS"
    warn "The app may still be initializing. Check logs for errors:"
    echo "  az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
  fi
}

#==============================================================================
# 8. PRINT SUMMARY
#==============================================================================
print_summary() {
  APP_URL="https://${APP_NAME}.azurewebsites.net"

  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║            DEPLOYMENT COMPLETE                               ║"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║                                                              ║"
  printf "║  %-58s  ║\n" "App URL:     $APP_URL"
  printf "║  %-58s  ║\n" "Resource Grp: $RESOURCE_GROUP"
  printf "║  %-58s  ║\n" "App Service:  $APP_NAME"
  printf "║  %-58s  ║\n" "Cosmos DB:    $COSMOS_ACCOUNT"
  printf "║  %-58s  ║\n" "Region:       $LOCATION"
  printf "║  %-58s  ║\n" "SKU:          $SKU"
  echo "║                                                              ║"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║  POST-DEPLOYMENT STEPS:                                      ║"
  echo "║                                                              ║"
  echo "║  1. Update Entra ID app registration redirect URI:           ║"
  printf "║     %-56s  ║\n" "$APP_URL/auth/microsoft/callback"
  echo "║                                                              ║"
  echo "║  2. Update Stripe webhook endpoint:                          ║"
  printf "║     %-56s  ║\n" "$APP_URL/webhook/stripe"
  echo "║                                                              ║"
  echo "║  3. Set remaining secrets (if not imported from .env):       ║"
  echo "║     az webapp config appsettings set \\                       ║"
  echo "║       --name $APP_NAME \\                                     ║"
  echo "║       --resource-group $RESOURCE_GROUP \\                     ║"
  echo "║       --settings KEY=VALUE                                   ║"
  echo "║                                                              ║"
  echo "║  4. View logs:                                               ║"
  echo "║     az webapp log tail \\                                     ║"
  echo "║       --name $APP_NAME \\                                     ║"
  echo "║       --resource-group $RESOURCE_GROUP                       ║"
  echo "║                                                              ║"
  echo "║  5. Enable custom domain + SSL (production):                 ║"
  echo "║     az webapp config hostname add \\                          ║"
  echo "║       --webapp-name $APP_NAME \\                              ║"
  echo "║       --resource-group $RESOURCE_GROUP \\                     ║"
  echo "║       --hostname yourdomain.com                              ║"
  echo "║                                                              ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
}

#==============================================================================
# TEARDOWN HELPER (optional, for cleanup)
#==============================================================================
teardown() {
  warn "This will DELETE all resources in resource group: $RESOURCE_GROUP"
  read -rp "Are you sure? Type the resource group name to confirm: " CONFIRM
  if [[ "$CONFIRM" == "$RESOURCE_GROUP" ]]; then
    info "Deleting resource group …"
    az group delete --name "$RESOURCE_GROUP" --yes --no-wait
    success "Deletion initiated (runs in background)."
  else
    info "Aborted."
  fi
}

#==============================================================================
# MAIN
#==============================================================================
main() {
  echo ""
  echo "  ╔══════════════════════════════════════════════════════╗"
  echo "  ║  PowerPages Template Engine – Azure Deploy Script   ║"
  echo "  ║  Node.js · Express · MongoDB · Entra ID · Stripe   ║"
  echo "  ╚══════════════════════════════════════════════════════╝"
  echo ""

  # Handle --teardown flag
  if [[ "${1:-}" == "--teardown" ]]; then
    configure "${2:---defaults}"
    teardown
    exit 0
  fi

  check_prereqs
  configure "${1:-}"
  create_resource_group
  create_cosmos_db
  create_app_service_plan
  create_web_app
  configure_app_settings
  deploy_code
  verify_deployment
  print_summary
}

main "$@"