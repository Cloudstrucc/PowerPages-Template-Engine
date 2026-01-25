/**
 * Handlebars Custom Helpers
 */

module.exports = {
    // Equality check
    eq: (a, b) => a === b,
    
    // Not equal
    neq: (a, b) => a !== b,
    
    // Greater than
    gt: (a, b) => a > b,
    
    // Less than
    lt: (a, b) => a < b,
    
    // Greater than or equal
    gte: (a, b) => a >= b,
    
    // Less than or equal
    lte: (a, b) => a <= b,
    
    // AND operator
    and: (...args) => {
        args.pop(); // Remove Handlebars options object
        return args.every(Boolean);
    },
    
    // OR operator
    or: (...args) => {
        args.pop(); // Remove Handlebars options object
        return args.some(Boolean);
    },
    
    // NOT operator
    not: (value) => !value,
    
    // Format date
    formatDate: (date, format) => {
        if (!date) return '';
        const d = new Date(date);
        const options = {
            short: { year: 'numeric', month: 'short', day: 'numeric' },
            long: { year: 'numeric', month: 'long', day: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' },
            full: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        };
        return d.toLocaleDateString('en-US', options[format] || options.short);
    },
    
    // Format currency
    formatCurrency: (amount, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },
    
    // Format number
    formatNumber: (number) => {
        if (!number) return '0';
        return new Intl.NumberFormat('en-US').format(number);
    },
    
    // Truncate text
    truncate: (str, len = 100) => {
        if (!str) return '';
        if (str.length <= len) return str;
        return str.substring(0, len) + '...';
    },
    
    // Lowercase
    lowercase: (str) => str ? str.toLowerCase() : '',
    
    // Uppercase
    uppercase: (str) => str ? str.toUpperCase() : '',
    
    // Capitalize first letter
    capitalize: (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    
    // Title case
    titleCase: (str) => {
        if (!str) return '';
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    },
    
    // JSON stringify (for debugging)
    json: (context) => JSON.stringify(context, null, 2),
    
    // Select option helper
    select: (selected, options) => {
        return options.fn(this).replace(
            new RegExp(' value=\"' + selected + '\"'),
            '$& selected="selected"'
        );
    },
    
    // Checked helper for checkboxes
    checked: (value, test) => value === test ? 'checked' : '',
    
    // Active class helper for navigation
    activeIf: (path, currentPath) => path === currentPath ? 'active' : '',
    
    // Times helper (repeat n times)
    times: (n, block) => {
        let result = '';
        for (let i = 0; i < n; i++) {
            result += block.fn({ index: i, num: i + 1 });
        }
        return result;
    },
    
    // File size formatter
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // Status badge class
    statusBadge: (status) => {
        const badges = {
            'active': 'badge-success',
            'pending': 'badge-warning',
            'processing': 'badge-info',
            'completed': 'badge-success',
            'failed': 'badge-danger',
            'cancelled': 'badge-secondary'
        };
        return badges[status] || 'badge-secondary';
    },
    
    // Pluralize
    pluralize: (count, singular, plural) => {
        return count === 1 ? singular : (plural || singular + 's');
    },
    
    // Include raw content (use with caution)
    raw: (options) => options.fn(this),
    
    // Math operations
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    divide: (a, b) => b !== 0 ? a / b : 0,
    
    // Array includes
    includes: (array, value) => {
        if (!Array.isArray(array)) return false;
        return array.includes(value);
    },
    
    // Get array length
    length: (array) => {
        if (!array) return 0;
        return array.length;
    },
    
    // First item of array
    first: (array) => {
        if (!Array.isArray(array) || array.length === 0) return null;
        return array[0];
    },
    
    // Last item of array
    last: (array) => {
        if (!Array.isArray(array) || array.length === 0) return null;
        return array[array.length - 1];
    }
};
