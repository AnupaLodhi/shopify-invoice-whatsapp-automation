const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(
  __dirname,
  '../data/whatsapp-messages.json'
);

const MAX_MESSAGES = 10000;

function ensureStore() {
  fs.mkdirSync(path.dirname(STORE_PATH), {
    recursive: true,
    mode: 0o700,
  });

  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, '[]\n', {
      encoding: 'utf8',
      mode: 0o600,
    });
  }
}

function loadMessages() {
  try {
    ensureStore();

    const parsed = JSON.parse(
      fs.readFileSync(STORE_PATH, 'utf8')
    );

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(
      'Failed to load WhatsApp messages:',
      error.message
    );

    return [];
  }
}

function saveMessages(messages) {
  ensureStore();

  const temporaryPath = `${STORE_PATH}.tmp`;

  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(
      messages.slice(-MAX_MESSAGES),
      null,
      2
    ),
    {
      encoding: 'utf8',
      mode: 0o600,
    }
  );

  fs.renameSync(temporaryPath, STORE_PATH);
  fs.chmodSync(STORE_PATH, 0o600);
}

function createId() {
  return (
    `local-${Date.now()}-` +
    Math.random().toString(36).slice(2, 10)
  );
}

function saveWhatsAppMessage({
  id,
  phone,
  customerName = '',
  direction,
  type = 'text',
  text = '',
  status = '',
  orderNumber = '',
  messageId = '',
  metadata = {},
  createdAt,
}) {
  if (!phone || !direction) {
    return null;
  }

  const messages = loadMessages();

  const record = {
    id: id || createId(),
    phone: String(phone),
    customerName: String(customerName),
    direction: String(direction),
    type: String(type),
    text: String(text),
    status: String(status),
    orderNumber: String(orderNumber),
    messageId: String(messageId),
    metadata:
      metadata && typeof metadata === 'object'
        ? metadata
        : {},
    createdAt:
      createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  messages.push(record);
  saveMessages(messages);

  return record;
}

function updateWhatsAppMessageStatus({
  messageId,
  status,
  errorCode,
  errorMessage,
}) {
  if (!messageId) {
    return null;
  }

  const messages = loadMessages();

  const record = [...messages]
    .reverse()
    .find(item => item.messageId === messageId);

  if (!record) {
    return null;
  }

  record.status = String(status || record.status || '');
  record.updatedAt = new Date().toISOString();
  record.metadata = {
    ...(record.metadata || {}),
    ...(errorCode ? { errorCode } : {}),
    ...(errorMessage ? { errorMessage } : {}),
  };

  saveMessages(messages);

  return record;
}

function getConversations() {
  const messages = loadMessages();
  const conversations = new Map();

  for (const message of messages) {
    const existing =
      conversations.get(message.phone) || {
        phone: message.phone,
        customerName: '',
        lastMessage: '',
        lastDirection: '',
        lastStatus: '',
        lastMessageAt: '',
        unreadCount: 0,
        messageCount: 0,
      };

    existing.messageCount += 1;

    if (message.customerName) {
      existing.customerName = message.customerName;
    }

    const currentTime =
      Date.parse(message.createdAt || '') || 0;

    const previousTime =
      Date.parse(existing.lastMessageAt || '') || 0;

    if (currentTime >= previousTime) {
      existing.lastMessage =
        message.text || message.type;

      existing.lastDirection =
        message.direction;

      existing.lastStatus =
        message.status;

      existing.lastMessageAt =
        message.createdAt;
    }

    if (
      message.direction === 'incoming' &&
      message.status !== 'read_by_team'
    ) {
      existing.unreadCount += 1;
    }

    conversations.set(message.phone, existing);
  }

  return [...conversations.values()].sort(
    (a, b) =>
      (Date.parse(b.lastMessageAt || '') || 0) -
      (Date.parse(a.lastMessageAt || '') || 0)
  );
}

function getConversationMessages(phone) {
  return loadMessages()
    .filter(
      message =>
        message.phone === String(phone)
    )
    .sort(
      (a, b) =>
        (Date.parse(a.createdAt || '') || 0) -
        (Date.parse(b.createdAt || '') || 0)
    );
}

module.exports = {
  loadMessages,
  saveWhatsAppMessage,
  updateWhatsAppMessageStatus,
  getConversations,
  getConversationMessages,
};
