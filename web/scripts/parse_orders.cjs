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
    if (cleaned.length === 8) cleaned = '98' + cleaned; // Fix: was 980000..
    if (cleaned.length === 9) cleaned = '98' + cleaned;
    
    return cleaned;
}

lines.forEach((line, index) => {
    if (!line) return;

    // Heuristic: New order often starts with School name
    if (isSchoolHeader(line)) {
        if (currentOrder) {
            // Post-process previous order before pushing
            finalizeOrder(currentOrder);
            orders.push(currentOrder);
        }
        currentOrder = {
            raw_header: line,
            school: SCHOOL_KEYWORDS.find(s => line.toUpperCase().includes(s)) || 'TRINUM', 
            payment_status: extractPaymentStatus(line),
            items: [],
            parsed_items: [],
            customer: '',
            phone: '',
            raw_lines: []
        };
        return;
    }

    if (!currentOrder) {
        currentOrder = {
            school: 'UNKNOWN',
            payment_status: 'Pendente',
            items: [],
            parsed_items: [],
            customer: '',
            phone: '',
            raw_lines: []
        };
    }

    currentOrder.raw_lines.push(line);

    const phoneMatch = line.match(/(\d{2})?\s?9?\s?\d{4}[\s-]?\d{4}/);
    if (phoneMatch) {
         currentOrder.phone = normalizePhone(phoneMatch[0]);
         const lineWithoutPhone = line.replace(phoneMatch[0], '').trim().replace(/contato|:|cont\.?/gi, '');
         if (lineWithoutPhone.length > 2) {
             currentOrder.customer = lineWithoutPhone;
         }
         // Check for payment in phone line too
         if (line.toUpperCase().includes('PAGO')) currentOrder.payment_status = 'Pago Total';
         return;
    }

    // Heuristics for Customer Name
    if (/^(Mãe|Mae|Pai|Contato|Nome)[:\s]/i.test(line)) {
        let name = line.replace(/^(Mãe|Mae|Pai|Contato|Nome)[:\s]*/i, '').trim();
        if (name.toUpperCase().includes('PAGO')) {
            currentOrder.payment_status = 'Pago Total';
            name = name.replace(/[- ]?pago/i, '').trim();
        }
        if (name) currentOrder.customer = name;
        return;
    }

    // Item Detection
    if (/(polo|calça|bermuda|regata|short|saia|vestido|conjunto|camisa)/i.test(line)) {
        currentOrder.items.push(line);
        return;
    }
    
    // Fallback Name
    if (!currentOrder.customer && !line.match(/\d/) && line.length > 2) { 
        if (line.toUpperCase().includes('PAGO')) {
             currentOrder.payment_status = 'Pago Total';
             let name = line.replace(/[- ]?pago/i, '').trim();
             currentOrder.customer = name;
        } else {
             currentOrder.customer = line;
        }
    }
});

if (currentOrder) {
    finalizeOrder(currentOrder);
    orders.push(currentOrder);
}

function finalizeOrder(order) {
    // 1. Check all raw lines for PAGO if still pending
    if (order.payment_status === 'Pendente') {
        const fullText = order.raw_lines.join(' ').toUpperCase();
        if (fullText.includes('PAGO')) order.payment_status = 'Pago Total';
        if (fullText.includes('METADE') || fullText.includes('50%')) order.payment_status = 'Parcial';
    }

    // 2. Clean Customer Name
    if (order.customer) {
        order.customer = order.customer.replace(/[- ]?pago/gi, '').replace(/cont\.?|:/gi, '').trim();
        order.customer = order.customer.charAt(0).toUpperCase() + order.customer.slice(1);
    } else {
        order.customer = "Cliente Desconhecido";
    }

    // 3. Parse Items
    order.items.forEach(rawItem => {
        // Try to extract quantity and type
        // Examples: "2 vestidos T-4", "3 polos tam 6", "1 regata tam 6"
        const qtyMatch = rawItem.match(/^(\d+)/);
        const quantity = qtyMatch ? parseInt(qtyMatch[0]) : 1;
        
        let cleanItem = rawItem.replace(/^\d+\s*/, ''); // remove quantity
        
        // Extract Size: "tam. X", "T-X", "tam X", "T X"
        // Regex: \b(tam\.?|t-?|size)\s*([\w\d]+)
        const sizeMatch = cleanItem.match(/\b(?:tam\.?|t-?|size)[:\s]*([\w\d]+)/i);
        let size = 'Padrão';
        if (sizeMatch) {
            size = sizeMatch[1].toUpperCase();
            cleanItem = cleanItem.replace(sizeMatch[0], '').trim();
        } else {
            // Check for trailing numbers that might be size (e.g. "vestidos 4")
            const trailingNum = cleanItem.match(/\s(\d+)$/);
            if (trailingNum) {
                size = trailingNum[1];
                cleanItem = cleanItem.replace(trailingNum[0], '').trim();
            }
        }
        
        // Product Name is what is left
        let product = cleanItem.replace(/[-:]/g, '').trim();
        if (!product) product = "Item Indefinido";

        order.parsed_items.push({
            quantity,
            product,
            size
        });
    });
}

// Generate SQL
let sqlContent = '';
orders.forEach(o => {
    // Sanitization helper
    const sanitize = (str) => {
        if (!str) return 'NULL';
        return "'" + str.replace(/'/g, "''").replace(/\n/g, " ") + "'";
    };

    const parsedItemsJson = JSON.stringify(o.parsed_items);
    const originalText = o.raw_lines.join('\\n');

    sqlContent += `INSERT INTO imported_orders (customer_name, phone, school, payment_status, original_text, parsed_items, status) VALUES (${sanitize(o.customer)}, ${sanitize(o.phone)}, ${sanitize(o.school)}, ${sanitize(o.payment_status)}, ${sanitize(originalText)}, ${sanitize(parsedItemsJson)}, 'pending');\n`;
});

const sqlFile = path.join(__dirname, '..', 'import_data.sql');
fs.writeFileSync(sqlFile, sqlContent);
console.log(`Successfully generated SQL for ${orders.length} orders to ${sqlFile}`);
const fullSql = fs.readFileSync(sqlFile, 'utf-8');
console.log('--- BEGIN SQL ---');
console.log(fullSql);
console.log('--- END SQL ---');

