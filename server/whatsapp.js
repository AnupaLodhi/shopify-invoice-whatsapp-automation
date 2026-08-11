const fetch = require('node-fetch');

function getWhatsAppConfig() {
  const config = {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    graphVersion: process.env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
    templateName: process.env.WHATSAPP_TEMPLATE_NAME,
    templateLanguage:
      process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US',
  };

  const missing = [];

  if (!config.accessToken) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (!config.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!config.templateName) missing.push('WHATSAPP_TEMPLATE_NAME');

  if (missing.length > 0) {
    throw new Error(
      `Missing WhatsApp environment variables: ${missing.join(', ')}`
    );
  }

  return config;
}

function normalizeWhatsAppNumber(phoneNumber) {
  if (!phoneNumber) {
    throw new Error('Recipient phone number is required');
  }

  const normalized = String(phoneNumber).replace(/\D/g, '');

  if (normalized.length < 8 || normalized.length > 15) {
    throw new Error(
      'Invalid phone number. Use country code without +, spaces or hyphens.'
    );
  }

  return normalized;
}

async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode,
  components = [],
}) {
  const config = getWhatsAppConfig();
  const recipient = normalizeWhatsAppNumber(to);

  const url =
    `https://graph.facebook.com/${config.graphVersion}` +
    `/${config.phoneNumberId}/messages`;

  const template = {
    name: templateName || config.templateName,
    language: {
      code: languageCode || config.templateLanguage,
    },
  };

  if (Array.isArray(components) && components.length > 0) {
    template.components = components;
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'template',
    template,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.error_user_msg ||
      data?.error?.message ||
      `WhatsApp API returned HTTP ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.metaResponse = data;
    throw error;
  }

  return data;
}

module.exports = {
  sendWhatsAppTemplate,
  normalizeWhatsAppNumber,
};
