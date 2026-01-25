/**
 * PowerPages Template Engine
 * Main JavaScript File
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
    }
    
    // Auto-dismiss alerts
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            alert.style.opacity = '0';
            setTimeout(function() {
                alert.remove();
            }, 300);
        }, 5000);
    });
    
    // File upload drag and drop
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    if (dropZone && fileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            dropZone.classList.add('drag-over');
        }
        
        function unhighlight() {
            dropZone.classList.remove('drag-over');
        }
        
        dropZone.addEventListener('drop', handleDrop, false);
        dropZone.addEventListener('click', function() {
            fileInput.click();
        });
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                fileInput.files = files;
                updateFileInfo(files[0]);
            }
        }
        
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                updateFileInfo(this.files[0]);
            }
        });
        
        function updateFileInfo(file) {
            const fileNameEl = dropZone.querySelector('.upload-text');
            const fileHintEl = dropZone.querySelector('.upload-hint');
            
            if (fileNameEl) {
                fileNameEl.textContent = file.name;
            }
            if (fileHintEl) {
                fileHintEl.textContent = formatFileSize(file.size);
            }
        }
    }
    
    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Pricing toggle (monthly/annual)
    const billingToggle = document.getElementById('billingToggle');
    const priceAmounts = document.querySelectorAll('.price-amount');
    
    if (billingToggle && priceAmounts.length > 0) {
        billingToggle.addEventListener('change', function() {
            const isAnnual = this.checked;
            priceAmounts.forEach(function(el) {
                const monthly = el.dataset.monthly;
                const annual = el.dataset.annual;
                el.textContent = isAnnual ? annual : monthly;
            });
        });
    }
    
    // Stripe checkout
    const checkoutButtons = document.querySelectorAll('[data-checkout]');
    
    checkoutButtons.forEach(function(button) {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const plan = this.dataset.plan;
            const billingCycle = billingToggle && billingToggle.checked ? 'annual' : 'monthly';
            const csrfToken = document.querySelector('[name="_csrf"]')?.value;
            
            button.disabled = true;
            button.textContent = 'Processing...';
            
            try {
                const response = await fetch('/payment/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ plan, billingCycle })
                });
                
                const data = await response.json();
                
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    throw new Error(data.error || 'Failed to create checkout session');
                }
            } catch (error) {
                console.error('Checkout error:', error);
                alert('Failed to start checkout. Please try again.');
                button.disabled = false;
                button.textContent = 'Get Started';
            }
        });
    });
    
    // Deployment status polling
    const statusContainer = document.getElementById('deploymentStatus');
    
    if (statusContainer) {
        const themeId = statusContainer.dataset.themeId;
        
        if (themeId) {
            pollDeploymentStatus(themeId);
        }
    }
    
    async function pollDeploymentStatus(themeId) {
        try {
            const response = await fetch(`/upload/api/status/${themeId}`);
            const data = await response.json();
            
            updateStatusUI(data);
            
            // Continue polling if not complete or failed
            if (!['completed', 'failed'].includes(data.status)) {
                setTimeout(() => pollDeploymentStatus(themeId), 3000);
            }
        } catch (error) {
            console.error('Status polling error:', error);
            setTimeout(() => pollDeploymentStatus(themeId), 5000);
        }
    }
    
    function updateStatusUI(data) {
        const statusEl = document.getElementById('currentStatus');
        const progressEl = document.getElementById('progressBar');
        const logsEl = document.getElementById('deploymentLogs');
        const completedSection = document.getElementById('completedSection');
        const processingSection = document.getElementById('processingSection');
        
        if (statusEl) {
            statusEl.textContent = data.status;
            statusEl.className = 'status-badge ' + getStatusClass(data.status);
        }
        
        if (progressEl) {
            progressEl.style.width = data.progress + '%';
        }
        
        if (logsEl && data.logs) {
            logsEl.innerHTML = data.logs.map(function(log) {
                return '<div class="log-entry log-' + log.level + '">' +
                    '<span class="log-time">' + new Date(log.timestamp).toLocaleTimeString() + '</span>' +
                    '<span class="log-message">' + log.message + '</span>' +
                '</div>';
            }).join('');
            logsEl.scrollTop = logsEl.scrollHeight;
        }
        
        // Show completed section
        if (data.status === 'completed' && completedSection && processingSection) {
            processingSection.style.display = 'none';
            completedSection.style.display = 'block';
            
            const websiteLink = document.getElementById('websiteLink');
            if (websiteLink && data.websiteUrl) {
                websiteLink.href = data.websiteUrl;
                websiteLink.textContent = data.websiteUrl;
            }
        }
        
        // Show error if failed
        if (data.status === 'failed') {
            const errorSection = document.getElementById('errorSection');
            const errorMessage = document.getElementById('errorMessage');
            
            if (errorSection) {
                errorSection.style.display = 'block';
            }
            if (processingSection) {
                processingSection.style.display = 'none';
            }
            if (errorMessage && data.errorMessage) {
                errorMessage.textContent = data.errorMessage;
            }
        }
    }
    
    function getStatusClass(status) {
        const classes = {
            'pending': 'badge-secondary',
            'validating': 'badge-info',
            'creating_site': 'badge-info',
            'deploying': 'badge-warning',
            'completed': 'badge-success',
            'failed': 'badge-danger'
        };
        return classes[status] || 'badge-secondary';
    }
    
    // Theme filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    const themeCards = document.querySelectorAll('.theme-card');
    
    filterButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            const filter = this.dataset.filter;
            
            // Update active button
            filterButtons.forEach(function(btn) {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Filter cards
            themeCards.forEach(function(card) {
                if (filter === 'all') {
                    card.style.display = 'block';
                } else {
                    const categories = card.dataset.category || '';
                    if (categories.includes(filter)) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
        });
    });
    
    // Confirm delete dialogs
    const deleteButtons = document.querySelectorAll('[data-confirm-delete]');
    
    deleteButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            const message = this.dataset.confirmDelete || 'Are you sure you want to delete this?';
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
    
});
