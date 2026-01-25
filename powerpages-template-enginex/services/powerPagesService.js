/**
 * Power Pages Dataverse Service
 * Handles Power Pages site creation and theme deployment via Dataverse Web API
 */

const { ConfidentialClientApplication } = require('@azure/msal-node');
const logger = require('../config/logger');

class PowerPagesService {
    constructor() {
        this.msalConfig = {
            auth: {
                clientId: process.env.DATAVERSE_CLIENT_ID,
                clientSecret: process.env.DATAVERSE_CLIENT_SECRET,
                authority: `https://login.microsoftonline.com/${process.env.DATAVERSE_TENANT_ID}`
            }
        };
        this.msalClient = null;
    }
    
    /**
     * Initialize MSAL client
     */
    initialize() {
        if (!this.msalClient) {
            this.msalClient = new ConfidentialClientApplication(this.msalConfig);
        }
    }
    
    /**
     * Get access token for Dataverse
     */
    async getAccessToken(environmentUrl) {
        this.initialize();
        
        try {
            const result = await this.msalClient.acquireTokenByClientCredential({
                scopes: [`${environmentUrl}/.default`]
            });
            return result.accessToken;
        } catch (error) {
            logger.error('Failed to acquire Dataverse token:', error);
            throw new Error('Failed to authenticate with Dataverse');
        }
    }
    
    /**
     * Make authenticated request to Dataverse
     */
    async dataverseRequest(environmentUrl, endpoint, method = 'GET', data = null) {
        const token = await this.getAccessToken(environmentUrl);
        const url = `${environmentUrl}/api/data/v9.2/${endpoint}`;
        
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json',
                'Prefer': 'return=representation'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            logger.error('Dataverse request failed:', { 
                status: response.status, 
                error: errorText,
                endpoint 
            });
            throw new Error(`Dataverse API error: ${response.status}`);
        }
        
        if (response.status === 204) {
            return null;
        }
        
        return response.json();
    }
    
    /**
     * Get list of Power Pages websites in environment
     */
    async getWebsites(environmentUrl) {
        try {
            const result = await this.dataverseRequest(
                environmentUrl,
                'powerpagesites?$select=powerpagesiteid,name,websiteurl,statecode&$filter=statecode eq 0'
            );
            return result.value || [];
        } catch (error) {
            logger.error('Failed to get websites:', error);
            throw error;
        }
    }
    
    /**
     * Get website details
     */
    async getWebsite(environmentUrl, websiteId) {
        try {
            const result = await this.dataverseRequest(
                environmentUrl,
                `powerpagesites(${websiteId})`
            );
            return result;
        } catch (error) {
            logger.error('Failed to get website:', error);
            throw error;
        }
    }
    
    /**
     * Create a new blank Power Pages site
     * Note: In production, this would use Power Platform CLI or Admin API
     * The Dataverse API has limited support for site creation
     */
    async createBlankSite(environmentUrl, options) {
        const {
            name,
            websiteUrl,
            language = 1033, // English
            organizationId
        } = options;
        
        logger.info('Creating new Power Pages site:', { name, websiteUrl });
        
        // Note: Direct site creation via Dataverse API is limited
        // In production, you would use:
        // 1. Power Platform CLI (pac paportal create)
        // 2. Power Platform Admin API
        // 3. ARM templates for Azure-based deployment
        
        // For this implementation, we'll create a placeholder site record
        // and return instructions for manual site creation
        
        try {
            // Check if site name is available
            const existingSites = await this.getWebsites(environmentUrl);
            const nameExists = existingSites.some(s => 
                s.name.toLowerCase() === name.toLowerCase()
            );
            
            if (nameExists) {
                throw new Error(`A site with name "${name}" already exists`);
            }
            
            // In a full implementation, this would create the site
            // For now, return a structure indicating what needs to be done
            return {
                success: false,
                requiresManualCreation: true,
                instructions: {
                    summary: 'Power Pages site creation requires Power Platform Admin access',
                    steps: [
                        {
                            step: 1,
                            title: 'Open Power Pages',
                            description: 'Go to https://make.powerpages.microsoft.com',
                            url: 'https://make.powerpages.microsoft.com'
                        },
                        {
                            step: 2,
                            title: 'Select Environment',
                            description: `Select your environment: ${environmentUrl}`
                        },
                        {
                            step: 3,
                            title: 'Create New Site',
                            description: 'Click "+ Create a site" and choose "Blank site" or "Start from template"'
                        },
                        {
                            step: 4,
                            title: 'Configure Site',
                            description: `Name your site "${name}" and complete the wizard`
                        },
                        {
                            step: 5,
                            title: 'Get Website ID',
                            description: 'Once created, copy the Website ID from the site settings'
                        },
                        {
                            step: 6,
                            title: 'Return Here',
                            description: 'Enter the Website ID to continue with theme deployment'
                        }
                    ],
                    cliCommand: `pac paportal create --name "${name}" --environment "${environmentUrl}"`,
                    documentation: 'https://learn.microsoft.com/power-pages/configure/portal-management-app'
                },
                suggestedSettings: {
                    name,
                    websiteUrl: websiteUrl || `${name.toLowerCase().replace(/\s+/g, '-')}.powerappsportals.com`,
                    language,
                    template: 'blank'
                }
            };
            
        } catch (error) {
            logger.error('Error in createBlankSite:', error);
            throw error;
        }
    }
    
    /**
     * Get web files for a website (for theme deployment)
     */
    async getWebFiles(environmentUrl, websiteId) {
        try {
            const result = await this.dataverseRequest(
                environmentUrl,
                `adx_webfiles?$select=adx_webfileid,adx_name,adx_partialurl&$filter=_adx_websiteid_value eq ${websiteId}`
            );
            return result.value || [];
        } catch (error) {
            logger.error('Failed to get web files:', error);
            throw error;
        }
    }
    
    /**
     * Upload a web file to Power Pages
     */
    async uploadWebFile(environmentUrl, websiteId, fileData) {
        const {
            name,
            partialUrl,
            mimeType,
            content, // Base64 encoded content
            parentPageId
        } = fileData;
        
        try {
            // Create web file record
            const webFile = await this.dataverseRequest(
                environmentUrl,
                'adx_webfiles',
                'POST',
                {
                    'adx_name': name,
                    'adx_partialurl': partialUrl,
                    'adx_websiteid@odata.bind': `/powerpagesites(${websiteId})`,
                    ...(parentPageId && { 'adx_parentpageid@odata.bind': `/adx_webpages(${parentPageId})` })
                }
            );
            
            // Upload file content as annotation/note
            if (content) {
                await this.dataverseRequest(
                    environmentUrl,
                    'annotations',
                    'POST',
                    {
                        'subject': name,
                        'filename': name,
                        'mimetype': mimeType,
                        'documentbody': content,
                        'objectid_adx_webfile@odata.bind': `/adx_webfiles(${webFile.adx_webfileid})`
                    }
                );
            }
            
            return webFile;
        } catch (error) {
            logger.error('Failed to upload web file:', error);
            throw error;
        }
    }
    
    /**
     * Deploy theme to Power Pages site
     */
    async deployTheme(environmentUrl, websiteId, themeFiles, organizationBranding = null) {
        logger.info('Deploying theme to Power Pages:', { websiteId, fileCount: themeFiles.length });
        
        const deploymentLog = [];
        let successCount = 0;
        let errorCount = 0;
        
        try {
            // If organization branding provided, inject into theme
            if (organizationBranding) {
                themeFiles = this.injectBranding(themeFiles, organizationBranding);
            }
            
            for (const file of themeFiles) {
                try {
                    await this.uploadWebFile(environmentUrl, websiteId, file);
                    successCount++;
                    deploymentLog.push({
                        file: file.name,
                        status: 'success',
                        timestamp: new Date()
                    });
                } catch (fileError) {
                    errorCount++;
                    deploymentLog.push({
                        file: file.name,
                        status: 'error',
                        error: fileError.message,
                        timestamp: new Date()
                    });
                }
            }
            
            // Clear and rebuild cache
            await this.clearSiteCache(environmentUrl, websiteId);
            
            return {
                success: errorCount === 0,
                totalFiles: themeFiles.length,
                successCount,
                errorCount,
                deploymentLog
            };
            
        } catch (error) {
            logger.error('Theme deployment failed:', error);
            throw error;
        }
    }
    
    /**
     * Inject organization branding into theme files
     */
    injectBranding(themeFiles, branding) {
        return themeFiles.map(file => {
            // Inject branding into HTML files
            if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
                let content = Buffer.from(file.content, 'base64').toString('utf8');
                
                // Replace logo placeholders
                if (branding.logo?.url) {
                    content = content.replace(/\{\{LOGO_URL\}\}/g, branding.logo.url);
                    content = content.replace(/\{\{LOGO_ALT\}\}/g, branding.logo.altText || branding.organizationName);
                }
                
                // Replace organization name
                if (branding.organizationName) {
                    content = content.replace(/\{\{ORG_NAME\}\}/g, branding.organizationName);
                }
                
                // Replace colors in inline styles
                if (branding.colors) {
                    content = content.replace(/\{\{PRIMARY_COLOR\}\}/g, branding.colors.primary || '#2563eb');
                    content = content.replace(/\{\{SECONDARY_COLOR\}\}/g, branding.colors.secondary || '#1e40af');
                    content = content.replace(/\{\{ACCENT_COLOR\}\}/g, branding.colors.accent || '#06b6d4');
                }
                
                file.content = Buffer.from(content).toString('base64');
            }
            
            // Inject branding into CSS files
            if (file.name.endsWith('.css')) {
                let content = Buffer.from(file.content, 'base64').toString('utf8');
                
                // Replace CSS custom properties
                if (branding.colors) {
                    const cssVars = `
:root {
    --brand-primary: ${branding.colors.primary || '#2563eb'};
    --brand-secondary: ${branding.colors.secondary || '#1e40af'};
    --brand-accent: ${branding.colors.accent || '#06b6d4'};
    --brand-text: ${branding.colors.text || '#1e293b'};
    --brand-background: ${branding.colors.background || '#ffffff'};
}
`;
                    content = cssVars + content;
                }
                
                // Replace font references
                if (branding.fonts) {
                    content = content.replace(/\{\{HEADING_FONT\}\}/g, branding.fonts.heading || 'Plus Jakarta Sans');
                    content = content.replace(/\{\{BODY_FONT\}\}/g, branding.fonts.body || 'Plus Jakarta Sans');
                }
                
                file.content = Buffer.from(content).toString('base64');
            }
            
            return file;
        });
    }
    
    /**
     * Clear Power Pages site cache
     */
    async clearSiteCache(environmentUrl, websiteId) {
        try {
            // Trigger cache clear action
            // Note: Actual implementation depends on your Power Pages setup
            logger.info('Clearing site cache:', { websiteId });
            
            // In production, you might call a custom action or flow
            // await this.dataverseRequest(environmentUrl, `ClearPortalCache(websiteId=${websiteId})`, 'POST');
            
            return true;
        } catch (error) {
            logger.warn('Cache clear failed (non-critical):', error);
            return false;
        }
    }
    
    /**
     * Get site deployment status
     */
    async getDeploymentStatus(environmentUrl, websiteId) {
        try {
            const website = await this.getWebsite(environmentUrl, websiteId);
            const webFiles = await this.getWebFiles(environmentUrl, websiteId);
            
            return {
                website: {
                    id: website.powerpagesiteid,
                    name: website.name,
                    url: website.websiteurl,
                    status: website.statecode === 0 ? 'active' : 'inactive'
                },
                fileCount: webFiles.length,
                lastChecked: new Date()
            };
        } catch (error) {
            logger.error('Failed to get deployment status:', error);
            throw error;
        }
    }
    
    /**
     * Validate theme structure before deployment
     */
    validateThemeStructure(themeFiles) {
        const errors = [];
        const warnings = [];
        
        // Check for required files
        const fileNames = themeFiles.map(f => f.name.toLowerCase());
        
        if (!fileNames.some(f => f === 'index.html' || f.endsWith('/index.html'))) {
            errors.push('Missing index.html - every theme must have an entry point');
        }
        
        // Check for CSS
        if (!fileNames.some(f => f.endsWith('.css'))) {
            warnings.push('No CSS files found - theme may not display correctly');
        }
        
        // Check for Bootstrap
        const hasBootstrap = fileNames.some(f => 
            f.includes('bootstrap') && (f.endsWith('.css') || f.endsWith('.js'))
        );
        if (!hasBootstrap) {
            warnings.push('Bootstrap files not detected - ensure Bootstrap is properly included');
        }
        
        // Check file sizes
        const largeFiles = themeFiles.filter(f => {
            const size = Buffer.from(f.content, 'base64').length;
            return size > 5 * 1024 * 1024; // 5MB
        });
        if (largeFiles.length > 0) {
            warnings.push(`${largeFiles.length} file(s) exceed 5MB and may affect performance`);
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}

module.exports = new PowerPagesService();
