// Pricing page billing toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const billingToggle = document.getElementById('billing-toggle');
    const monthlyLabel = document.getElementById('monthly-label');
    const annualLabel = document.getElementById('annual-label');
    const priceElements = document.querySelectorAll('.price[data-monthly]');

    if (!billingToggle) return;

    // Set annual as default (checked)
    billingToggle.checked = true;
    updatePricing(true);
    updateLabels(true);

    billingToggle.addEventListener('change', function() {
        const isAnnual = this.checked;
        updatePricing(isAnnual);
        updateLabels(isAnnual);
    });

    function updatePricing(isAnnual) {
        priceElements.forEach(priceEl => {
            const monthlyPrice = priceEl.getAttribute('data-monthly');
            const annualPrice = priceEl.getAttribute('data-annual');
            
            if (isAnnual && annualPrice) {
                animateValue(priceEl, parseInt(priceEl.textContent), parseInt(annualPrice), 300);
            } else if (!isAnnual && monthlyPrice) {
                animateValue(priceEl, parseInt(priceEl.textContent), parseInt(monthlyPrice), 300);
            }
        });
    }

    function updateLabels(isAnnual) {
        if (isAnnual) {
            monthlyLabel.classList.remove('active');
            annualLabel.classList.add('active');
        } else {
            monthlyLabel.classList.add('active');
            annualLabel.classList.remove('active');
        }
    }

    function animateValue(element, start, end, duration) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const timer = setInterval(function() {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Math.round(current);
        }, 16);
    }
});