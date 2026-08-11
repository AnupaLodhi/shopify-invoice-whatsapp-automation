function formatMoney(amount, symbol) {
  const n = parseFloat(amount || 0);
  return symbol + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso, fmt) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  const HH = String(d.getHours()).padStart(2,'0');
  const MM2 = String(d.getMinutes()).padStart(2,'0');
  const SS = String(d.getSeconds()).padStart(2,'0');
  if (fmt === 'long') return d.toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
  if (fmt === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
  if (fmt === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd} ${HH}:${MM2}:${SS}`;
  return `${dd}/${mm}/${yyyy}`;
}

function addrLines(a) {
  if (!a) return [];
  return [a.name, a.company,
    a.address1, a.address2,
    [a.city && a.province ? `${a.city}, ${a.province}` : (a.city || a.province), a.zip].filter(Boolean).join(', '),
    a.country
  ].filter(Boolean);
}

function generateInvoiceHTML(order, settings = {}, fullPage = false) {
  const {
    storeName         = 'My Store',
    storeCompany      = '',
    storeAddress      = '',
    storePhone        = '',
    storeEmail        = '',
    storePostalCode   = '',
    storeCountry      = '',
    taxNumber         = '',
    footerNote        = 'Thank you for your purchase!',
    accentColor       = '#111111',
    currencySymbol    = null,
    dateFormat        = 'YYYY-MM-DD',
    showSKU           = true,
    showTaxBreakdown  = true,
    invoicePrefix     = 'INV',
    logoUrl           = '',
    logo2Url          = '',
    storeWebsite      = '',
    showQRCode        = true,
    showProductImages = true,
  } = settings;

  const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    CAD: 'C$',
    AUD: 'A$',
    NZD: 'NZ$',
    SGD: 'S$',
    JPY: '¥',
    CNY: '¥',
    KRW: '₩',
    AED: 'د.إ'
  };

  const resolvedCurrencySymbol =
    currencySymbol ||
    currencySymbols[String(order.currency || '').toUpperCase()] ||
    `${order.currency || ''} `;


  const invNum    = `${invoicePrefix}-${(order.name||'').replace('#','')}`;
  const rawDate   = order.created_at ? new Date(order.created_at) : new Date();
  const dateStr   = formatDate(order.created_at, dateFormat);
  const custEmail = order.customer?.email || '';
  const custPhone = order.customer?.phone || order.shipping_address?.phone || '';

  // ── Total amount ──
  const subtotal  = parseFloat(order.subtotal_price || 0);
  const tax       = parseFloat(order.total_tax || 0);
  const discount  = parseFloat(order.total_discounts || 0);
  const total     = parseFloat(order.total_price || 0);
  const shipping  = order.shipping_lines?.[0] ? parseFloat(order.shipping_lines[0].price || 0) : 0;
  const paid      = order.financial_status === 'paid' ? total : 0;

  // ── Payment method ──
  const paymentMethod = order.payment_gateway
    ? order.payment_gateway.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'N/A';

  // ── Logo block — two logos side by side like Vify ──
  let logoBlock = '';
  if (logoUrl && logo2Url) {
    logoBlock = `<div style="text-align:center;margin-bottom:18px">
      <img src="${logoUrl}"  alt="logo"  style="max-height:90px;max-width:170px;object-fit:contain;vertical-align:middle;margin:0 6px">
      <img src="${logo2Url}" alt="logo2" style="max-height:90px;max-width:170px;object-fit:contain;vertical-align:middle;margin:0 6px">
    </div>`;
  } else if (logoUrl) {
    logoBlock = `<div style="text-align:center;margin-bottom:18px">
      <img src="${logoUrl}" alt="logo" style="max-height:100px;max-width:280px;object-fit:contain">
    </div>`;
  }

  // ── Line items ──
  const lineRows = (order.line_items || []).map(li => {
    const imgSrc   = li.image?.src || '';
    const imgCell  = showProductImages && imgSrc
      ? `<img class="invoice-product-img" src="${imgSrc}" width="68" height="68" style="border-radius:4px;object-fit:cover;display:block;border:1px solid #eee">`
      : `<div style="width:68px;height:68px;background:#f5f5f5;border-radius:4px;border:1px solid #eee"></div>`;
    const lineTotal = parseFloat(li.price||0) * li.quantity;
    const lineTax   = li.tax_lines?.reduce((s,t)=>s+parseFloat(t.price||0),0)||0;
    const taxLabel  = li.tax_lines?.map(t=>`${t.title}: ${(t.rate*100).toFixed(0)}%`).join(', ') || '—';
    const lineDis   = parseFloat(li.total_discount||0);
    const variant   = li.variant_title && li.variant_title !== 'Default Title'
      ? `<div style="font-size:11px;color:#777;margin-top:2px">Variant: ${li.variant_title}</div>` : '';
    const sku = showSKU && li.sku
      ? `<div style="font-size:10px;color:#bbb;font-family:monospace;margin-top:2px">SKU: ${li.sku}</div>` : '';
    return `<tr class="invoice-item-row" style="border-bottom:1px solid #eee">
      <td style="padding:12px 10px 12px 14px;vertical-align:middle;width:82px">${imgCell}</td>
      <td style="padding:12px 14px;vertical-align:top">
        <div style="font-weight:600;font-size:13px">${li.title}</div>${variant}${sku}
      </td>
      <td style="padding:12px 14px;text-align:center;font-size:13px">${li.quantity}</td>
      <td style="padding:12px 14px;text-align:right;font-size:13px">${formatMoney(li.price, resolvedCurrencySymbol)}</td>
      <td style="padding:12px 14px;text-align:right;font-size:13px;color:#555">${formatMoney(lineDis, resolvedCurrencySymbol)}</td>
      <td style="padding:12px 14px;text-align:center;font-size:13px;color:#555">${taxLabel}</td>
      <td style="padding:12px 14px;text-align:right;font-size:13px;color:#555">${formatMoney(lineTax, resolvedCurrencySymbol)}</td>
      <td style="padding:12px 14px;text-align:right;font-size:13px;font-weight:700">${formatMoney(lineTotal, resolvedCurrencySymbol)}</td>
    </tr>`;
  }).join('');

  // ── Tax rows for totals box ──
  const taxRows = showTaxBreakdown && order.tax_lines?.length
    ? order.tax_lines.map(t => `
      <tr>
        <td style="padding:8px 16px;font-size:13px;color:#555">
          Tax (Included)
          <span style="margin-left:8px;color:#888;font-size:12px">${t.title}: ${(t.rate*100).toFixed(0)}%</span>
        </td>
        <td style="padding:8px 16px;text-align:right;font-size:13px">${formatMoney(t.price, resolvedCurrencySymbol)}</td>
      </tr>`).join('')
    : `<tr>
        <td style="padding:8px 16px;font-size:13px;color:#555">Tax</td>
        <td style="padding:8px 16px;text-align:right;font-size:13px">${formatMoney(tax, resolvedCurrencySymbol)}</td>
      </tr>`;

  const discountRow = discount > 0 ? `
    <tr>
      <td style="padding:8px 16px;font-size:13px;color:#c0392b">Discount</td>
      <td style="padding:8px 16px;text-align:right;font-size:13px;color:#c0392b">-${formatMoney(discount, resolvedCurrencySymbol)}</td>
    </tr>` : '';

  // ── Shipping address lines ──
  const shipLines = addrLines(order.shipping_address);
  const shipAddrStr = shipLines.join(', ');

  // ── Bill address lines ──
  const billLines = addrLines(order.billing_address);

  // ── Store address block — bold labels exactly like Vify ──
  // Build the full address string including country on one line
  const fullStoreAddress = [
    storeAddress.replace(/\n/g,', '),
    storeCountry
  ].filter(Boolean).join(', ');

  const storeAddrBlock = [
    storeCompany    ? `<div style="font-size:13px;line-height:1.9"><strong>Company:</strong> ${storeCompany}</div>` : '',
    storePhone      ? `<div style="font-size:13px;line-height:1.9"><strong>Phone:</strong> ${storePhone}</div>` : '',
    storeEmail      ? `<div style="font-size:13px;line-height:1.9"><strong>Email:</strong> ${storeEmail}</div>` : '',
    fullStoreAddress? `<div style="font-size:13px;line-height:1.9"><strong>Address:</strong> ${fullStoreAddress}</div>` : '',
    storePostalCode ? `<div style="font-size:13px;line-height:1.9"><strong>Postal code:</strong> ${storePostalCode}</div>` : '',
    taxNumber       ? `<div style="font-size:13px;line-height:1.9"><strong>Tax Number:</strong> ${taxNumber}</div>` : '',
  ].filter(Boolean).join('');

  // ── QR code ──
  const qrTarget = storeWebsite || `https://shopify.com`;
  const qrHTML = showQRCode ? `
    <div style="text-align:center;margin-top:24px;padding-top:20px">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrTarget)}"
        width="100" height="100" alt="QR Code" style="display:block;margin:0 auto 6px">
      <div style="font-size:12px;color:#888">${storeWebsite}</div>
    </div>` : '';

  // ─────────────────────────────────────────────────────────
  // INVOICE BODY — matches Vify layout exactly
  // ─────────────────────────────────────────────────────────
  const invoicePrintStyles = `
<style>
.invoice-shell{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;max-width:820px;margin:0 auto;padding:40px 44px;background:#fff}
.invoice-items-table{width:100%;border-collapse:collapse;margin-bottom:20px;page-break-inside:auto;break-inside:auto}
.invoice-items-table thead{display:table-header-group}
.invoice-items-table tbody{display:table-row-group}
.invoice-item-row{page-break-inside:avoid;break-inside:avoid}
.invoice-totals-wrap,.invoice-note,.invoice-footer{page-break-inside:avoid;break-inside:avoid}
@media print{
  html,body{height:auto!important;overflow:visible!important}
  .page,.pg,.invoice-page{overflow:visible!important}
  .invoice-shell{max-width:none!important;width:100%!important;margin:0!important;padding:0!important;overflow:visible!important}
  .invoice-header-grid,.invoice-address-grid{page-break-inside:avoid;break-inside:avoid}
  .invoice-items-table{page-break-inside:auto!important;break-inside:auto!important}
  .invoice-items-table thead{display:table-header-group!important}
  .invoice-items-table tr{page-break-inside:avoid!important;break-inside:avoid!important}
  .invoice-items-table th{padding:8px 9px!important;font-size:11px!important}
  .invoice-items-table td{padding:8px 9px!important;font-size:12px!important}
  .invoice-product-img{width:62px!important;height:62px!important;object-fit:cover!important}
  .invoice-totals-wrap{page-break-inside:avoid!important;break-inside:avoid!important;margin-top:10px!important}
  .invoice-note,.invoice-footer{page-break-inside:avoid!important;break-inside:avoid!important}
}
</style>`;

  const body = `
${invoicePrintStyles}
<div class="invoice-shell" style="font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;max-width:820px;margin:0 auto;padding:40px 44px;background:#fff">

  <!-- DUAL LOGO (centered) -->
  ${logoBlock}

  <!-- ROW 1: Store info left | INVOICE title right -->
  <div class="invoice-header-grid" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">

    <!-- LEFT: Store details -->
    <div style="flex:1;padding-right:32px">
      <div style="font-size:22px;font-weight:800;margin-bottom:6px">${storeName}</div>
      <div style="font-size:13px;color:#333;line-height:2">${storeAddrBlock}</div>
    </div>

    <!-- RIGHT: INVOICE heading + number/date/amount badges -->
    <div style="text-align:right;min-width:240px">
      <div style="font-size:42px;font-weight:900;letter-spacing:2px;color:#111;line-height:1;margin-bottom:12px">INVOICE</div>
      <!-- Invoice # and date on same row -->
      <div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:8px">
        <div style="background:#333;color:#fff;font-size:12px;font-weight:600;padding:5px 12px;border-radius:4px">${invNum}</div>
        <div style="background:#333;color:#fff;font-size:12px;font-weight:600;padding:5px 12px;border-radius:4px">${dateStr}</div>
      </div>
      <!-- Total amount box -->
      <div style="display:inline-block;border:2px solid #1a1a1a;border-radius:6px;padding:8px 20px">
        <div style="font-size:22px;font-weight:800;color:#1a1a1a">${formatMoney(total, resolvedCurrencySymbol)}</div>
      </div>
    </div>
  </div>

  <!-- ROW 2: Shipping Address left | Payment Information right -->
  <div class="invoice-address-grid" style="display:flex;gap:40px;margin-bottom:28px">

    <!-- SHIPPING ADDRESS -->
    <div style="flex:1">
      <div style="font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Shipping Address</div>
      <div style="font-size:13px;line-height:1.9;color:#333">
        ${shipLines.map((l,i) => {
          if (i===0) return `<div><strong>Name:</strong> ${l}</div>`;
          return `<div>${l}</div>`;
        }).join('')}
        ${custPhone ? `<div><strong>Phone:</strong> ${custPhone}</div>` : ''}
        ${custEmail ? `<div><strong>Email:</strong> ${custEmail}</div>` : ''}
        ${order.shipping_address ? `<div><strong>Address:</strong> ${[order.shipping_address.address1, order.shipping_address.address2, order.shipping_address.city, order.shipping_address.province, order.shipping_address.zip, order.shipping_address.country].filter(Boolean).join(', ')}</div>` : ''}
      </div>
    </div>

    <!-- PAYMENT INFORMATION -->
    <div style="flex:1">
      <div style="font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;text-align:right">Payment Information</div>
      <div style="font-size:13px;line-height:1.9;color:#333;text-align:right">
        ${billLines.map((l,i) => {
          if (i===0) return `<div><strong>Name:</strong> ${l}</div>`;
          return `<div>${l}</div>`;
        }).join('')}
        ${order.billing_address ? `<div><strong>Address:</strong> ${[order.billing_address.address1, order.billing_address.address2, order.billing_address.city, order.billing_address.province, order.billing_address.zip, order.billing_address.country].filter(Boolean).join(', ')}</div>` : ''}
        <div style="margin-top:8px">
          <span style="background:#1a1a1a;color:#fff;font-size:12px;font-weight:600;padding:5px 14px;border-radius:4px;display:inline-block">${paymentMethod}</span>
        </div>
      </div>
    </div>

  </div>

  <!-- LINE ITEMS TABLE — black header like Vify -->
  <table class="invoice-items-table" style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <thead>
      <tr style="background:#1a1a1a;color:#fff">
        <th style="padding:11px 10px 11px 14px;width:66px"></th>
        <th style="padding:11px 14px;text-align:left;font-size:12px;font-weight:700;letter-spacing:0.5px">Items</th>
        <th style="padding:11px 14px;text-align:center;font-size:12px;font-weight:700;letter-spacing:0.5px;width:7%">Qty</th>
        <th style="padding:11px 14px;text-align:right;font-size:12px;font-weight:700;letter-spacing:0.5px;width:11%">Price</th>
        <th style="padding:11px 14px;text-align:right;font-size:12px;font-weight:700;letter-spacing:0.5px;width:11%">Discount</th>
        <th style="padding:11px 14px;text-align:center;font-size:12px;font-weight:700;letter-spacing:0.5px;width:11%">Tax</th>
        <th style="padding:11px 14px;text-align:right;font-size:12px;font-weight:700;letter-spacing:0.5px;width:11%">Tax Amount</th>
        <th style="padding:11px 14px;text-align:right;font-size:12px;font-weight:700;letter-spacing:0.5px;width:11%">Subtotal</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>

  <!-- TOTALS — bordered box bottom right, like Vify -->
  <div class="invoice-totals-wrap" style="display:flex;justify-content:flex-end;margin-bottom:28px">
    <div style="width:320px;border:1px solid #ddd;border-radius:4px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <tr style="border-bottom:1px solid #eee">
          <td style="padding:8px 16px;font-size:13px;color:#555">Subtotal</td>
          <td style="padding:8px 16px;text-align:right;font-size:13px">${formatMoney(subtotal, resolvedCurrencySymbol)}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee">
          <td style="padding:8px 16px;font-size:13px;color:#555">Shipping</td>
          <td style="padding:8px 16px;text-align:right;font-size:13px">${formatMoney(shipping, resolvedCurrencySymbol)}</td>
        </tr>
        ${discountRow}
        ${taxRows}
        <tr style="border-bottom:1px solid #eee;font-weight:700;font-size:14px">
          <td style="padding:10px 16px">Grand total</td>
          <td style="padding:10px 16px;text-align:right">${formatMoney(total, resolvedCurrencySymbol)}</td>
        </tr>
        <tr>
          <td style="padding:8px 16px;font-size:13px;color:#555">Paid by customer</td>
          <td style="padding:8px 16px;text-align:right;font-size:13px">${formatMoney(paid, resolvedCurrencySymbol)}</td>
        </tr>
      </table>
    </div>
  </div>

  ${order.note ? `<div class="invoice-note" style="margin-bottom:20px;padding:10px 14px;background:#fffbf0;border-left:3px solid #ccc;border-radius:0 6px 6px 0;font-size:13px;color:#555;line-height:1.6"><strong>Note:</strong> ${order.note}</div>` : ''}

  <!-- FOOTER: thank you centered, QR below -->
  <div class="invoice-footer" style="text-align:center;padding-top:20px;border-top:1px solid #eee">
    <div style="font-size:14px;color:#555;margin-bottom:4px">${footerNote}</div>
    ${storeWebsite ? `<div style="font-size:13px;color:#888;margin-bottom:4px">${storeWebsite}</div>` : ''}
    ${qrHTML}
  </div>

</div>`;

  if (!fullPage) return body;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice ${order.name} — ${storeName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#e0e0e0}
.toolbar{background:#1a1a1a;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10}
.toolbar span{color:#fff;font-family:'Segoe UI',sans-serif;font-size:14px;font-weight:600}
.toolbar button{background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:8px 22px;border-radius:5px;font-size:14px;cursor:pointer;font-family:'Segoe UI',sans-serif;font-weight:600}
.toolbar button:hover{background:rgba(255,255,255,0.25)}
.page{max-width:840px;margin:24px auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.12);border-radius:8px;overflow:hidden}
@media print{
  .toolbar{display:none!important}
  body{background:#fff}
  .page{margin:0;box-shadow:none;border-radius:0}
  @page{size:A4;margin:10mm}
}
</style>
</head>
<body>
<div class="toolbar">
  <span>🧾 Invoice ${order.name} — ${storeName}</span>
  <button onclick="window.print()">🖨 Print / Save as PDF</button>
</div>
<div class="page">${body}</div>
</body>
</html>`;
}

module.exports = { generateInvoiceHTML };

