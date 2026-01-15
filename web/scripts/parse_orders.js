const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'lista_faltas.txt');
const outputFile = path.join(__dirname, '..', 'parsed_orders.json');

const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n').map(l => l.trim());

const orders = [];
let currentOrder = null;

const SCHOOL_KEYWORDS = ['TRINUM', 'DIANTE DO APRENDER', 'CRESCIMENTO', 'BABYTOOM', 'CHILD TIME', 'MAPLE BEAR', 'SANTA TERESA', 'AUDAZ', 'CIRANDA'];

function isSchoolHeader(line) {
    const upper = line.toUpperCase();
    return SCHOOL_KEYWORDS.some(school => upper.includes(school));
}

function extractPaymentStatus(line) {
    const upper = line.toUpperCase();
    if (upper.includes('PAGO')) return 'Pago Total';
    if (upper.includes('METADE') || upper.includes('50%')) return 'Parcial';
    return 'Pendente';
}

function normalizePhone(phone) {
    let cleaned = phone.replace(/\D/g, '');
    // If it starts with 98 or 99 (DDD MA) and length is correct, keep it.
    // Assuming mostly local numbers.
    if (cleaned.length === 8) cleaned = '9800000000'; // Invalid placeholder? Or prepend 989...
    if (cleaned.length === 9) cleaned = '98' + cleaned;
    
    return cleaned;
}

lines.forEach((line, index) => {
    if (!line) return;

    // Heuristic: New order often starts with School name
    if (isSchoolHeader(line)) {
        if (currentOrder) orders.push(currentOrder);
        currentOrder = {
            raw_header: line,
            school: SCHOOL_KEYWORDS.find(s => line.toUpperCase().includes(s)) || 'TRINUM', // Default or detected
            payment_status: extractPaymentStatus(line),
            items: [],
            customer: '',
            phone: '',
            raw_lines: []
        };
        return;
    }

    if (!currentOrder) {
        // Start a generic order if none exists but lines are appearing (rare case at start of file)
        currentOrder = {
            school: 'UNKNOWN',
            payment_status: 'Pendente',
            items: [],
            customer: '',
            phone: '',
            raw_lines: []
        };
    }

    currentOrder.raw_lines.push(line);

    // Heuristics for data
    const phoneMatch = line.match(/(\d{2})?\s?9?\s?\d{4}[\s-]?\d{4}/);
    if (phoneMatch) {
         currentOrder.phone = normalizePhone(phoneMatch[0]);
         // Often the name is on the same line or line before
         const lineWithoutPhone = line.replace(phoneMatch[0], '').trim().replace(/contato|:/gi, '');
         if (lineWithoutPhone.length > 2) {
             currentOrder.customer = lineWithoutPhone;
         }
         return;
    }

    // Heuristics for Customer Name (starts with Mae, Pai, Contato, or unlikely to be an item)
    if (/^(Mãe|Mae|Pai|Contato|Nome)[:\s]/i.test(line)) {
        let name = line.replace(/^(Mãe|Mae|Pai|Contato|Nome)[:\s]*/i, '').trim();
        // Remove "pago" from name if present
        name = name.replace(/[- ]?pago/i, '').trim();
        if (name) currentOrder.customer = name;
        return;
    }

    // Heuristic for items (contains keywords)
    if (/(polo|calça|bermuda|regata|short|saia|vestido|conjunto|camisa)/i.test(line)) {
        currentOrder.items.push(line);
        return;
    }
    
    // Fallback: if not phone, not header, not item, maybe just a name line?
    // If we don't have a name yet, assume this is it.
    if (!currentOrder.customer && !line.match(/\d/)) { // Names usually don't have numbers
        currentOrder.customer = line;
    }
});

if (currentOrder) orders.push(currentOrder);

// Post-processing cleanup
orders.forEach(o => {
    // If school is UNKNOWN, try to infer from previous
    // Actually, usually explicit.
    
    // Capitalize Customer
    if (o.customer) {
        o.customer = o.customer.charAt(0).toUpperCase() + o.customer.slice(1);
    } else {
        o.customer = "Cliente Desconhecido";
    }
});

console.log(JSON.stringify(orders, null, 2));
