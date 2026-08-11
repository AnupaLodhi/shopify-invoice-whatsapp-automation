function buildOrdersCsv(orders, options = {}) {
  const rows = Array.isArray(orders) ? orders : [];
  const headers = [
    'Invoice / Order Number',
    'Shopify Order ID',
    'Order Date',
    'Processed At',
    'Customer Name',
    'Email',
    'Phone',
    'Company',
    'GST / Tax ID',
    'Financial Status',
    'Fulfillment Status',
    'Delivery Status',
    'Currency',
    'Payment Methods',
    'Discount Codes',
    'Shipping Methods',
    'Total Quantity',
    'Line Items',
    'SKUs',
    'Vendors',
    'Gross Items Amount',
    'Item Discount',
    'Order Discount',
    'Total Discount',
    'Subtotal After Discount',
    'Shipping Fee',
    'Shipping Discount',
    'Taxable Amount Before Tax',
    'Tax Total',
    'CGST',
    'SGST',
    'IGST',
    'Other Tax',
    'Tax Lines',
    'Taxes Included',
    'Total Invoice Amount',
    'Amount Paid',
    'Amount Outstanding',
    'Cancelled At',
    'Cancel Reason',
    'Tags',
    'Note',
    'Billing Name',
    'Billing Address',
    'Billing City',
    'Billing State',
    'Billing Postal Code',
    'Billing Country',
    'Shipping Name',
    'Shipping Address',
    'Shipping City',
    'Shipping State',
    'Shipping Postal Code',
    'Shipping Country'
  ];

  const csvRows = rows.map(order => buildOrderExportRow(order, options)).map(row =>
    headers.map(header => escapeCsv(row[header])).join(',')
  );

  return [headers.map(escapeCsv).join(','), ...csvRows].join('\r\n');
}

function buildOrderExportRow(order, options = {}) {
  const o = order || {};
  const billing = o.billing_address || {};
  const shipping = o.shipping_address || {};
  const customerName = fullName(o.customer?.first_name, o.customer?.last_name) || billing.name || shipping.name || 'Guest';
  const company = billing.company || shipping.company || o.customer?.default_address?.company || '';
  const lineItems = Array.isArray(o.line_items) ? o.line_items : [];
  const shippingLines = Array.isArray(o.shipping_lines) ? o.shipping_lines : [];
  const taxLines = getTaxLinesForSummary(o);
  const taxBreakdown = summarizeTaxBreakdown(taxLines, moneyNumber(firstMoney(o.current_total_tax, o.total_tax)));
  const grossItems = firstMoney(o.current_total_line_items_price, o.total_line_items_price, sumLineGross(lineItems));
  const itemDiscount = firstMoney(sumLineDiscounts(lineItems));
  const orderDiscount = firstMoney(o.current_total_discounts, o.total_discounts, itemDiscount);
  const totalDiscount = firstMoney(o.current_total_discounts, o.total_discounts, itemDiscount);
  const subtotal = firstMoney(o.current_subtotal_price, o.subtotal_price);
  const shippingFee = firstMoney(
    moneyFromSet(o.total_shipping_price_set),
    sumShippingDiscountedPrice(shippingLines),
    sumShippingPrice(shippingLines)
  );
  const shippingDiscount = firstMoney(sumShippingDiscount(shippingLines));
  const taxTotal = firstMoney(o.current_total_tax, o.total_tax, taxBreakdown.total);
  const totalAmount = firstMoney(o.current_total_price, o.total_price);
  const amountPaid = firstMoney(o.total_received, estimatePaidAmount(o));
  const amountOutstanding = firstMoney(o.current_total_outstanding, o.total_outstanding);
  const taxableBeforeTax = firstMoney(addMoney(subtotal, shippingFee));
  const deliveryStatus = typeof o.invoice_delivery_status === 'string'
    ? o.invoice_delivery_status
    : (typeof options.getDeliveryStatus === 'function' ? options.getDeliveryStatus(o) : '');

  return {
    'Invoice / Order Number': o.name || o.order_number || '',
    'Shopify Order ID': o.id || '',
    'Order Date': formatDateTime(o.created_at),
    'Processed At': formatDateTime(o.processed_at),
    'Customer Name': customerName,
    'Email': o.email || o.customer?.email || '',
    'Phone': o.phone || o.customer?.phone || billing.phone || shipping.phone || '',
    'Company': company,
    'GST / Tax ID': findTaxId(o),
    'Financial Status': o.financial_status || '',
    'Fulfillment Status': o.fulfillment_status || 'unfulfilled',
    'Delivery Status': deliveryStatus,
    'Currency': o.currency || o.presentment_currency || '',
    'Payment Methods': paymentMethods(o),
    'Discount Codes': discountCodes(o),
    'Shipping Methods': shippingLines.map(line => line.title || line.code || line.source || '').filter(Boolean).join(' | '),
    'Total Quantity': lineItems.reduce((sum, li) => sum + number(li.quantity), 0),
    'Line Items': lineItems.map(lineItemSummary).filter(Boolean).join(' | '),
    'SKUs': unique(lineItems.map(li => li.sku)).join(' | '),
    'Vendors': unique(lineItems.map(li => li.vendor)).join(' | '),
    'Gross Items Amount': moneyString(grossItems),
    'Item Discount': moneyString(itemDiscount),
    'Order Discount': moneyString(orderDiscount),
    'Total Discount': moneyString(totalDiscount),
    'Subtotal After Discount': moneyString(subtotal),
    'Shipping Fee': moneyString(shippingFee),
    'Shipping Discount': moneyString(shippingDiscount),
    'Taxable Amount Before Tax': moneyString(taxableBeforeTax),
    'Tax Total': moneyString(taxTotal),
    'CGST': moneyString(taxBreakdown.cgst),
    'SGST': moneyString(taxBreakdown.sgst),
    'IGST': moneyString(taxBreakdown.igst),
    'Other Tax': moneyString(taxBreakdown.other),
    'Tax Lines': summarizeTaxLines(taxLines),
    'Taxes Included': o.taxes_included ? 'Yes' : 'No',
    'Total Invoice Amount': moneyString(totalAmount),
    'Amount Paid': moneyString(amountPaid),
    'Amount Outstanding': moneyString(amountOutstanding),
    'Cancelled At': formatDateTime(o.cancelled_at),
    'Cancel Reason': o.cancel_reason || '',
    'Tags': o.tags || '',
    'Note': o.note || '',
    'Billing Name': billing.name || '',
    'Billing Address': streetAddress(billing),
    'Billing City': billing.city || '',
    'Billing State': billing.province || billing.province_code || '',
    'Billing Postal Code': billing.zip || '',
    'Billing Country': billing.country || billing.country_code || '',
    'Shipping Name': shipping.name || '',
    'Shipping Address': streetAddress(shipping),
    'Shipping City': shipping.city || '',
    'Shipping State': shipping.province || shipping.province_code || '',
    'Shipping Postal Code': shipping.zip || '',
    'Shipping Country': shipping.country || shipping.country_code || ''
  };
}

function escapeCsv(value) {
  const s = String(value ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

function fullName(first, last) {
  return [first, last].filter(Boolean).join(' ').trim();
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function number(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstMoney(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return moneyNumber(value);
  }
  return 0;
}

function moneyNumber(value) {
  return number(value);
}

function moneyString(value) {
  return moneyNumber(value).toFixed(2);
}

function addMoney(...values) {
  return values.reduce((sum, value) => sum + moneyNumber(value), 0);
}

function moneyFromSet(set) {
  return set?.shop_money?.amount ?? set?.presentment_money?.amount ?? null;
}

function sumLineGross(lineItems) {
  return lineItems.reduce((sum, li) => sum + number(li.price) * number(li.quantity), 0);
}

function sumLineDiscounts(lineItems) {
  return lineItems.reduce((sum, li) => {
    const allocations = Array.isArray(li.discount_allocations) ? li.discount_allocations : [];
    const allocated = allocations.reduce((inner, allocation) => inner + number(allocation.amount), 0);
    return sum + (allocated || number(li.total_discount));
  }, 0);
}

function sumShippingPrice(shippingLines) {
  return shippingLines.reduce((sum, line) => sum + number(line.price), 0);
}

function sumShippingDiscountedPrice(shippingLines) {
  if (!shippingLines.length) return null;
  return shippingLines.reduce((sum, line) => sum + number(line.discounted_price ?? line.price), 0);
}

function sumShippingDiscount(shippingLines) {
  return shippingLines.reduce((sum, line) => {
    const before = number(line.price);
    const after = number(line.discounted_price ?? line.price);
    return sum + Math.max(0, before - after);
  }, 0);
}

function getTaxLinesForSummary(order) {
  const orderTaxLines = Array.isArray(order.tax_lines) ? order.tax_lines : [];
  if (orderTaxLines.length) return orderTaxLines;

  const lineTaxLines = (Array.isArray(order.line_items) ? order.line_items : [])
    .flatMap(item => Array.isArray(item.tax_lines) ? item.tax_lines : []);
  const shippingTaxLines = (Array.isArray(order.shipping_lines) ? order.shipping_lines : [])
    .flatMap(line => Array.isArray(line.tax_lines) ? line.tax_lines : []);
  return [...lineTaxLines, ...shippingTaxLines];
}

function summarizeTaxLines(taxLines) {
  return (Array.isArray(taxLines) ? taxLines : [])
    .map(line => {
      const title = line.title || 'Tax';
      const rate = line.rate !== undefined && line.rate !== null ? ` ${(number(line.rate) * 100).toFixed(2)}%` : '';
      return `${title}${rate}: ${moneyString(line.price)}`;
    })
    .join(' | ');
}

function summarizeTaxBreakdown(taxLines, fallbackTotal = 0) {
  const result = { cgst: 0, sgst: 0, igst: 0, other: 0, total: 0 };
  const lines = Array.isArray(taxLines) ? taxLines : [];

  for (const line of lines) {
    const title = String(line.title || '').toLowerCase();
    const amount = number(line.price);
    result.total += amount;
    if (title.includes('cgst')) result.cgst += amount;
    else if (title.includes('sgst')) result.sgst += amount;
    else if (title.includes('igst')) result.igst += amount;
    else result.other += amount;
  }

  if (!result.total && fallbackTotal) {
    result.total = fallbackTotal;
    result.other = fallbackTotal;
  }

  return result;
}

function paymentMethods(order) {
  const methods = Array.isArray(order.payment_gateway_names) && order.payment_gateway_names.length
    ? order.payment_gateway_names
    : [order.payment_gateway].filter(Boolean);
  return methods.map(method => String(method).replace(/_/g, ' ')).join(' | ');
}

function discountCodes(order) {
  const codes = Array.isArray(order.discount_codes) ? order.discount_codes : [];
  const fromCodes = codes.map(code => {
    const amount = code.amount ? ` (${moneyString(code.amount)})` : '';
    return `${code.code || code.type || 'Discount'}${amount}`;
  });
  const applications = Array.isArray(order.discount_applications) ? order.discount_applications : [];
  const fromApplications = applications.map(app => app.code || app.title || app.description).filter(Boolean);
  return unique([...fromCodes, ...fromApplications]).join(' | ');
}

function lineItemSummary(li) {
  if (!li) return '';
  const sku = li.sku ? ` [SKU: ${li.sku}]` : '';
  const variant = li.variant_title ? ` - ${li.variant_title}` : '';
  const qty = number(li.quantity);
  const price = moneyString(li.price);
  const discount = number(li.total_discount) ? ` discount ${moneyString(li.total_discount)}` : '';
  const tax = Array.isArray(li.tax_lines) && li.tax_lines.length ? ` tax ${summarizeTaxLines(li.tax_lines)}` : '';
  return `${li.title || li.name || 'Item'}${variant}${sku} x${qty} @ ${price}${discount}${tax}`;
}

function unique(values) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function streetAddress(address) {
  return [address.address1, address.address2].filter(Boolean).join(', ');
}

function findTaxId(order) {
  const candidates = [];
  const noteAttributes = Array.isArray(order.note_attributes) ? order.note_attributes : [];
  for (const attr of noteAttributes) {
    const key = String(attr.name || attr.key || '').toLowerCase();
    if (/(gst|gstin|tax|vat|tin|pan)/.test(key)) candidates.push(attr.value);
  }
  const customer = order.customer || {};
  if (customer.tax_exemptions?.length) candidates.push(customer.tax_exemptions.join(' | '));
  if (order.billing_address?.company) candidates.push(order.billing_address.company);
  return unique(candidates)[0] || '';
}

function estimatePaidAmount(order) {
  const total = firstMoney(order.current_total_price, order.total_price);
  const outstanding = firstMoney(order.current_total_outstanding, order.total_outstanding);
  return Math.max(0, total - outstanding);
}

module.exports = {
  buildOrdersCsv,
  buildOrderExportRow,
};
