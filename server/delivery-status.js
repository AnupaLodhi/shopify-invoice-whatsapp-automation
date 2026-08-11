function hasTrackingInfo(fulfillment) {
  if (!fulfillment) return false;

  return Boolean(
    fulfillment.tracking_number ||
    fulfillment.tracking_url ||
    (Array.isArray(fulfillment.tracking_numbers) && fulfillment.tracking_numbers.some(Boolean)) ||
    (Array.isArray(fulfillment.tracking_urls) && fulfillment.tracking_urls.some(Boolean))
  );
}

function fulfillmentTimestamp(fulfillment) {
  const timestamp = Date.parse(fulfillment?.updated_at || fulfillment?.created_at || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getLatestActiveFulfillment(order) {
  const fulfillments = Array.isArray(order?.fulfillments) ? order.fulfillments : [];

  return fulfillments
    .map((fulfillment, index) => ({
      fulfillment,
      index,
      timestamp: fulfillmentTimestamp(fulfillment),
    }))
    .filter(({ fulfillment }) =>
      fulfillment &&
      fulfillment.status !== 'cancelled' &&
      fulfillment.status !== 'canceled'
    )
    .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)
    .at(-1)?.fulfillment || null;
}

function getDeliveryStatus(order) {
  const latestFulfillment = getLatestActiveFulfillment(order);
  if (!latestFulfillment) return '';

  if (latestFulfillment.shipment_status) {
    return String(latestFulfillment.shipment_status).toLowerCase();
  }

  if (hasTrackingInfo(latestFulfillment)) {
    return 'tracking_added';
  }

  return '';
}

module.exports = {
  getDeliveryStatus,
  getLatestActiveFulfillment,
  hasTrackingInfo,
};
