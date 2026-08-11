const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(
  __dirname,
  '../data/invoice-send-status.json'
);

function loadStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return {};
    }

    const content = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(content);

    return parsed && typeof parsed === 'object'
      ? parsed
      : {};
  } catch (error) {
    console.error(
      'Failed to load invoice send store:',
      error.message
    );

    return {};
  }
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(STORE_PATH), {
    recursive: true,
    mode: 0o700,
  });

  fs.writeFileSync(
    STORE_PATH,
    JSON.stringify(store, null, 2),
    {
      encoding: 'utf8',
      mode: 0o600,
    }
  );

  fs.chmodSync(STORE_PATH, 0o600);
}

function getOrderKey(order) {
  if (!order) {
    return '';
  }

  return String(
    order.id ||
    order.admin_graphql_api_id ||
    order.name ||
    order.order_number ||
    ''
  );
}

function getInvoiceSendRecord(order) {
  const key = getOrderKey(order);

  if (!key) {
    return null;
  }

  const store = loadStore();
  return store[key] || null;
}

function hasInvoiceBeenSent(order) {
  const record = getInvoiceSendRecord(order);

  return Boolean(
    record &&
    ['accepted', 'sent', 'delivered', 'read'].includes(
      record.status
    )
  );
}

function markInvoiceAccepted({
  order,
  orderNumber,
  recipient,
  messageId,
  source,
}) {
  const key = getOrderKey(order);

  if (!key) {
    throw new Error(
      'Cannot save invoice status without an order identifier'
    );
  }

  const store = loadStore();

  store[key] = {
    orderId: order.id || null,
    orderNumber:
      orderNumber ||
      order.name ||
      order.order_number ||
      '',
    recipient: String(recipient || ''),
    messageId: String(messageId || ''),
    source: String(source || ''),
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveStore(store);

  return store[key];
}

function updateInvoiceMessageStatus({
  messageId,
  status,
  recipient,
  errorCode,
  errorMessage,
}) {
  if (!messageId) {
    return null;
  }

  const store = loadStore();

  const entry = Object.entries(store).find(
    ([, record]) => record.messageId === messageId
  );

  if (!entry) {
    return null;
  }

  const [key, record] = entry;

  store[key] = {
    ...record,
    status: status || record.status,
    recipient:
      recipient ||
      record.recipient ||
      '',
    errorCode:
      errorCode ||
      record.errorCode ||
      null,
    errorMessage:
      errorMessage ||
      record.errorMessage ||
      '',
    updatedAt: new Date().toISOString(),
  };

  saveStore(store);

  return store[key];
}

module.exports = {
  loadStore,
  getOrderKey,
  getInvoiceSendRecord,
  hasInvoiceBeenSent,
  markInvoiceAccepted,
  updateInvoiceMessageStatus,
};
