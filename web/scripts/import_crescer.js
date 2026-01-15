import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project: Crescer Uniformes (numwdvzljjgxueobajpc)
const SUPABASE_URL = 'https://numwdvzljjgxueobajpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51bXdkdnpsampneHVlb2JhanBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTY0MTUsImV4cCI6MjA4MzM3MjQxNX0.ItpLTdDY6hjDNIj1HYnIyX2xqTofgKIJsXBbdjpQ9l0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const inputFile = path.join(__dirname, '..', '..', 'parsed_orders.json');
const orders = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

async function importOrders() {
    console.log(`Starting import of ${orders.length} orders to Crescer Uniformes...`);
    
    // Check if data already exists to avoid duplicates? 
    // For now we assume fresh staging table or user clears it.
    
    const chunkSize = 20;
    for (let i = 0; i < orders.length; i += chunkSize) {
        const chunk = orders.slice(i, i + chunkSize);
        
        const payload = chunk.map(o => ({
            customer_name: o.customer,
            phone: o.phone,
            school: o.school,
            payment_status: o.payment_status,
            original_text: o.raw_lines.join('\n'),
            parsed_items: o.parsed_items,
            status: 'pending'
        }));

        const { error } = await supabase.from('imported_orders').insert(payload);

        if (error) {
            console.error('Error importing chunk:', error);
        } else {
            console.log(`Imported batch ${i} - ${i + chunk.length}`);
        }
    }
    console.log('Import finished.');
}

importOrders();
