# Shopify Invoice & WhatsApp Automation

A Node.js automation project for connecting Shopify order workflows with invoice generation, PDF creation, order exports, delivery-status tracking, and WhatsApp messaging.

## Overview

This project demonstrates an e-commerce automation workflow designed to reduce manual work after a Shopify order is received.

The automation components include:

- Shopify order data processing
- Invoice HTML generation
- PDF invoice generation
- Order CSV export
- WhatsApp messaging
- Delivery-status tracking
- Invoice delivery tracking
- WhatsApp message history storage

This repository is a sanitized public/portfolio version. Production credentials, customer information, private business configuration, and deployment-specific files are intentionally excluded.

## Workflow

    Shopify Order
         |
         v
    Order Data Processing
         |
         +------------------+
         |                  |
         v                  v
    Invoice Generation   Order Export
         |
         v
    PDF Generation
         |
         v
    WhatsApp Notification
         |
         v
    Delivery Status Tracking

## Project Structure

    .
    ├── server/
    │   ├── delivery-status.js
    │   ├── invoice-send-store.js
    │   ├── invoice.js
    │   ├── order-export.js
    │   ├── pdf.js
    │   ├── whatsapp-message-store.js
    │   └── whatsapp.js
    ├── test/
    │   ├── delivery-status.test.js
    │   └── order-export.test.js
    ├── .env.example
    ├── .gitignore
    ├── package.json
    └── README.md

## Main Components

### Invoice Generation

`server/invoice.js` generates invoice HTML from Shopify-style order data.

### PDF Generation

`server/pdf.js` uses Puppeteer to convert invoice HTML into PDF documents.

### WhatsApp Integration

`server/whatsapp.js` provides WhatsApp messaging functionality through the Meta Graph API.

Credentials are supplied through environment variables and are not hard-coded into the source code.

### Delivery Status

`server/delivery-status.js` handles delivery-status information for WhatsApp messages.

### Invoice Send Store

`server/invoice-send-store.js` provides storage functionality for invoice delivery records.

### WhatsApp Message Store

`server/whatsapp-message-store.js` provides local message-history storage functionality.

### Order Export

`server/order-export.js` processes Shopify order information into CSV-compatible export data.

## Configuration

The repository includes `.env.example` containing placeholder configuration values.

No real credentials are included in this public repository.

Example:

    WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
    WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
    WHATSAPP_GRAPH_API_VERSION=v25.0
    WHATSAPP_TEMPLATE_NAME=your_template_name
    WHATSAPP_TEMPLATE_LANGUAGE=en_US

Never commit real credentials to Git.

## Testing

Install dependencies and run the test suite:

    npm install
    npm test

## Security

The public repository intentionally excludes:

- API access tokens
- Shopify credentials
- WhatsApp credentials
- Webhook verification tokens
- Customer information
- Production environment files
- Private deployment configuration
- Internal backup files

Environment files are excluded through `.gitignore`.

## Portfolio Note

This repository contains a sanitized subset of an automation project developed for a real-world e-commerce workflow.

The public version focuses on reusable engineering components and does not expose production credentials, customer data, or private business configuration.

## Technologies

- Node.js
- JavaScript
- Shopify
- Meta Graph API / WhatsApp
- Puppeteer
- CSV processing
- Node.js Test Runner
