const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrdersCsv, buildOrderExportRow } = require('../server/order-export');

test('invoice export includes shipping discount tax and total columns', () => {
  const order = {
    id: 101,
    name: '#1001',
    created_at: '2026-07-20T10:00:00+05:30',
    currency: 'INR',
    financial_status: 'paid',
    fulfillment_status: 'fulfilled',
    current_total_line_items_price: '1000.00',
    current_total_discounts: '100.00',
    current_subtotal_price: '900.00',
    total_shipping_price_set: { shop_money: { amount: '50.00', currency_code: 'INR' } },
    current_total_tax: '171.00',
    current_total_price: '1121.00',
    current_total_outstanding: '0.00',
    payment_gateway_names: ['razorpay'],
    customer: { first_name: 'Sita', last_name: 'Rao', email: 'sita@example.com', phone: '0000000000' },
    billing_address: { company: 'Sita Exports', address1: 'A-1 Market', city: 'Surat', province: 'Gujarat', zip: '395001', country: 'India' },
    shipping_address: { name: 'Sita Rao', address1: 'A-1 Market', city: 'Surat', province: 'Gujarat', zip: '395001', country: 'India' },
    shipping_lines: [{ title: 'Standard Shipping', price: '70.00', discounted_price: '50.00' }],
    discount_codes: [{ code: 'SAVE100', amount: '100.00' }],
    tax_lines: [
      { title: 'CGST', rate: 0.09, price: '85.50' },
      { title: 'SGST', rate: 0.09, price: '85.50' },
    ],
    line_items: [
      { title: 'Bracelet', variant_title: 'Gold', sku: 'BR-GLD', vendor: 'Demo Vendor', quantity: 2, price: '500.00', total_discount: '100.00' },
    ],
    invoice_delivery_status: 'tracking_added',
  };

  const row = buildOrderExportRow(order);
  assert.equal(row['Invoice / Order Number'], '#1001');
  assert.equal(row['Gross Items Amount'], '1000.00');
  assert.equal(row['Total Discount'], '100.00');
  assert.equal(row['Subtotal After Discount'], '900.00');
  assert.equal(row['Shipping Fee'], '50.00');
  assert.equal(row['Shipping Discount'], '20.00');
  assert.equal(row['Taxable Amount Before Tax'], '950.00');
  assert.equal(row['Tax Total'], '171.00');
  assert.equal(row['CGST'], '85.50');
  assert.equal(row['SGST'], '85.50');
  assert.equal(row['Total Invoice Amount'], '1121.00');
  assert.equal(row['Payment Methods'], 'razorpay');
  assert.match(row['Line Items'], /Bracelet - Gold/);

  const csv = buildOrdersCsv([order]);
  assert.match(csv, /"Shipping Fee"/);
  assert.match(csv, /"Tax Total"/);
  assert.match(csv, /"CGST"/);
  assert.match(csv, /"SAVE100 \(100.00\)"/);
});

test('invoice export falls back to line item and shipping tax lines', () => {
  const order = {
    name: '#1002',
    subtotal_price: '200.00',
    total_price: '236.00',
    total_tax: '36.00',
    line_items: [
      { title: 'Ring', quantity: 1, price: '200.00', tax_lines: [{ title: 'IGST', rate: 0.18, price: '36.00' }] },
    ],
    shipping_lines: [],
  };

  const row = buildOrderExportRow(order);
  assert.equal(row['IGST'], '36.00');
  assert.equal(row['Other Tax'], '0.00');
  assert.match(row['Tax Lines'], /IGST 18.00%: 36.00/);
});
