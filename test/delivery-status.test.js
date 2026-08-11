const test = require('node:test');
const assert = require('node:assert/strict');
const { getDeliveryStatus } = require('../server/delivery-status');

test('fulfilled with tracking is tracking added, not delivered', () => {
  const order = {
    fulfillment_status: 'fulfilled',
    fulfillments: [{
      status: 'success',
      shipment_status: null,
      tracking_number: 'TRACK-123',
      updated_at: '2026-06-25T11:20:00+05:30',
    }],
  };

  assert.equal(getDeliveryStatus(order), 'tracking_added');
});

test('fulfilled without carrier delivery data is not marked delivered', () => {
  const order = {
    fulfillment_status: 'fulfilled',
    fulfillments: [{
      status: 'success',
      shipment_status: null,
      updated_at: '2026-06-25T11:20:00+05:30',
    }],
  };

  assert.equal(getDeliveryStatus(order), '');
});

test('carrier delivered status remains delivered', () => {
  const order = {
    fulfillment_status: 'fulfilled',
    fulfillments: [{
      status: 'success',
      shipment_status: 'delivered',
      tracking_number: 'TRACK-123',
      updated_at: '2026-06-25T15:00:00+05:30',
    }],
  };

  assert.equal(getDeliveryStatus(order), 'delivered');
});

test('most recently updated active fulfillment determines delivery status', () => {
  const order = {
    fulfillment_status: 'fulfilled',
    fulfillments: [
      {
        status: 'success',
        shipment_status: 'delivered',
        updated_at: '2026-06-24T15:00:00+05:30',
      },
      {
        status: 'success',
        shipment_status: 'in_transit',
        updated_at: '2026-06-25T15:00:00+05:30',
      },
    ],
  };

  assert.equal(getDeliveryStatus(order), 'in_transit');
});

test('cancelled fulfillments are ignored', () => {
  const order = {
    fulfillment_status: 'fulfilled',
    fulfillments: [
      {
        status: 'success',
        shipment_status: 'out_for_delivery',
        updated_at: '2026-06-25T14:00:00+05:30',
      },
      {
        status: 'cancelled',
        shipment_status: 'delivered',
        updated_at: '2026-06-25T15:00:00+05:30',
      },
    ],
  };

  assert.equal(getDeliveryStatus(order), 'out_for_delivery');
});
